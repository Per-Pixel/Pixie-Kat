import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { formatCount } from "./plan";

gsap.registerPlugin(ScrollTrigger);
const ART = "/img/events/kagura";

export function KaguraLoader({ onComplete, onReveal, reduced }) {
  const root = useRef(null);
  const closing = useRef(false);
  const exitAnimation = useRef(null);
  const [art, setArt] = useState({ settled: 0, loaded: 0 });
  const finish = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    onReveal();
    try { sessionStorage.setItem("pixie_kagura_intro", "1"); } catch { /* optional session cache */ }
    if (reduced) { onComplete(); return; }
    exitAnimation.current = gsap.timeline({ onComplete })
      .to(root.current.querySelector(".kl-loader-seal"), { scale: 1.15, rotation: 18, duration: .35, ease: "power2.in" })
      .to(root.current.querySelectorAll(".kl-loader-shutter"), { scaleX: 0, duration: .85, stagger: .08, ease: "power3.inOut" }, "<")
      .to(root.current.querySelector(".kl-loader-center"), { scale: .7, opacity: 0, duration: .35 }, "<");
  }, [onComplete, onReveal, reduced]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previousFocus = document.activeElement;
    root.current.querySelector("button")?.focus({ preventScroll: true });
    const started = performance.now();
    let alive = true;
    let settled = 0;
    let loaded = 0;
    let exitTimer;
    const images = ["bg.jpg", "lantern.png", "crest.jpg"].map((file) => {
      const img = new Image();
      const done = (success) => {
        if (!alive) return;
        settled += 1;
        loaded += success ? 1 : 0;
        setArt({ settled, loaded });
        if (settled === 3) exitTimer = setTimeout(finish, Math.max(0, 650 - (performance.now() - started)));
      };
      img.onload = () => done(true);
      img.onerror = () => done(false);
      img.src = `${ART}/${file}`;
      return img;
    });
    const timeout = setTimeout(finish, 6500);
    return () => {
      alive = false;
      clearTimeout(timeout);
      clearTimeout(exitTimer);
      images.forEach((img) => { img.onload = null; img.onerror = null; });
      exitAnimation.current?.kill();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus({ preventScroll: true });
    };
  }, [finish]);
  useEffect(() => { if (reduced) finish(); }, [reduced, finish]);
  return <div className="kl-loader" ref={root} onKeyDown={(event) => { if (event.key === "Tab") { event.preventDefault(); root.current.querySelector("button")?.focus(); } if (event.key === "Escape") finish(); }} role="dialog" aria-modal="true" aria-label="Preparing Kagura Legend artwork">
    <div className="kl-loader-shutter kl-loader-left" /><div className="kl-loader-shutter kl-loader-right" />
    <div className="kl-loader-center">
      <p className="kl-eyebrow">PixieKat presents</p>
      <div className="kl-loader-seal"><svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="90" /><path d="M100 3 197 100 100 197 3 100Z" /></svg><img src={`${ART}/lantern.png`} alt="" /></div>
      <h2>Kagura Legend</h2><p className="kl-loader-caption" role="status">{art.loaded < art.settled ? "Some artwork is unavailable. Continuing…" : `${art.loaded} / 3 artworks ready`}</p>
      <div className="kl-loader-progress" aria-hidden="true"><span style={{ transform: `scaleX(${art.loaded / 3})` }} /></div>
    </div>
    <button type="button" className="kl-loader-skip" onClick={finish}>Skip intro ↗</button>
  </div>;
}

export function CostFrames({ bill, luck }) {
  const steps = [
    { number: "01", title: "The expensive way.", amount: formatCount(bill.naive), detail: "Diamonds at full price. Every draw costs 100.", art: "bg.jpg", tag: "Full price" },
    { number: "02", title: "Make every step count.", amount: `−${formatCount(Math.max(0, bill.naive - bill.total))}`, detail: "Diamonds saved with your chosen tokens, discounts and usable Promo Diamonds.", art: "lantern.png", tag: "Your savings" },
    { number: "03", title: "Arrive with more left.", amount: formatCount(bill.total), detail: `Diamonds for ${bill.draws} draws at ${luck.rate} Crests per draw. Recharge requirements are separate.`, art: "crest.jpg", tag: "Planned spend" },
  ];
  return <div className="kl-frame-story" aria-label="How the plan reduces your bill">
    <div className="kl-frame-stage">
      <div className="kl-frame-guide"><span>Follow the Diamonds</span><span>Scroll to unfold ↓</span><a href="#bill-controls">Skip to calculator ↗</a></div>
      <div className="kl-frame-deck">
        {steps.map((step, index) => <article key={step.number} className={`kl-story-frame kl-story-frame-${index}`}>
          <span className="kl-frame-number" aria-hidden="true">{step.number}</span>
          <div className="kl-frame-art" aria-hidden="true"><img src={`${ART}/${step.art}`} alt="" /></div>
          <div className="kl-frame-copy"><p className="kl-eyebrow">{step.tag}</p><h3>{step.title}</h3><strong>{step.amount}<small>Diamonds</small></strong><p>{step.detail}</p></div>
          <div className="kl-frame-corner" aria-hidden="true">✦</div>
        </article>)}
      </div>
      <div className="kl-frame-progress" aria-hidden="true"><span /></div>
    </div>
  </div>;
}

