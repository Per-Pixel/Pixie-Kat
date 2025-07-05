import React, { useRef, useEffect } from "react";
import gsap from "gsap";

const MagneticButton = ({
  children,
  className = "",
  strength = 0.5,
  ease = 0.2,
  onClick,
}) => {
  const buttonRef = useRef(null);
  
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    
    let bounds;
    let mouseX = 0;
    let mouseY = 0;
    let buttonX = 0;
    let buttonY = 0;
    let animationId;
    
    const handleMouseMove = (e) => {
      bounds = button.getBoundingClientRect();
      
      // Calculate mouse position relative to button center
      mouseX = e.clientX - bounds.left - bounds.width / 2;
      mouseY = e.clientY - bounds.top - bounds.height / 2;
    };
    
    const handleMouseEnter = () => {
      animationId = requestAnimationFrame(animate);
    };
    
    const handleMouseLeave = () => {
      cancelAnimationFrame(animationId);
      gsap.to(button, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: "elastic.out(1, 0.3)",
      });
    };
    
    const animate = () => {
      // Calculate new position with easing
      buttonX += (mouseX * strength - buttonX) * ease;
      buttonY += (mouseY * strength - buttonY) * ease;
      
      // Apply transform
      gsap.set(button, { x: buttonX, y: buttonY });
      
      animationId = requestAnimationFrame(animate);
    };
    
    button.addEventListener("mousemove", handleMouseMove);
    button.addEventListener("mouseenter", handleMouseEnter);
    button.addEventListener("mouseleave", handleMouseLeave);
    
    return () => {
      cancelAnimationFrame(animationId);
      button.removeEventListener("mousemove", handleMouseMove);
      button.removeEventListener("mouseenter", handleMouseEnter);
      button.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [strength, ease]);
  
  return (
    <button
      ref={buttonRef}
      className={`magnetic-button ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default MagneticButton;
