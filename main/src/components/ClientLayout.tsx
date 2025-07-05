"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Loading from "./Loading";
import gsap from "gsap";

// Helper function to preload images (can be moved to a utils file)
const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = img.onabort = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

export default function ClientLayout({
  children
}: {
  children: React.ReactNode
}) {
  const [showLoader, setShowLoader] = useState(true); // Renamed for clarity: controls loader's presence
  const [isMainContentReady, setIsMainContentReady] = useState(false); // Is the essential content (e.g., preloaded assets) ready?

  // Define global critical images for the layout or initial view
  const criticalLayoutImageSources: string[] = [
    // "/img/global-logo.png",
    // "/img/default-hero-bg.jpg",
    // Add paths to images critical for the general layout or very first paint
    // If empty, isMainContentReady will become true quickly.
  ];

  // Preload critical layout assets
  useEffect(() => {
    let mounted = true;
    console.log("CLIENT_LAYOUT_DEBUG: Starting preloading of critical layout assets...");

    const loadCriticalAssets = async () => {
      if (criticalLayoutImageSources.length === 0) {
        console.log("CLIENT_LAYOUT_DEBUG: No critical layout images. Marking main content ready.");
        if (mounted) setIsMainContentReady(true);
        return;
      }
      try {
        await Promise.all(criticalLayoutImageSources.map(src => preloadImage(src)));
        console.log("CLIENT_LAYOUT_DEBUG: All critical layout images preloaded.");
        if (mounted) {
          setIsMainContentReady(true);
        }
      } catch (error) {
        console.error("CLIENT_LAYOUT_DEBUG: Error preloading layout assets:", error);
        if (mounted) {
          setIsMainContentReady(true); // Proceed even on error
        }
      }
    };

    loadCriticalAssets();

    return () => {
      mounted = false;
    };
  }, []);


  // Prevent scrolling when loading
  useEffect(() => {
    if (showLoader) { // Use showLoader state
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
    }
    // Cleanup function will run when `showLoader` changes from true to false, or on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
    };
  }, [showLoader]); // Depend on showLoader

  // This function is called by Loading.tsx AFTER it has completed its own fade-out animation
  const handleLoaderFadeOutComplete = useCallback(() => {
    console.log("CLIENT_LAYOUT_DEBUG: Loading.tsx has finished its fade-out. Hiding loader component.");
    // Delay slightly to ensure browser processes loader's display:none before React unmounts it.
    // This helps prevent the "flash of loader's initial state".
    setTimeout(() => {
        setShowLoader(false);
    }, 50); // 50ms delay, adjust if needed (0, 16, etc.)
  }, []);


  console.log("CLIENT_LAYOUT_DEBUG: Rendering. showLoader:", showLoader, "isMainContentReady:", isMainContentReady);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#10061E]"> {/* Added default dark bg to div */}
      {showLoader && (
        <Loading
          onComplete={handleLoaderFadeOutComplete}
          heroRef={{ current: null }}
          heroContainerRef={{ current: null }}
        />
      )}
      {/*
        Conditionally render children only when loader is hidden?
        Or render them always but they are covered by loader?
        For simplicity and to ensure children's effects/renders don't start too early,
        let's render them only when showLoader is false.
      */}
      {!showLoader && (
        <>
          <Navbar />
          <main className="relative overflow-x-hidden">
            {children}
          </main>
          <Footer />
        </>
      )}
    </div>
  );
}