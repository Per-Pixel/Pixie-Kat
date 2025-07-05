import React, { useRef, useEffect } from "react";
import gsap from "gsap";

const MouseTrailer = ({
  children,
  size = 40,
  color = "rgba(87, 36, 255, 0.2)",
  blur = 0,
  delay = 0.1,
  className = "",
}) => {
  const containerRef = useRef(null);
  const trailerRef = useRef(null);
  
  useEffect(() => {
    const container = containerRef.current;
    const trailer = trailerRef.current;
    
    if (!container || !trailer) return;
    
    let mouseX = 0;
    let mouseY = 0;
    let trailerX = 0;
    let trailerY = 0;
    let animationId;
    
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      mouseX = clientX;
      mouseY = clientY;
    };
    
    const animate = () => {
      // Calculate new position with easing
      trailerX += (mouseX - trailerX) * delay;
      trailerY += (mouseY - trailerY) * delay;
      
      // Apply transform
      gsap.set(trailer, {
        x: trailerX - size / 2,
        y: trailerY - size / 2,
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    // Start animation
    window.addEventListener("mousemove", handleMouseMove);
    animationId = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [size, delay]);
  
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        ref={trailerRef}
        className="pointer-events-none fixed left-0 top-0 z-50 rounded-full"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
          filter: blur > 0 ? `blur(${blur}px)` : "none",
        }}
      />
      {children}
    </div>
  );
};

export default MouseTrailer;
