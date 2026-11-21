import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";
import { ScrollTrigger } from "gsap/all";
import { isConstrainedMotion } from "../../animations/motionBudget";

gsap.registerPlugin(ScrollTrigger);

const AnimatedTitle = ({ title, containerClass, textColor }) => {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (isConstrainedMotion()) {
        // Per-word rotateX/rotateY builds a compositor layer for every word.
        // A y/opacity stagger is the same reveal without that layer cost.
        gsap.fromTo(
          ".animated-word",
          { y: 32, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: "power2.out",
            stagger: 0.03,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 92%",
              once: true,
            },
          },
        );
        return;
      }

      const titleAnimation = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "100 bottom",
          end: "center bottom",
          toggleActions: "play none none reverse",
        },
      });

      titleAnimation.to(".animated-word", {
        opacity: 1,
        transform: "translate3d(0,0,0) rotateY(0deg) rotateX(0deg)",
        ease: "power2.inOut",
        stagger: 0.02,
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`animated-title ${containerClass}`}
      style={textColor ? { color: textColor } : undefined}
    >
      {(title || "").split("<br />").map((line, index) => (
        <div
          key={index}
          className="flex-center max-w-full flex-wrap gap-2 px-10 md:gap-3"
        >
          {line.split(" ").map((word, i) => (
            <span
              key={i}
              className="animated-word"
              dangerouslySetInnerHTML={{ __html: word }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default AnimatedTitle;
