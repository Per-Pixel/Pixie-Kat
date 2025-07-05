import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const HeroScrollEffect = ({
  children,
  videoSrc,
  imageSrc,
  className = "",
  contentClassName = "",
  overlayColor = "rgba(0, 0, 0, 0.5)",
  scrollSpeed = 0.5,
  clipPath = "polygon(14% 0, 72% 0, 88% 90%, 0 95%)",
  endClipPath = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
  startRadius = "0% 0% 40% 10%",
  endRadius = "0% 0% 0% 0%",
  options = {}
}) => {
  const containerRef = useRef(null);
  const videoFrameRef = useRef(null);
  
  useEffect(() => {
    if (!containerRef.current || !videoFrameRef.current) return;
    
    const defaults = {
      start: "top top",
      end: "bottom center",
      scrub: true,
    };
    
    const settings = { ...defaults, ...options };
    
    // Set initial clip path
    gsap.set(videoFrameRef.current, {
      clipPath: clipPath,
      borderRadius: startRadius,
    });
    
    // Create animation
    gsap.from(videoFrameRef.current, {
      clipPath: endClipPath,
      borderRadius: endRadius,
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: containerRef.current,
        start: settings.start,
        end: settings.end,
        scrub: settings.scrub,
      },
    });
    
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.vars.trigger === containerRef.current) {
          trigger.kill();
        }
      });
    };
  }, [clipPath, endClipPath, startRadius, endRadius, options]);
  
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        ref={videoFrameRef}
        id="video-frame"
        className="relative z-10 h-dvh w-screen overflow-hidden rounded-lg bg-blue-75"
      >
        {videoSrc && (
          <video
            src={videoSrc}
            autoPlay
            loop
            muted
            className="absolute left-0 top-0 size-full object-cover object-center"
          />
        )}
        {imageSrc && (
          <img
            src={imageSrc}
            alt="Hero background"
            className="absolute left-0 top-0 size-full object-cover object-center"
          />
        )}
        
        {/* Overlay */}
        <div 
          className="absolute inset-0 z-10"
          style={{ backgroundColor: overlayColor }}
        />
        
        {/* Content */}
        <div className={`relative z-20 ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default HeroScrollEffect;


