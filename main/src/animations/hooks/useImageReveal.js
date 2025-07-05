import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const useImageReveal = (imageRef, overlayRef, options = {}) => {
  useEffect(() => {
    const defaults = {
      start: "top 80%",
      end: "bottom 20%",
      scrub: false,
      duration: 1.2,
      ease: "power3.out",
    };

    const settings = { ...defaults, ...options };
    const image = imageRef.current;
    const overlay = overlayRef.current;
    
    if (!image || !overlay) return;
    
    // Set initial states
    gsap.set(image, { scale: 1.2 });
    
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: image.parentElement,
        start: settings.start,
        end: settings.end,
        scrub: settings.scrub,
        toggleActions: "play none none none",
      },
    });
    
    tl.to(overlay, {
      scaleX: 0,
      transformOrigin: "right",
      duration: settings.duration,
      ease: settings.ease,
    })
    .to(image, {
      scale: 1,
      duration: settings.duration,
      ease: settings.ease,
      delay: -settings.duration * 0.6,
    });
    
    return () => {
      tl.kill();
    };
  }, [imageRef, overlayRef, options]);
};