import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const useScrollBasedVideo = (videoRef, options = {}) => {
  useEffect(() => {
    const defaults = {
      start: "top top",
      end: "bottom bottom",
      scrub: true,
    };
    
    const settings = { ...defaults, ...options };
    const video = videoRef.current;
    
    if (!video) return;
    
    // Pause the video initially
    video.pause();
    
    // Create a ScrollTrigger that controls video playback
    const scrollTrigger = ScrollTrigger.create({
      trigger: video,
      start: settings.start,
      end: settings.end,
      scrub: settings.scrub,
      onUpdate: (self) => {
        // Calculate the current time of the video based on scroll progress
        const scrollProgress = self.progress;
        const videoDuration = video.duration;
        const currentTime = scrollProgress * videoDuration;
        
        // Update the video time
        if (video.readyState > 0) {
          video.currentTime = currentTime;
        }
      },
    });
    
    return () => {
      scrollTrigger.kill();
    };
  }, [videoRef, options]);
};