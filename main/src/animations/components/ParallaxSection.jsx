import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const ParallaxSection = ({
  children,
  backgroundSrc,
  speed = 0.2,
  className = "",
  contentClassName = "",
  overlayColor = "rgba(0, 0, 0, 0.4)",
}) => {
  const sectionRef = useRef(null);
  const backgroundRef = useRef(null);
  
  useEffect(() => {
    const section = sectionRef.current;
    const background = backgroundRef.current;
    
    if (!section || !background) return;
    
    // Calculate how much to move the background
    const yPercent = speed * 100;
    
    // Create the parallax effect
    gsap.fromTo(
      background,
      { y: -yPercent },
      {
        y: yPercent,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );
    
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.vars.trigger === section) {
          trigger.kill();
        }
      });
    };
  }, [speed]);
  
  return (
    <section
      ref={sectionRef}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        ref={backgroundRef}
        className="absolute inset-0 h-[130%] w-full"
        style={{
          top: "-15%",
          backgroundImage: `url(${backgroundSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: overlayColor }}
      />
      
      {/* Content */}
      <div className={`relative z-10 ${contentClassName}`}>
        {children}
      </div>
    </section>
  );
};

export default ParallaxSection;