export function useKaguraMotion(pageRef, ready, reduced) {
  useEffect(() => {
    if (!ready) return undefined;
    const html = document.documentElement;
    const previousBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    if (reduced) return () => { html.style.scrollBehavior = previousBehavior; };
    const lenis = new Lenis({ duration: .95, smoothWheel: true, syncTouch: false, anchors: { offset: -86 }, prevent: (node) => Boolean(node.closest?.("input,textarea,select,[data-lenis-prevent]")) });
    const tick = (time) => lenis.raf(time * 1000);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(tick);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      const path = pageRef.current.querySelector(".kl-route-line path");
      const length = path.getTotalLength();
      gsap.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 2.2, ease: "power2.inOut" });
      gsap.from(".kl-stage .kl-title", { clipPath: "inset(0 100% 0 0)", x: -35, duration: 1.1, ease: "power3.out" });
      gsap.utils.toArray(".kl-block > h2").forEach((heading) => gsap.from(heading, { clipPath: "inset(0 0 100% 0)", y: 30, duration: .85, ease: "power3.out", scrollTrigger: { trigger: heading, start: "top 90%", once: true } }));
      gsap.utils.toArray(".kl-comparison-path path").forEach((route) => {
        const total = route.getTotalLength();
        gsap.fromTo(route, { strokeDasharray: total, strokeDashoffset: total }, { strokeDashoffset: 0, duration: 1.2, scrollTrigger: { trigger: route, start: "top 90%", once: true } });
      });
      media.add("(min-width: 901px) and (min-height: 720px)", () => {
        const stage = pageRef.current.querySelector(".kl-frame-stage");
        const frames = gsap.utils.toArray(".kl-story-frame");
        gsap.set(stage, { height: "min(730px, calc(100svh - 110px))" });
        gsap.set(frames, { position: "absolute", inset: 0, transformOrigin: "50% 100%" });
        gsap.set(frames.slice(1), { yPercent: 105, rotate: 7, clipPath: "inset(0 0 0 0 round 26px)" });
        const story = gsap.timeline({ scrollTrigger: { trigger: stage, start: "top 90px", end: () => `+=${Math.round(innerHeight * 1.65)}`, pin: true, scrub: .8, anticipatePin: 1, invalidateOnRefresh: true } });
        story.to(frames[0], { scale: .9, rotate: -4, yPercent: -4, duration: 1 }, 0)
          .to(frames[1], { yPercent: 0, rotate: 0, duration: 1, ease: "power2.inOut" }, 0)
          .to(frames[1].querySelector(".kl-frame-art"), { rotate: -12, scale: 1.15, duration: 1 }, 0)
          .to(frames[1], { scale: .9, rotate: 4, yPercent: -4, duration: 1 }, 1.15)
          .to(frames[2], { yPercent: 0, rotate: 0, duration: 1, ease: "power2.inOut" }, 1.15)
          .fromTo(frames[2].querySelector(".kl-frame-art"), { rotate: -35, scale: .7 }, { rotate: 0, scale: 1, duration: 1 }, 1.15)
          .fromTo(".kl-frame-progress span", { scaleX: 0 }, { scaleX: 1, duration: 2.15, ease: "none" }, 0);
      });
      media.add("(max-width: 900px), (max-height: 719px)", () => {
        gsap.utils.toArray(".kl-story-frame").forEach((frame, index) => gsap.from(frame, { x: index % 2 ? 35 : -35, rotate: index % 2 ? 3 : -3, scale: .94, duration: .7, scrollTrigger: { trigger: frame, start: "top 92%", end: "top 55%", scrub: .4 } }));
      });
    }, pageRef);
    let active = true;
    const refresh = () => { if (active) { lenis.resize(); ScrollTrigger.refresh(); } };
    document.fonts?.ready.then(refresh);
    const timer = setTimeout(refresh, 300);
    return () => {
      active = false;
      clearTimeout(timer);
      media.revert();
      context.revert();
      gsap.ticker.remove(tick);
      lenis.destroy();
      html.style.scrollBehavior = previousBehavior;
    };
  }, [pageRef, ready, reduced]);
}
