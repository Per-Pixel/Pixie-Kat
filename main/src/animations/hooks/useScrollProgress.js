import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const useScrollProgress = (elementRef, options = {}) => {
  useEffect(() => {
    const defaults = {
      start: "top top",
      end: "bottom bottom",
      scrub: 0.3,
    };

    const settings = { ...defaults, ...options };
    const element = elementRef.current;
    
    if (!element) return;

    gsap.set(element, {
      width: "0%",
    });
    
    gsap.to(element, {
      width: "100%",
      ease: "none",
      scrollTrigger: {
        trigger: document.documentElement,
        start: settings.start,
        end: settings.end,
        scrub: settings.scrub,
      },
    });
    
    return () => {
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.vars.trigger === document.documentElement) {
          trigger.kill();
        }
      });
    };
  }, [elementRef, options]);
};