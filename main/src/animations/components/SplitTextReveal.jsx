import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitType from "split-type";

gsap.registerPlugin(ScrollTrigger);

const SplitTextReveal = ({
  children,
  tag = "div",
  className = "",
  staggerTime = 0.03,
  duration = 0.8,
  ease = "power2.out",
  startY = 100,
  delay = 0,
}) => {
  const textRef = useRef(null);
  
  useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    
    // Split text into words and characters
    const splitText = new SplitType(element, {
      types: "words,chars",
      tagName: "span",
    });
    
    // Create animation
    const chars = splitText.chars;
    
    gsap.set(chars, {
      y: startY,
      opacity: 0,
    });
    
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: element,
        start: "top 80%",
        toggleActions: "play none none reverse",
      },
    });
    
    tl.to(chars, {
      y: 0,
      opacity: 1,
      duration: duration,
      stagger: staggerTime,
      ease: ease,
      delay: delay,
    });
    
    return () => {
      // Clean up
      if (splitText) splitText.revert();
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
    };
  }, [children, staggerTime, duration, ease, startY, delay]);
  
  const Tag = tag;
  
  return (
    <Tag ref={textRef} className={`split-text-container ${className}`}>
      {children}
    </Tag>
  );
};

export default SplitTextReveal;
