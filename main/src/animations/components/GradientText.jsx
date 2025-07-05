import React, { useRef, useEffect } from "react";
import gsap from "gsap";

const GradientText = ({
  children,
  tag = "div",
  className = "",
  colors = ["#5724ff", "#a065ff", "#edff66", "#5724ff"],
  duration = 8,
}) => {
  const textRef = useRef(null);
  
  useEffect(() => {
    const text = textRef.current;
    if (!text) return;
    
    // Create gradient string
    const gradient = `linear-gradient(to right, ${colors.join(", ")})`;
    
    // Set initial styles
    gsap.set(text, {
      backgroundImage: gradient,
      backgroundSize: "300% 100%",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    });
    
    // Animate gradient position
    gsap.to(text, {
      backgroundPosition: "100% 0%",
      duration: duration,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    
    return () => {
      gsap.killTweensOf(text);
    };
  }, [colors, duration]);
  
  const Tag = tag;
  
  return (
    <Tag ref={textRef} className={`gradient-text ${className}`}>
      {children}
    </Tag>
  );
};

export default GradientText;
