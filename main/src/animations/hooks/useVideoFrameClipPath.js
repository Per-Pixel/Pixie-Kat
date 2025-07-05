import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

export const useVideoFrameClipPath = (elementSelector, options = {}) => {
  useEffect(() => {
    const defaults = {
      start: "center center",
      end: "bottom center",
      scrub: true,
    };

    const settings = { ...defaults, ...options };

    gsap.set(elementSelector, {
      clipPath: "polygon(14% 0, 72% 0, 88% 90%, 0 95%)",
      borderRadius: "0% 0% 40% 10%",
    });
    
    gsap.from(elementSelector, {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      borderRadius: "0% 0% 0% 0%",
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: elementSelector,
        start: settings.start,
        end: settings.end,
        scrub: settings.scrub,
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [elementSelector, options]);
};