import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const RoundedCorners = ({
  children,
  startRadius = "0px",
  endRadius = "50px 50px 0 0",
  className = "",
}) => {
  const containerRef = useRef(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Set initial border radius
    gsap.set(container, {
      borderRadius: startRadius,
    });
    
    // Create animation
    gsap.to(container, {
      borderRadius: endRadius,
      scrollTrigger: {
        trigger: container,
        start: "top bottom",
        end: "top center",
        scrub: true,
      },
    });
    
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.vars.trigger === container) {
          trigger.kill();
        }
      });
    };
  }, [startRadius, endRadius]);
  
  return (
    <div ref={containerRef} className={`${className}`}>
      {children}
    </div>
  );
};

export default RoundedCorners;
