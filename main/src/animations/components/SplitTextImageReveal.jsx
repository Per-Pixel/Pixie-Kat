import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SplitTextImageReveal = ({
  text,
  backgroundImage,
  backgroundColor = "#5724ff",
  tag = "h2",
  className = "",
  lineHeight = 1.2,
  staggerDelay = 0.1,
  options = {},
}) => {
  const containerRef = useRef(null);
  const imageContainerRef = useRef(null);
  
  useEffect(() => {
    if (!containerRef.current || !imageContainerRef.current) return;
    
    const container = containerRef.current;
    const imageContainer = imageContainerRef.current;
    
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
    
    // Create animation for text
    const textTl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: settings.start,
        end: settings.end,
        scrub: settings.scrub,
        toggleActions: "play none none reverse",
      },
    });
    
    textTl.to(lineInners, {
      y: 0,
      duration: 1.2,
      ease: "power4.out",
      stagger: staggerDelay,
    });
    
    // Create animation for image clip
    const clipTl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: settings.start,
        end: "+=600",
        scrub: true,
      },
    });
    
    clipTl.fromTo(
      imageContainer,
      {
        clipPath: "inset(40% 40% 40% 40% round 20px)",
      },
      {
        clipPath: "inset(0% 0% 0% 0% round 0px)",
        duration: 1.5,
        ease: "power3.inOut",
      }
    );
    
    return () => {
      if (textTl.scrollTrigger) {
        textTl.scrollTrigger.kill();
      }
      if (clipTl.scrollTrigger) {
        clipTl.scrollTrigger.kill();
      }
      textTl.kill();
      clipTl.kill();
    };
  }, [text, lineHeight, staggerDelay, options]);
  
  const Tag = tag;
  
  return (
    <div className="relative">
      {/* Background image or color that will be revealed */}
      <div 
        ref={imageContainerRef}
        className="absolute inset-0 -z-10"
        style={{ 
          clipPath: "inset(40% 40% 40% 40% round 20px)",
          background: backgroundImage ? `url(${backgroundImage}) center/cover no-repeat` : backgroundColor
        }}
      />
      
      {/* Text that will be revealed */}
      <Tag ref={containerRef} className={`split-text-clip-reveal relative z-10 ${className}`}>
        {text.split("\n").map((line, index) => (
          <div key={index} className="overflow-hidden relative">
            <div className="transform translate-y-full">{line}</div>
          </div>
        ))}
      </Tag>
    </div>
  );
};

export default SplitTextImageReveal;