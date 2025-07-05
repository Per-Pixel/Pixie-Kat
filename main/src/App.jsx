// App.jsx
import React, { useRef, useState, useCallback, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Loading from "./components/Loading";
import NavBar from "./components/Navbar";
import Hero from "./components/Homepage/Hero";
import SingleProduct from "./components/Homepage/SingleProduct";
import About from "./components/Homepage/About";
import Features from "./components/Homepage/Features";
import Story from "./components/Homepage/Story";
import Contact from "./components/Homepage/Contact";
import Footer from "./components/Homepage/Footer";
import BottomNav from "./components/BottomNav";

// Import new pages
import Games from "./pages/Games";
import Pricing from "./pages/Pricing";
import FAQ from "./pages/FAQ";
import Support from "./pages/Support";
import HowItWorks from "./pages/HowItWorks";
import Auth from "./pages/Auth";

const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = img.onabort = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

function App() {
  // This state will control whether the Loading component is in the DOM
  const [isLoading, setIsLoading] = useState(true);
  // This ref will point to the main content wrapper that Loading.tsx animates
  const mainContentRef = useRef(null); // Renamed for clarity, was heroContainerRef

  const criticalImageSources = [
    // Add paths to your most important initial images here.
    // If empty, preloading finishes quickly.
  ];

  // This effect handles preloading and can be kept if desired.
  // Loading.tsx's onComplete will be the primary trigger for setIsLoading(false).
  useEffect(() => {
    let mounted = true;
    console.log("APP_DEBUG: Starting preloading of critical assets...");

    const loadCriticalAssets = async () => {
      if (criticalImageSources.length === 0) {
        console.log("APP_DEBUG: No critical images defined for preloading.");
        // We don't set any loading state here directly based on image preloading anymore,
        // as Loading.tsx controls its own lifecycle and calls onComplete.
        // This preloading just ensures assets are fetched.
        return;
      }
      try {
        await Promise.all(criticalImageSources.map(src => preloadImage(src)));
        console.log("APP_DEBUG: All critical images preloaded successfully.");
      } catch (error) {
        console.error("APP_DEBUG: Error preloading one or more critical assets:", error);
      }
    };

    loadCriticalAssets(); // Start preloading

    return () => {
      mounted = false;
    };
  }, []);

  // This is called by Loading.tsx when its animations are done AND heroContainerRef is made visible
  const handleLoadingComplete = useCallback(() => {
    console.log("APP_DEBUG: (App.jsx) Loading.tsx onComplete called. Hiding loader.");
    // A small delay can sometimes help prevent visual glitches during unmount/mount.
    // If the "flash of loader's initial state" is an issue, this is where to experiment.
    setTimeout(() => {
        setIsLoading(false);
    }, 0); // Start with 0ms, can adjust if a flash is seen
  }, []);

  console.log("APP_DEBUG: (App.jsx) Rendering. isLoading:", isLoading);

  // Homepage component
  const HomePage = () => (
    <>
      <Hero />
      <SingleProduct />
      <About />
      <Features />
      <Story />
      <Contact />
    </>
  );

  return (
    <AuthProvider>
      <Router>
        <>
          {isLoading && (
            <Loading
              onComplete={handleLoadingComplete}
              heroContainerRef={mainContentRef}
              heroRef={mainContentRef}
            />
          )}

          {/* The main content is always in the DOM, Loading.tsx controls its opacity */}
          <main
            className="relative min-h-screen w-screen overflow-x-hidden bg-dark-900"
            ref={mainContentRef}
            style={{ opacity: isLoading ? 0 : 1 }}
          >
            <NavBar />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/games" element={<Games />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/support" element={<Support />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/register" element={<Auth />} />
            </Routes>
            <Footer />
            <BottomNav />
          </main>
        </>
      </Router>
    </AuthProvider>
  );
}
export default App;