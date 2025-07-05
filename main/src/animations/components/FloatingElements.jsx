import React, { useRef, useEffect } from "react";
import gsap from "gsap";

const FloatingElements = ({
  children,
  count = 10,
  minSize = 10,
  maxSize = 50,
  colors = ["#5724ff", "#a065ff", "#edff66"],
  shapes = ["circle", "square", "triangle"],
  className = "",
}) => {
  const containerRef = useRef(null);
  const elementsRef = useRef([]);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Clear any existing elements
    elementsRef.current.forEach((el) => el.remove());
    elementsRef.current = [];
    
    // Create floating elements
    for (let i = 0; i < count; i++) {
      const element = document.createElement("div");
      const size = minSize + Math.random() * (maxSize - minSize);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      
      // Set element styles
      element.style.position = "absolute";
      element.style.width = `${size}px`;
      element.style.height = `${size}px`;
      element.style.backgroundColor = color;
      element.style.opacity = "0.5";
      element.style.zIndex = "1";
      
      // Set shape
      if (shape === "circle") {
        element.style.borderRadius = "50%";
      } else if (shape === "triangle") {
        element.style.width = "0";
        element.style.height = "0";
        element.style.backgroundColor = "transparent";
        element.style.borderLeft = `${size / 2}px solid transparent`;
        element.style.borderRight = `${size / 2}px solid transparent`;
        element.style.borderBottom = `${size}px solid ${color}`;
      }
      
      // Random initial position
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      element.style.left = `${x}%`;
      element.style.top = `${y}%`;
      
      // Add to container
      container.appendChild(element);
      elementsRef.current.push(element);
      
      // Animate
      gsap.to(element, {
        x: -50 + Math.random() * 100,
        y: -50 + Math.random() * 100,
        rotation: Math.random() * 360,
        duration: 5 + Math.random() * 10,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: Math.random() * 5,
      });
    }
    
    return () => {
      // Clean up animations
      elementsRef.current.forEach((el) => {
        gsap.killTweensOf(el);
        el.remove();
      });
    };
  }, [count, minSize, maxSize, colors, shapes]);
  
  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {children}
    </div>
  );
};

export default FloatingElements;
