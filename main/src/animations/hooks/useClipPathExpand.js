import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

export const useClipPathExpand = (elementSelector, options = {}) => {
  useEffect(() => {
    const defaults = {
      start: "center center",
      end: "+=800 center",
      scrub: 0.5,
      pin: true,
      pinSpacing: true,
    };

    const settings = { ...defaults, ...options };

    const clipAnimation = gsap.timeline({
      scrollTrigger: {
        trigger: elementSelector,
        start: settings.start,
        end: settings.end,
        scrub: settings.scrub,
        pin: settings.pin,
        pinSpacing: settings.pinSpacing,
      },
    });

    clipAnimation.to(".mask-clip-path", {
      width: "100vw",
      height: "100vh",
      borderRadius: 0,
    });

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [elementSelector, options]);
};