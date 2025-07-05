import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

export const useSplitText = (containerRef, options = {}) => {
  const splitTextRef = useRef(null);
  
  useEffect(() => {
    const defaults = {
      type: "chars,words",
      animation: "from",
      staggerTime: 0.05,
      duration: 0.8,
      y: 100,
      opacity: 0,
      ease: "power4.out",
      trigger: containerRef.current,
      start: "top 80%",
    };
    
    const settings = { ...defaults, ...options };
    
    if (!containerRef.current) return;
    
    // Create SplitText instance
    splitTextRef.current = new SplitText(containerRef.current, {
      type: settings.type,
      linesClass: "split-line",
      wordsClass: "split-word",
      charsClass: "split-char",
    });
    
    const elements = settings.type.includes("chars") 
      ? splitTextRef.current.chars 
      : splitTextRef.current.words;
    
    // Create animation
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: settings.trigger,
        start: settings.start,
        toggleActions: "play none none none",
      },
    });
    
    if (settings.animation === "from") {
      tl.from(elements, {
        y: settings.y,
        opacity: settings.opacity,
        duration: settings.duration,
        ease: settings.ease,
        stagger: settings.staggerTime,
      });
    } else {
      tl.to(elements, {
        y: settings.y,
        opacity: settings.opacity,
        duration: settings.duration,
        ease: settings.ease,
        stagger: settings.staggerTime,
      });
    }
    
    return () => {
      if (splitTextRef.current) {
        splitTextRef.current.revert();
      }
      tl.kill();
    };
  }, [containerRef, options]);
  
  return splitTextRef;
};