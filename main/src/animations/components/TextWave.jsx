import React, { useRef, useEffect } from "react";
import gsap from "gsap";

const TextWave = ({
  text,
  tag = "div",
  className = "",
  amplitude = 10,
  frequency = 0.1,
  speed = 1,
}) => {
  const containerRef = useRef(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Split text into individual characters
    const chars = container.querySelectorAll('span');
    
    // Create wave animation
    chars.forEach((char, index) => {
      gsap.to(char, {
        y: `${amplitude * Math.sin(index * frequency)}px`,
        duration: 1 + Math.random() * 0.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: index * 0.05 * speed,
      });
    });
    
    return () => {
      chars.forEach(char => {
        gsap.killTweensOf(char);
      });
    };
  }, [amplitude, frequency, speed]);
  
  // Split text into spans
  const renderText = () => {
    return text.split('').map((char, index) => (
      <span key={index} className="inline-block">
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };
  
  const Tag = tag;
  
  return (
    <Tag ref={containerRef} className={`text-wave ${className}`}>
      {renderText()}
    </Tag>
  );
};

export default TextWave;

