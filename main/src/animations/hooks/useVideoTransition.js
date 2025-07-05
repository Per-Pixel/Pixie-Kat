import { useEffect } from "react";
import gsap from "gsap";

export const useVideoTransition = (nextVideoRef, options = {}) => {
  useEffect(() => {
    if (!options.shouldAnimate) return;

    gsap.set("#next-video", { visibility: "visible" });
    gsap.to("#next-video", {
      transformOrigin: "center center",
      scale: 1,
      width: "100%",
      height: "100%",
      duration: 1,
      ease: "power1.inOut",
      onStart: () => nextVideoRef.current?.play(),
    });
    
    gsap.from("#current-video", {
      transformOrigin: "center center",
      scale: 0,
      duration: 1.5,
      ease: "power1.inOut",
    });

    return () => {
      gsap.killTweensOf("#next-video");
      gsap.killTweensOf("#current-video");
    };
  }, [nextVideoRef, options.shouldAnimate]);
};