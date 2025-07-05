import React, { useRef, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SlideTextButton from "../../animations/components/SlideTextButton";
import AnimatedTitle from "../../components/AnimatedTitle";
import { TiLocationArrow } from "react-icons/ti";
import { useImageReveal } from "../../animations/hooks/useImageReveal";

gsap.registerPlugin(ScrollTrigger);

const SingleProduct = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const overlayRef = useRef(null);
  const shapeRef = useRef(null);
  const buttonRef = useRef(null);
  const titleRef = useRef(null);
  
  // Use image reveal animation
  useImageReveal(imageRef, overlayRef, {
    duration: 1.5,
  });
  
  // Handle image loading
  useEffect(() => {
    if (imageRef.current) {
      const img = imageRef.current;
      if (img.complete) {
        setIsLoaded(true);
      } else {
        img.onload = () => setIsLoaded(true);
      }
    }
    
    // Ensure ScrollTrigger is refreshed
    ScrollTrigger.refresh();
    
    return () => {
      // Clean up any animations when component unmounts
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);
  
  // Animate gradient text
  useEffect(() => {
    if (!titleRef.current) return;
    
    gsap.to(titleRef.current, {
      backgroundPosition: "200% center",
      duration: 8,
      repeat: -1,
      ease: "linear"
    });
  }, []);
  
  useGSAP(() => {
    if (!isLoaded) return;
    
    // Animate text elements
    gsap.from(".product-text > *", {
      y: 50,
      opacity: 0,
      stagger: 0.2,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 70%",
      }
    });
    
    // Animate shape on scroll
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top bottom",
        end: "bottom top",
        scrub: 1,
        markers: false, // Remove markers for production
      }
    });
    
    tl.fromTo(
      shapeRef.current,
      {
        clipPath: "polygon(18% 32%, 94% 11%, 89% 74%, 3% 80%)",
        WebkitClipPath: "polygon(18% 32%, 94% 11%, 89% 74%, 3% 80%)"
      },
      {
        clipPath: "polygon(24% 35%, 94% 11%, 91% 79%, 5% 75%)",
        WebkitClipPath: "polygon(24% 35%, 94% 11%, 91% 79%, 5% 75%)",
        ease: "power1.inOut",
      }
    );
    
  }, { scope: containerRef, dependencies: [isLoaded] });

  return (
    <section 
      ref={containerRef}
      id="single-product" 
      className="relative min-h-screen w-full bg-blue-75 py-20"
    >
      {/* SVG filter for rounded corners */}
      <svg
        className="invisible absolute size-0"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="flt_tag">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="8"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="flt_tag"
            />
            <feComposite
              in="SourceGraphic"
              in2="flt_tag"
              operator="atop"
            />
          </filter>
        </defs>
      </svg>
      
      {/* Position the background shape */}
      <div className="absolute inset-0 overflow-visible">
        {/* Add wrapper div for border and shadow */}
        <div className="absolute left-1/2 top-[55%] h-[140%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-3xl border-2 border-black shadow-xl overflow-hidden z-20"
             style={{
               boxShadow: "inset 0px 0px 20px 5px rgba(0,0,0,0.3)",
               filter: "drop-shadow(0px 0px 10px rgba(0,0,0,0.2)) url(#flt_tag)"
             }}>
          {/* Clip-path container inside */}
          <div 
            ref={shapeRef}
            className="h-full w-full relative"
            style={{
              clipPath: "polygon(18% 32%, 94% 11%, 89% 74%, 3% 80%)",
              WebkitClipPath: "polygon(18% 32%, 94% 11%, 89% 74%, 3% 80%)"
            }}
          >
            <img
              src="/img/Singleproduct/Bg-Rectangle.png"
              alt="Background pattern"
              className="h-full w-full object-cover"
            />
            {/* Text inside the clip-path */}
            <div className="absolute inset-0 left-[4.6%] top-[-56%] flex items-center justify-center text-center text-white pointer-events-none px-160 py-1 sm:px-0 sm:py-0">
              <AnimatedTitle
                title="ENTER THE <b>LAND</b> OF DAWN <br /> WITH PIXIEKAT <b>GAMING</b>"
                containerClass="pointer-events-none text-lg sm:text-lg md:text-5xl lg:text-7xl xl:text-8xl"
                textColor="black"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Animated Title with mix-blend-difference */}
      <div
        className="absolute left-[52%] top-[16%] -translate-x-1/2 -translate-y-1/2 text-center z-10 pointer-events-none w-max"
      >
        <AnimatedTitle
          title="ENTER THE <b>LAND</b> OF DAWN <br /> WITH PIXIEKAT <b>GAMING</b>"
          containerClass="pointer-events-none text-lg sm:text-lg md:text-5xl lg:text-7xl xl:text-8xl"
        />
      </div>
      
      {/* Content container with higher z-index */}
      <div className="relative z-20 mx-auto flex h-full w-full max-w-6xl flex-col items-center justify-center px-5 md:flex-row md:gap-10 lg:px-10">
        {/* Left side - Image */}
        <div className="relative mb-10 w-full max-w-xl overflow-hidden rounded-xl md:mb-0 md:w-1/2">
          <div
            ref={overlayRef}
            className="absolute inset-0 z-10 bg-white"
          />
          <img
            ref={imageRef}
            src="/img/Singleproduct/VRHeadset.jpg" 
            alt="VR Headset"
            className="h-auto w-full object-cover"
            onLoad={() => setIsLoaded(true)}
          />
        </div>
        
        {/* Right side - Text content */}
        <div className="product-text w-full md:w-1/2 flex flex-col justify-center mt-[30%]">
          
          <p className="mb-10 max-w-md text-white">
            A well-designed gaming header often incorporates elements
            such as game characters, iconic symbols, vibrant colors, and
            dynamic visuals to convey excitement, adventure, and the
            immersive nature of gaming.
          </p>
          
          {/* Button with ref and inline styles to ensure visibility */}
          <div ref={buttonRef} className="relative z-50">
            <SlideTextButton
              title="BUY NOW"
              leftIcon={<TiLocationArrow />}
              containerClass="bg-transparent border-2 border-purple-400 text-purple-400 py-3 px-8 hover:bg-purple-400 hover:text-white transition-all duration-300"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SingleProduct;
