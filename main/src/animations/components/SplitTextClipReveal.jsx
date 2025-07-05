import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SplitTextClipReveal = ({
  text,
  tag = "h2",
  className = "",
  lineHeight = 1.2,
  staggerDelay = 0.1,
  options = {},
}) => {
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const defaults = {
      start: "top 80%",
      end: "bottom 20%",
      scrub: false,
    };
    
    const settings = { ...defaults, ...options };
    
    // Split text into lines
    const lines = text.split("\n");
    container.innerHTML = "";
    
    // Create wrapper for each line
    lines.forEach((line) => {
      const lineWrapper = document.createElement("div");
      lineWrapper.className = "overflow-hidden relative";
      lineWrapper.style.lineHeight = lineHeight;
      
      const lineInner = document.createElement("div");
      lineInner.className = "transform translate-y-full";
      lineInner.textContent = line;
      
      lineWrapper.appendChild(lineInner);
      container.appendChild(lineWrapper);
    });
    
    // Get all line inner elements
    const lineInners = container.querySelectorAll("div > div");
    
    // Create animation
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: settings.start,
        end: settings.end,
        scrub: settings.scrub,
        toggleActions: "play none none reverse",
      },
    });
    
    tl.to(lineInners, {
      y: 0,
      duration: 1.2,
      ease: "power4.out",
      stagger: staggerDelay,
    });
    
    return () => {
      if (tl.scrollTrigger) {
        tl.scrollTrigger.kill();
      }
      tl.kill();
    };
  }, [text, lineHeight, staggerDelay, options]);
  
  const Tag = tag;
  
  return (
    <Tag ref={containerRef} className={`split-text-clip-reveal ${className}`}>
      {text.split("\n").map((line, index) => (
        <div key={index} className="overflow-hidden relative">
          <div className="transform translate-y-full">{line}</div>
        </div>
      ))}
    </Tag>
  );
};

export default SplitTextClipReveal;