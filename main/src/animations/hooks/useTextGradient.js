import { useEffect } from "react";
import gsap from "gsap";

export const useTextGradient = (elementRef, options = {}) => {
  useEffect(() => {
    const defaults = {
      colors: ["#5724ff", "#a065ff", "#edff66", "#5724ff"],
      duration: 8,
    };
    
    const settings = { ...defaults, ...options };
    const element = elementRef.current;
    
    if (!element) return;
    
    // Create gradient string
    const gradient = `linear-gradient(to right, ${settings.colors.join(", ")})`;
    
    // Set initial styles
    gsap.set(element, {
      backgroundImage: gradient,
      backgroundSize: "300% 100%",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    });
    
    // Animate gradient position
    gsap.to(element, {
      backgroundPosition: "100% 0%",
      duration: settings.duration,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    
    return () => {
      gsap.killTweensOf(element);
    };
  }, [elementRef, options]);
};
