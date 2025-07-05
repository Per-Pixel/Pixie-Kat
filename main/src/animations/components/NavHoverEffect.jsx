import React, { useRef, useEffect } from "react";
import gsap from "gsap";

const NavHoverEffect = ({ 
  children, 
  className = "", 
  hoverColor = "#5724ff", 
  onClick 
}) => {
  const linkRef = useRef(null);
  
  useEffect(() => {
    const link = linkRef.current;
    if (!link) return;
    
    const handleMouseEnter = () => {
      gsap.to(link.querySelector(".nav-hover-line"), {
        width: "80%",
        duration: 0.3,
        ease: "power2.out",
      });
    };
    
    const handleMouseLeave = () => {
      gsap.to(link.querySelector(".nav-hover-line"), {
        width: 0,
        duration: 0.3,
        ease: "power2.out",
      });
    };
    
    link.addEventListener("mouseenter", handleMouseEnter);
    link.addEventListener("mouseleave", handleMouseLeave);
    
    return () => {
      link.removeEventListener("mouseenter", handleMouseEnter);
      link.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);
  
  return (
    <a 
      ref={linkRef}
      className={`nav-hover-btn relative cursor-pointer px-3 py-2 ${className}`}
      onClick={onClick}
    >
      {children}
      <div 
        className="nav-hover-line absolute bottom-0 left-1/2 h-0.5 w-0 -translate-x-1/2 transform transition-all duration-300"
        style={{ backgroundColor: hoverColor }}
      />
    </a>
  );
};

export default NavHoverEffect;

