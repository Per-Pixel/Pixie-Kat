import React, { useRef, useState } from "react";
import gsap from "gsap";

const HoverTextButton = ({ 
  title, 
  leftIcon, 
  containerClass = "", 
  onClick 
}) => {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [hoverOpacity, setHoverOpacity] = useState(0);
  const buttonRef = useRef(null);

  const handleMouseMove = (event) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();

    setCursorPosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const handleMouseEnter = () => setHoverOpacity(1);
  const handleMouseLeave = () => setHoverOpacity(0);

  return (
    <button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative flex cursor-pointer items-center gap-2 overflow-hidden rounded-full bg-black px-5 py-2 text-xs uppercase text-white/80 ${containerClass}`}
    >
      {/* Radial gradient hover effect */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        style={{
          opacity: hoverOpacity,
          background: `radial-gradient(100px circle at ${cursorPosition.x}px ${cursorPosition.y}px, rgba(255, 255, 255, 0.3), transparent)`,
        }}
      />
      {leftIcon && <span className="relative z-20">{leftIcon}</span>}
      <p className="relative z-20">{title}</p>
    </button>
  );
};

export default HoverTextButton;
