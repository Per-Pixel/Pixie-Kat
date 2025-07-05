import { useEffect } from "react";
import gsap from "gsap";

export const useMagneticEffect = (elementRef, options = {}) => {
  useEffect(() => {
    const defaults = {
      strength: 0.5,
      ease: 0.2,
    };
    
    const settings = { ...defaults, ...options };
    const element = elementRef.current;
    
    if (!element) return;
    
    let bounds;
    let mouseX = 0;
    let mouseY = 0;
    let elementX = 0;
    let elementY = 0;
    let animationId;
    
    const handleMouseMove = (e) => {
      bounds = element.getBoundingClientRect();
      
      // Calculate mouse position relative to element center
      mouseX = e.clientX - bounds.left - bounds.width / 2;
      mouseY = e.clientY - bounds.top - bounds.height / 2;
    };
    
    const handleMouseEnter = () => {
      animationId = requestAnimationFrame(animate);
    };
    
    const handleMouseLeave = () => {
      cancelAnimationFrame(animationId);
      gsap.to(element, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: "elastic.out(1, 0.3)",
      });
    };
    
    const animate = () => {
      // Calculate new position with easing
      elementX += (mouseX * settings.strength - elementX) * settings.ease;
      elementY += (mouseY * settings.strength - elementY) * settings.ease;
      
      // Apply transform
      gsap.set(element, { x: elementX, y: elementY });
      
      animationId = requestAnimationFrame(animate);
    };
    
    element.addEventListener("mousemove", handleMouseMove);
    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);
    
    return () => {
      cancelAnimationFrame(animationId);
      element.removeEventListener("mousemove", handleMouseMove);
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [elementRef, options]);
};
