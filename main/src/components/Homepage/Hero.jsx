import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/all";
import { TiLocationArrow } from "react-icons/ti";
import { useRef, useState, useEffect } from "react";
import Button from "../Button";
import { BentoTilt, BentoCard } from "./Features";
import SlideTextButton from "../../animations/components/SlideTextButton";
import FlipCard from "../FlipCard";
import { useParallaxScroll } from "../../animations/hooks/useParallaxScroll";
import MobileSquareButton from "../MobileSquareButton";
import Loading from "../Loading"; // Correct: Relative path

gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
  const [loading, setLoading] = useState(true);
  const [loadedVideos, setLoadedVideos] = useState(0);
  const videoBoxRef = useRef(null);
  const jinxRef = useRef(null);
  const fazeLogoRef = useRef(null);
  const lunoxRef = useRef(null);
  const parallaxContainerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showPopularGames, setShowPopularGames] = useState(false);
  const [showContactUs, setShowContactUs] = useState(false);
  const heroRef = useRef(null);
  const heroContainerRef = useRef(null);

  // Effect to detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768); // Considering devices under 768px as mobile
    };

    // Check initially
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Toggle popular games card
  const togglePopularGames = () => {
    setShowPopularGames(prev => !prev);
    setShowContactUs(false); // Close the other card if open
  };

  // Toggle contact us card
  const toggleContactUs = () => {
    setShowContactUs(prev => !prev);
    setShowPopularGames(false); // Close the other card if open
  };

  // Apply parallax scroll effect to the container
  useParallaxScroll(parallaxContainerRef, { 
    speed: 0.3, 
    direction: "vertical" 
  });

  const handleVideoLoad = () => {
    setLoadedVideos((prev) => prev + 1);
    setLoading(false); // Set loading to false once the video loads
  };

  // Add a timeout to ensure loading state is removed even if videos fail to load
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000); // 5 seconds timeout
    
    return () => clearTimeout(timer);
  }, []);

  useGSAP(() => {
    // Set initial clip path and border
    gsap.set("#video-frame", {
      clipPath: "polygon(14% 0, 72% 0, 88% 90%, 0 95%)",
      borderRadius: "0% 0% 40% 10%",
      boxShadow: "0 0 0 0px rgba(0, 0, 0, 0)",
    });
    
    // Create animation with stroke effect
    gsap.from("#video-frame", {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      borderRadius: "0% 0% 0% 0%",
      boxShadow: "0 0 0 10px rgba(0, 0, 0, 0.8)",
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: "#video-frame",
        start: "center center",
        end: "bottom center",
        scrub: true,
      },
    });
  });

  // Handle mouse movement for 3D hover effect
  const handleMouseMove = (e) => {
    if (!videoBoxRef.current) return;
    
    const box = videoBoxRef.current;
    const rect = box.getBoundingClientRect();
    
    // Calculate mouse position relative to the box
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate rotation based on mouse position
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
    // Apply the transform
    gsap.to(box, {
      rotationX: rotateX,
      rotationY: rotateY,
      transformPerspective: 1000,
      duration: 0.5,
      ease: "power2.out",
    });
  };

  const handleMouseEnter = () => {
    gsap.to(videoBoxRef.current, {
      scale: 1.05,
      boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
      duration: 0.5,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = () => {
    gsap.to(videoBoxRef.current, {
      rotationX: 0,
      rotationY: 0,
      scale: 1,
      boxShadow: "0 5px 15px rgba(0, 0, 0, 0.1)",
      duration: 0.5,
      ease: "power2.out",
    });
  };

  // Initialize GSAP animations in useEffect
  useEffect(() => {
    // Make sure GSAP is available
    if (!gsap || !videoBoxRef.current) return;
    
    // Initialize the 3D effect for the video box
    gsap.set(videoBoxRef.current, {
      transformStyle: "preserve-3d",
      transformPerspective: 1000,
    });
    
    // Create a new context for this animation
    const ctx = gsap.context(() => {}, videoBoxRef.current);
    
    return () => ctx.revert(); // Clean up
  }, []);

  useEffect(() => {
    if (!gsap || !jinxRef.current || !fazeLogoRef.current || !lunoxRef.current) return;

    const ctx = gsap.context(() => {
      // Jinx animation
      gsap.to(jinxRef.current, {
        x: -10,
        y: -5,
        rotation: -2,
        duration: 3,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true
      });

      // Lunox animation
      gsap.to(lunoxRef.current, {
        x: 10,
        y: -5,
        rotation: 2,
        duration: 3.2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true
      });
    });

    return () => ctx.revert();
  }, []);

  // Add back the subtle floating animation for Faze logo
  useEffect(() => {
    if (!gsap || !fazeLogoRef.current) return;
    
    const tween = gsap.to(fazeLogoRef.current, {
      y: '+=5',           // Move 5px down (more subtle than 10px)
      duration: 2.5,      // Slightly faster for subtlety
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut', // Smooth ease for up/down
    });
    
    return () => tween.kill(); // Clean up on unmount
  }, []);

  return (
    <div className="relative h-dvh w-screen overflow-x-hidden">
      {loading && (
        <Loading
          onComplete={() => setLoading(false)}
          heroRef={heroRef}
          heroContainerRef={heroContainerRef}
        />
      )}

      <div
        id="video-frame"
        className="relative z-10 h-dvh w-screen overflow-hidden rounded-lg bg-blue-75"
      >
        <div>
          <video
            src="videos/hero-1.mp4"
            autoPlay
            loop
            muted
            className="absolute left-0 top-0 size-full object-cover object-center"
            onLoadedData={handleVideoLoad}
          />
        </div>

        {/* Desktop view: bottom-left rectangular video */}
        {!isMobile && (
          <BentoTilt className="absolute bottom-16 left-8 z-50 h-48 w-80 md:h-64 md:w-96 pointer-events-auto rounded-lg overflow-hidden shadow-[0_0_15px_rgba(79,183,221,0.5)]">
            <div className="relative size-full rounded-lg overflow-hidden">
              <video
                src="videos/feature-4.mp4" 
                autoPlay
                loop
                muted
                className="absolute left-0 top-0 size-full object-cover object-center"
              />
              <div className="relative z-20 flex size-full flex-col justify-between p-5">
                <div className="absolute bottom-3 left-3 z-80">
                  <SlideTextButton
                    title="Contact Us"
                    leftIcon={<TiLocationArrow />}
                    containerClass="bg-blue-50 text-xs py-2 px-4 text-black flex-center gap-1"
                    onClick={() => console.log("Contact Us clicked")}
                  />
                </div>
              </div>
            </div>
          </BentoTilt>
        )}

        {/* Desktop view: right side card with flip animation */}
        {!isMobile && (
          <div className="absolute bottom-64 right-8 z-50 h-48 w-80 md:h-64 md:w-96 pointer-events-auto">
            <FlipCard 
              frontVideo="videos/feature-2.mp4"
              backVideo="videos/feature-3.mp4"
              title="Popular Games"
              description="Top up your favorite games instantly"
              buttonText="View All Games"
            />
          </div>
        )}

        {/* Mobile view: Contact Us card that appears when toggled */}
        {isMobile && showContactUs && (
          <div className="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 h-80 w-80 pointer-events-auto">
            <BentoTilt className="h-full w-full rounded-lg overflow-hidden shadow-[0_0_15px_rgba(79,183,221,0.5)]">
              <div className="relative size-full rounded-lg overflow-hidden">
                <video
                  src="videos/feature-4.mp4" 
                  autoPlay
                  loop
                  muted
                  className="absolute left-0 top-0 size-full object-cover object-center"
                />
                <div className="relative z-20 flex size-full flex-col justify-between p-5">
                  <button 
                    className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1 z-90"
                    onClick={toggleContactUs}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="absolute bottom-5 left-5 z-80 text-center w-[90%]">
                    <h2 className="text-white text-xl mb-3 font-bold">Contact Us</h2>
                    <p className="text-white text-sm mb-4">Get in touch with our support team for any assistance</p>
                    <SlideTextButton
                      title="Contact Support"
                      leftIcon={<TiLocationArrow />}
                      containerClass="bg-blue-50 text-xs py-2 px-4 text-black flex-center gap-1 mx-auto"
                      onClick={() => console.log("Contact Support clicked")}
                    />
                  </div>
                </div>
              </div>
            </BentoTilt>
          </div>
        )}

        {/* Mobile view: Popular Games card that appears when toggled */}
        {isMobile && showPopularGames && (
          <div className="absolute left-1/2 top-1/2 z-[100] -translate-x-1/2 -translate-y-1/2 h-80 w-80 pointer-events-auto">
            <FlipCard 
              frontVideo="videos/feature-2.mp4"
              backVideo="videos/feature-3.mp4"
              title="Popular Games"
              description="Top up your favorite games instantly"
              buttonText="View All Games"
              onClose={togglePopularGames}
            />
          </div>
        )}

        {/* Parallax container for all character images */}
        <div 
          ref={parallaxContainerRef}
          className="absolute inset-0 z-20 pointer-events-none"
        >
          {/* Adjusted Jinx image */}
          <div className="absolute left-[43%] top-[60%] z-30 -translate-x-1/2 -translate-y-1/2 scale-120">
            <img 
              ref={jinxRef}
              src="/img/hero/Jinx.png" 
              alt="Jinx" 
              className="h-auto w-90 md:w-120"
            />
          </div>

          {/* Faze logo image */}
          <div className="absolute left-1/2 top-[70%] z-50 -translate-x-1/2 -translate-y-1/2 scale-150">
            <img 
              ref={fazeLogoRef}
              src="/img/hero/Faze.png" 
              alt="Faze" 
              className="h-auto w-64 md:w-80"
            />
          </div>

          {/* Melissa image */}
          <div className="absolute left-[59%] top-[65%] z-20 -translate-x-1/2 -translate-y-1/2 scale-150">
            <img 
              ref={lunoxRef}
              src="/img/hero/melissa.png" 
              alt="Lunox" 
              className="h-auto w-90 md:w-130"
            />
          </div>
        </div>

        {/* Mobile contact square button next to Pixiekat title */}
        {isMobile && (
          <MobileSquareButton
            className="absolute top-24 right-5 z-[60]"
            onClick={toggleContactUs}
            ariaLabel="Toggle Contact Us Card"
          />
        )}

        <h1 className="special-font hero-heading absolute bottom-5 right-5 z-40 text-blue-75 text-shadow">
          ST<b>O</b>RE
        </h1>

        <div className="absolute left-0 top-0 z-40 size-full">
          <div className="mt-24 px-5 sm:px-10">
            <h1 className="special-font hero-heading text-blue-100">
              Pixie<b>K</b>at
            </h1>

            <p className="mb-5 max-w-64 font-robert-regular text-blue-100">
              Instant Gaming Credits <br /> Fast, Secure, Affordable
            </p>

            <Button
              id="topup-now"
              title="Topup Now"
              leftIcon={<TiLocationArrow />}
              containerClass="bg-yellow-300 flex-center gap-1"
            />
          </div>
        </div>
      </div>

      {/* Mobile games square button - moved outside the video frame for better positioning */}
      {isMobile && (
        <div className="absolute bottom-5 left-5 z-[60]">
          <MobileSquareButton
            onClick={togglePopularGames}
            ariaLabel="Toggle Popular Games Card"
          />
        </div>
      )}

      <h1 className="special-font hero-heading absolute bottom-5 right-5 text-black">
        ST<b>O</b>RE
      </h1>
    </div>
  );
};

export default Hero;
