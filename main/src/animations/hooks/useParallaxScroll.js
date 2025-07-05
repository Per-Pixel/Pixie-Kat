import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const useParallaxScroll = (elementRef, options = {}) => {
  useEffect(() => {
    const defaults = {
      speed: 0.5,
      direction: "vertical", // "vertical" or "horizontal"
      start: "top bottom",
      end: "bottom top",
      scrub: true,
    };

    const settings = { ...defaults, ...options };
    const element = elementRef.current;
    
    if (!element) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: element,
        start: settings.start,
        end: settings.end,
        scrub: settings.scrub,
      }
    });

    const distance = settings.direction === "vertical" 
      ? element.offsetHeight * settings.speed
      : element.offsetWidth * settings.speed;
    
    if (settings.direction === "vertical") {
      tl.fromTo(
        element,
        { y: -distance },
        { y: distance, ease: "none" }
      );
    } else {
      tl.fromTo(
        element,
        { x: -distance },
        { x: distance, ease: "none" }
      );
    }

    return () => {
      tl.kill();
    };
  }, [elementRef, options]);
};