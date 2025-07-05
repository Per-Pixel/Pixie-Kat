import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const ClipPathExpand = ({
  children,
  backgroundColor = "bg-violet-300",
  initialSize = "64",
  options = {},
}) => {
  const containerRef = useRef(null);
  const maskRef = useRef(null);
  
  useEffect(() => {
    const defaults = {
      start: "center center",
      end: "+=800 center",
      scrub: 0.5,
      pin: true,
      pinSpacing: true,
    };

    const settings = { ...defaults, ...options };
    
    if (!containerRef.current || !maskRef.current) return;
    
    const clipAnimation = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: settings.start,
        end: settings.end,
        scrub: settings.scrub,
        pin: settings.pin,
        pinSpacing: settings.pinSpacing,
      },
    });

    clipAnimation.to(maskRef.current, {
      width: "100vw",
      height: "100vh",
      borderRadius: 0,
      ease: "power2.inOut"
    });

    return () => {
      if (clipAnimation.scrollTrigger) {
        clipAnimation.scrollTrigger.kill();
      }
      clipAnimation.kill();
    };
  }, [options]);
  
  return (
    <div ref={containerRef} className="relative h-screen w-full overflow-hidden">
      <div className="flex h-full w-full items-center justify-center">
        <div
          ref={maskRef}
          className={`mask-clip-path ${backgroundColor} flex h-${initialSize} w-${initialSize} items-center justify-center rounded-3xl`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default ClipPathExpand;

