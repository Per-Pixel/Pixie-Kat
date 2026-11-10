import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const easeOut = "power3.out";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function updateCounter(counter, value) {
  const padding = Number(counter.dataset.pad || 0);
  const text = String(Math.round(value)).padStart(padding, "0");
  const textNode = Array.from(counter.childNodes).find((node) => node.nodeType === 3);

  if (textNode) {
    textNode.nodeValue = text;
  } else {
    counter.textContent = text;
  }
}

export function useDummyAnimations(scope, routeKey) {
  useLayoutEffect(() => {
    const root = scope.current;

    if (!root || prefersReducedMotion()) return undefined;

    root.classList.add("dummy-motion-ready");

    const context = gsap.context(() => {
      const query = (selector, container = root) => gsap.utils.toArray(selector, container);
      const hero = root.querySelector(".dummy-hero");

      if (hero) {
        const intro = gsap.timeline({ defaults: { ease: easeOut } });
        const eyebrow = hero.querySelector('[data-intro="eyebrow"]');
        const title = hero.querySelector('[data-intro="title"]');
        const description = hero.querySelector('[data-intro="description"]');
        const actions = hero.querySelector('[data-intro="actions"]');
        const visual = hero.querySelector('[data-intro="visual"]');
        const videoFrame = hero.querySelector(".dummy-hero-video-frame");
        const windowPanel = hero.querySelector('[data-intro="window"]');
        const labels = query('[data-intro="label"]', hero);
        const floats = query('[data-intro="float"]', hero);

        intro
          .fromTo(eyebrow, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, 0.08)
          .fromTo(
            title,
            { y: 48, opacity: 0, clipPath: "inset(0 0 100% 0)" },
            { y: 0, opacity: 1, clipPath: "inset(0 0 0% 0)", duration: 0.95, ease: "power4.out" },
            0.14,
          )
          .fromTo(description, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55 }, 0.38)
          .fromTo(actions, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.48)
          .fromTo(
            visual,
            { opacity: 0, clipPath: "inset(8% 0 0 100%)" },
            { opacity: 1, clipPath: "inset(0% 0% 0% 0%)", duration: 1.15, ease: "power4.out" },
            0.2,
          )
          .fromTo(
            videoFrame,
            { clipPath: "inset(0 100% 0 0)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "power3.inOut" },
            0.46,
          )
          .fromTo(
            windowPanel,
            { y: 42, opacity: 0, rotationY: -15, rotationZ: 6 },
            { y: 0, opacity: 1, rotationY: -10, rotationZ: 3, duration: 0.85 },
            0.54,
          )
          .fromTo(labels, { opacity: 0 }, { opacity: 1, duration: 0.35, stagger: 0.08 }, 0.64)
          .fromTo(floats, { opacity: 0 }, { opacity: 1, duration: 0.45, stagger: 0.12 }, 0.72);
      }

      const pageIntro = root.querySelector(".dummy-page-intro");

      if (pageIntro) {
        const intro = gsap.timeline({ defaults: { ease: easeOut } });
        intro
          .fromTo(
            pageIntro.querySelector(".dummy-section-kicker"),
            { y: 14, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.45 },
            0.08,
          )
          .fromTo(
            pageIntro.querySelector("h1"),
            { y: 40, opacity: 0, clipPath: "inset(0 0 100% 0)" },
            { y: 0, opacity: 1, clipPath: "inset(0 0 0% 0)", duration: 0.9, ease: "power4.out" },
            0.14,
          )
          .fromTo(pageIntro.querySelector("p"), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.42);
      }

      query("[data-reveal]").forEach((element) => {
        const clip = element.dataset.reveal === "clip";
        const from = { y: clip ? 22 : 30, opacity: 0 };
        const to = {
          y: 0,
          opacity: 1,
          duration: clip ? 0.9 : 0.75,
          ease: easeOut,
          immediateRender: false,
        };

        if (clip) {
          from.clipPath = "inset(0 0 100% 0)";
          to.clipPath = "inset(0% 0% 0% 0%)";
        }

        gsap.fromTo(element, from, {
          ...to,
          scrollTrigger: {
            trigger: element,
            start: "top 84%",
            once: true,
          },
        });
      });

      query("[data-reveal-group]").forEach((group) => {
        const items = query("[data-reveal-item]", group);

        if (!items.length) return;

        gsap.fromTo(
          items,
          { y: 34, opacity: 0, clipPath: "inset(0 0 100% 0)" },
          {
            y: 0,
            opacity: 1,
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.8,
            ease: easeOut,
            immediateRender: false,
            stagger: { each: 0.09, from: "start" },
            scrollTrigger: {
              trigger: group,
              start: "top 82%",
              once: true,
            },
          },
        );
      });

      query("[data-parallax]").forEach((element) => {
        const distance = Number(element.dataset.parallax || 30);
        const section = element.closest("section") || element;

        gsap.fromTo(
          element,
          { y: -distance },
          {
            y: distance,
            ease: "none",
            immediateRender: false,
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.7,
            },
          },
        );
      });

      query("[data-count]").forEach((counter) => {
        const target = Number(counter.dataset.count);
        const proxy = { value: 0 };

        if (!Number.isFinite(target)) return;

        gsap.fromTo(
          proxy,
          { value: 0 },
          {
            value: target,
            duration: 1.2,
            ease: "power2.out",
            immediateRender: false,
            onUpdate: () => updateCounter(counter, proxy.value),
            scrollTrigger: {
              trigger: counter,
              start: "top 88%",
              once: true,
            },
          },
        );
      });

      ScrollTrigger.refresh();
    }, root);

    return () => {
      context.revert();
      root.classList.remove("dummy-motion-ready");
    };
  }, [scope, routeKey]);
}
