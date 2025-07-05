import { useEffect, useState } from "react";
import gsap from "gsap";

export const useMouseTrailer = (elementRef, options = {}) => {
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    const defaults = {
      speed: 0.3,
      ease: "power2.out",
      scale: 1,
      opacity: 1,
      blur: 0,
    };
    
    const settings = { ...defaults, ...options };
    const element = elementRef.current;
    
    if (!element) return;
    
    let mouseX = 0;
    let mouseY = 0;
    let elementX = 0;
    let elementY = 0;
    
    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      setIsActive(true);
    };
    
    const handleMouseLeave = () => {
      setIsActive(false);
    };
    
    const animate = () => {
      if (isActive) {
        // Calculate the distance between current position and target
        const distX = mouseX - elementX;
        const distY = mouseY - elementY;
        
        // Update position with easing
        elementX += distX * settings.speed;
        elementY += distY * settings.speed;
        
        // Apply transform
        gsap.set(element, {
          x: elementX,
          y: elementY,
          xPercent: -50,
          yPercent: -50,
          scale: settings.scale,
          opacity: settings.opacity,
          filter: `blur(${settings.blur}px)`,
        });
      }
      
      requestAnimationFrame(animate);
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    
    const animationFrame = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrame);
    };
  }, [elementRef, options, isActive]);
  
  return { isActive };
};