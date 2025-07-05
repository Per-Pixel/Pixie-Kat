import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from "gsap";

/**
 * A reusable square button for mobile views with smooth animations and feedback.
 */
const MobileSquareButton = (props) => {
  const [isPressed, setIsPressed] = useState(false);
  const buttonRef = useRef(null);

  const handlePressStart = () => setIsPressed(true);
  const handlePressEnd = () => setIsPressed(false);

  useEffect(() => {
    if (isPressed) {
      gsap.to(buttonRef.current, {
        scale: 1.25,
        duration: 0.3,
        ease: "power2.out",
        onComplete: handlePressEnd,
      });
    }
  }, [isPressed]);

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      className={`h-10 w-10 bg-white rounded-md shadow-md flex items-center justify-center transition-transform active:scale-95 ${props.className}`}
      onClick={props.onClick}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      aria-label={props.ariaLabel}
      title={props.title}
      initial={{ scale: 1 }}
      animate={{ scale: isPressed ? 0.95 : 1 }}
      whileHover={{ scale: 1.12 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
    >
      {props.children}
    </motion.button>
  );
};

export default MobileSquareButton;
