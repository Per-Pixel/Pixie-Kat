import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const ScrollProgressBar = ({ 
  color = "#5724ff", 
  height = "4px", 
  zIndex = 1000 
}) => {
  const progressRef = useRef(null);
  
  useEffect(() => {
    const progressBar = progressRef.current;
    if (!progressBar) return;
    
    gsap.set(progressBar, {
      width: "0%",
    });
    
    gsap.to(progressBar, {
      width: "100%",
      ease: "none",
      scrollTrigger: {
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3,
      },
    });
    
    return () => {
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.vars.trigger === document.documentElement) {
          trigger.kill();
        }
      });
    };
  }, []);
  
  return (
    <div 
      ref={progressRef}
      className="scroll-progress-bar fixed top-0 left-0"
      style={{ 
        backgroundColor: color, 
        height: height, 
        zIndex: zIndex,
        width: "0%"
      }}
    />
  );
};

export default ScrollProgressBar;

