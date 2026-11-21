import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isConstrainedMotion } from "../motionBudget";

gsap.registerPlugin(ScrollTrigger);

export const useParallaxScroll = (elementRef, options = {}) => {
  const speed = options.speed ?? 0.2;
  const direction = options.direction ?? "vertical";
  const start = options.start ?? "top bottom";
  const end = options.end ?? "bottom top";
  const scrub = options.scrub ?? 0.15;

  useEffect(() => {
    const element = elementRef.current;

    if (!element || !speed) return undefined;

    const constrained = isConstrainedMotion();
    const span = direction === "vertical" ? element.offsetHeight : element.offsetWidth;
    const distance = span * speed * (constrained ? 0.5 : 1);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: element,
        start,
        end,
        // A numeric scrub keeps easing after the finger stops. Direct scrub
        // tracks the scroll position and costs one update per frame.
        scrub: constrained ? true : scrub,
        ...(constrained ? { fastScrollEnd: true } : {}),
      },
    });

    if (direction === "vertical") {
      tl.fromTo(element, { y: -distance }, { y: distance, ease: "none" });
    } else {
      tl.fromTo(element, { x: -distance }, { x: distance, ease: "none" });
    }

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [elementRef, speed, direction, start, end, scrub]);
};
