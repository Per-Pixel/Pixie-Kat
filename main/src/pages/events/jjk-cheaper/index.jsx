import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import {
  DEFAULT_JJK_CHEAPER,
  fetchJjkCheaperSettings,
  isJjkCheaperPublished,
  sectionVisible,
} from "../../../lib/eventJjkCheaper";
import "./jjk-cheaper.css";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useScrollReveal(rootRef, ready) {
  useEffect(() => {
    if (!ready) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;

    const nodes = Array.from(root.querySelectorAll("[data-jjk-reveal]"));
    if (!nodes.length) return undefined;

    if (prefersReducedMotion()) {
      nodes.forEach((el) => el.classList.add("is-visible"));
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );

    nodes.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef, ready]);
}

function usePointerGlow(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return undefined;

    const onMove = (event) => {
      root.style.setProperty("--jjk-pointer-x", `${event.clientX}px`);
      root.style.setProperty("--jjk-pointer-y", `${event.clientY}px`);
      root.style.setProperty("--jjk-pointer-strength", "1");
    };
    const onLeave = () => root.style.setProperty("--jjk-pointer-strength", "0");

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [rootRef]);
}

function useLiveStatus(hero) {
  return useMemo(() => {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = fmt.formatToParts(now);
    const y = parts.find((p) => p.type === "year")?.value ?? "2026";
    const m = parts.find((p) => p.type === "month")?.value ?? "01";
    const d = parts.find((p) => p.type === "day")?.value ?? "01";
    const today = `${y}-${m}-${d}`;

    if (today < hero.start_iso) {
      return { status: "before", label: `Event starts ${hero.start_iso.slice(5)}` };
    }
    if (today > hero.end_iso) {
      return { status: "ended", label: `Event ended ${hero.end_iso.slice(5)}` };
    }
    return { status: "active", label: "Route live" };
  }, [hero.end_iso, hero.start_iso]);
}

function EventNav({ settings, activeId }) {
  const progressRef = useRef(null);

  useEffect(() => {
    const el = progressRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      el.style.setProperty("--jjk-page-progress", String(p));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className="jjk-nav" aria-label="Jujutsu Kaisen event navigation" ref={progressRef}>
      <div className="jjk-nav-progress" aria-hidden="true" />
      <Link to="/" className="jjk-logo-link" aria-label="Back to PixieKat">
        <span className="jjk-logo-core">
          <img src="/img/logo.png" alt="PixieKat" width={120} height={48} />
        </span>
        <span className="jjk-logo-meta">
          <small>{settings.nav.file_code}</small>
          <strong>{settings.nav.archive_label}</strong>
        </span>
      </Link>
      <div className="jjk-nav-items">
        {settings.nav.links.map((link) => (
          <a
            key={link.id}
            href={link.href}
            data-active={activeId === link.id ? "true" : "false"}
            aria-current={activeId === link.id ? "location" : undefined}
          >
            {link.label}
          </a>
        ))}
      </div>
      <Link to="/" className="jjk-nav-store">
        {settings.nav.store_label}
      </Link>
    </nav>
  );
}

function SkinShowcase({ skins }) {
  const [index, setIndex] = useState(0);
  const dragRef = useRef(null);
  const skin = skins[index] || skins[0];
  if (!skin) return null;

  const wrap = (next) => {
    const len = skins.length;
    setIndex(((next % len) + len) % len);
  };

  return (
    <section
      className="jjk-skin-showcase"
      aria-label="Jujutsu Kaisen skin target showcase"
    >
      <div className="jjk-showcase-heading">
        <div>
          <span>Target</span>
          <strong>{skin.sorcerer}</strong>
        </div>
        <span>
          {String(index + 1).padStart(2, "0")} / {String(skins.length).padStart(2, "0")}
        </span>
      </div>

      <div
        className="jjk-skin-deck"
        role="region"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            wrap(index - 1);
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            wrap(index + 1);
          }
        }}
        onPointerDown={(e) => {
          dragRef.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          if (!dragRef.current) return;
          const dx = e.clientX - dragRef.current.x;
          const dy = e.clientY - dragRef.current.y;
          dragRef.current = null;
          if (Math.abs(dx) < 42 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
          wrap(dx < 0 ? index + 1 : index - 1);
        }}
      >
        <div className="jjk-featured-frame" style={{ "--jjk-card-accent": skin.accent }}>
          {skin.portrait ? (
            <img
              key={skin.id}
              src={skin.portrait}
              alt={`${skin.sorcerer} portrait`}
              draggable={false}
              width={800}
              height={1000}
              style={{ objectPosition: skin.imagePosition, transformOrigin: skin.imagePosition }}
            />
          ) : (
            <div
              className="jjk-featured-shade"
              style={{
                background: `linear-gradient(160deg, ${skin.accent}55, #0c0a14)`,
                width: "100%",
                height: "100%",
                minHeight: 420,
              }}
            />
          )}
          <div className="jjk-featured-shade" aria-hidden="true" />
          <span className="jjk-featured-number">{String(index + 1).padStart(2, "0")}</span>
          <span className="jjk-featured-seal">呪</span>
          <div className="jjk-ink-shutters" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="jjk-target-rail" role="tablist" aria-label="Select a Jujutsu Kaisen skin">
          {skins.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              data-active={i === index ? "true" : "false"}
              data-target-index={i}
              className="jjk-skin-card"
              style={{ "--jjk-card-accent": item.accent }}
              onClick={() => setIndex(i)}
            >
              <div className="jjk-skin-card-surface">
                {item.thumbnail || item.portrait ? (
                  <img
                    src={item.thumbnail || item.portrait}
                    alt=""
                    draggable={false}
                    width={400}
                    height={500}
                    loading="lazy"
                    style={{ objectPosition: item.imagePosition }}
                  />
                ) : (
                  <div style={{ background: item.accent, width: "100%", height: "100%" }} />
                )}
                <div className="jjk-card-veil" />
                <div className="jjk-card-copy">
                  <small>{item.hero}</small>
                  <strong>{item.sorcerer}</strong>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="jjk-showcase-controls">
        <button type="button" onClick={() => wrap(index - 1)} aria-label="Previous skin">
          ← PREV
        </button>
        <div role="tablist" aria-label="Skin dots">
          {skins.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <button type="button" onClick={() => wrap(index + 1)} aria-label="Next skin">
          NEXT →
        </button>
      </div>
    </section>
  );
}

function StatStrip({ stats }) {
  if (!stats?.length) return null;
  return (
    <div className="jjk-stat-strip" aria-label="JJK route summary">
      {stats.map((stat, i) => (
        <article key={stat.label}>
          <small>{String(i + 1).padStart(2, "0")}</small>
          <strong>{stat.value}</strong>
          <span>{stat.label}</span>
        </article>
      ))}
    </div>
  );
}

function PhaseStory({ phases, skins }) {
  const scrollRef = useRef(null);
  const [active, setActive] = useState(0);
  const phase = phases[active] || phases[0];
  const skin = skins.find((s) => s.id === phase?.targetId) || skins[active % skins.length] || skins[0];

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !phases.length) return undefined;

    const onScroll = () => {
      if (prefersReducedMotion()) return;
      const rect = node.getBoundingClientRect();
      const span = Math.max(1, rect.height - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / span));
      node.style.setProperty("--jjk-story-progress", String(progress));
      const next = Math.min(phases.length - 1, Math.floor(progress * phases.length));
      setActive((prev) => (prev === next ? prev : next));
    };

    let raf = 0;
    const tick = () => {
      raf = 0;
      onScroll();
    };
    const request = () => {
      if (!raf) raf = window.requestAnimationFrame(tick);
    };

    onScroll();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [phases.length]);

  if (!phase) return null;

  return (
    <section
      ref={scrollRef}
      id="jjk-phase-story"
      className="jjk-story-scroll"
      aria-label="Five phase Jujutsu Kaisen route story"
    >
      <div
        className="jjk-story-stage"
        data-phase={active}
        style={{ "--jjk-phase-accent": skin?.accent || "#ff2f48" }}
      >
        <div className="jjk-story-ghost-number" aria-hidden="true">
          {String(active + 1).padStart(2, "0")}
        </div>
        <div className="jjk-story-grid" aria-hidden="true" />
        <aside className="jjk-story-nav" aria-label="Route phases">
          <span className="jjk-story-nav-label">Phases</span>
          <div>
            {phases.map((item, i) => (
              <button
                key={item.id}
                type="button"
                data-active={i === active ? "true" : "false"}
                onClick={() => {
                  const node = scrollRef.current;
                  if (!node) return;
                  if (prefersReducedMotion()) {
                    setActive(i);
                    return;
                  }
                  const top = node.getBoundingClientRect().top + window.scrollY;
                  const travel = Math.max(0, node.offsetHeight - window.innerHeight);
                  const ratio = i / Math.max(1, phases.length - 1);
                  window.scrollTo({ top: top + travel * ratio, behavior: "smooth" });
                }}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                <strong>{item.label.replace(/^Phase\s+\d+\s*\/\s*/i, "")}</strong>
              </button>
            ))}
          </div>
        </aside>

        <div className="jjk-story-portrait">
          {skin?.portrait ? (
            <img
              src={skin.portrait}
              alt={`${skin.sorcerer} cursed route artwork`}
              width={800}
              height={1000}
              loading={active === 0 ? "eager" : "lazy"}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                minHeight: 360,
                background: `radial-gradient(circle at 40% 30%, ${skin?.accent || "#ff2f48"}88, #0c0a14)`,
              }}
            />
          )}
          <div className="jjk-story-portrait-shade" />
          <div className="jjk-story-energy-line" aria-hidden="true" />
          <div className="jjk-story-character">
            <span>{skin?.hero}</span>
            <strong>{skin?.sorcerer}</strong>
          </div>
        </div>

        <div className="jjk-story-copy">
          <p className="jjk-story-phase-label">{phase.label}</p>
          <time>{phase.dateLabel}</time>
          <h2>{phase.title}</h2>
          <p>{phase.summary}</p>
          <div className="jjk-story-meta-row">
            <div className="jjk-story-checkpoint">
              <span>Checkpoint</span>
              <strong>{phase.checkpoint}</strong>
            </div>
            <div className="jjk-story-draw-count">
              <strong>{phase.cumulativeDraws}</strong>
              <span>draws</span>
            </div>
          </div>
        </div>
        <div className="jjk-story-progress" aria-hidden="true">
          <span />
        </div>
        <div className="jjk-story-scroll-cue" aria-hidden="true">
          scroll the domain
        </div>
      </div>
    </section>
  );
}

function RoutePlanner({ steps }) {
  const [index, setIndex] = useState(0);
  const step = steps[index] || steps[0];
  if (!step) return null;

  return (
    <section
      id="jjk-route-planner"
      className="jjk-route-section jjk-scroll-reveal"
      data-jjk-reveal
    >
      <div className="jjk-section-heading">
        <span>Mission Log</span>
        <h2>
          Day-by-day <em>cheaper</em> route
        </h2>
      </div>

      <div className="jjk-route-console">
        <div className="jjk-date-focus">
          <span>DATE FILE</span>
          <div>
            <small>Active window</small>
            <strong>{step.dateLabel}</strong>
          </div>
          <b>
            {String(index + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
          </b>
        </div>
        <div className="jjk-route-rail" aria-hidden="true">
          <div className="jjk-route-line" />
          {steps.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className="jjk-route-node"
              data-active={i === index ? "true" : "false"}
              data-complete={i < index ? "true" : "false"}
              style={{ "--jjk-step-index": i }}
              onClick={() => setIndex(i)}
            >
              <span className="jjk-route-node-number">{String(i + 1).padStart(2, "0")}</span>
              <span className="jjk-route-node-date">{item.dateLabel}</span>
            </button>
          ))}
        </div>

        <article className="jjk-route-detail">
          <div className="jjk-route-detail-top">
            <div>
              <span>{step.kicker}</span>
              <h3>{step.title}</h3>
            </div>
            <div className="jjk-draw-orb">
              <strong>{step.cumulativeDraws}</strong>
              <span>draws</span>
            </div>
          </div>
          <p className="jjk-route-action">{step.action}</p>
          <div className="jjk-route-chips">
            {step.diamonds ? (
              <span>
                <small>Diamonds</small>
                <strong>{step.diamonds}</strong>
              </span>
            ) : null}
            {step.tokens ? (
              <span>
                <small>Tokens</small>
                <strong>{step.tokens}</strong>
              </span>
            ) : null}
            {step.recharge ? (
              <span>
                <small>Recharge</small>
                <strong>{step.recharge}</strong>
              </span>
            ) : null}
          </div>
          <div className="jjk-progress-row">
            <span>Cumulative draws</span>
            <strong>{step.cumulativeDraws}</strong>
            <div>
              <span
                style={{
                  width: `${Math.min(100, (step.cumulativeDraws / Math.max(1, steps[steps.length - 1]?.cumulativeDraws || 121)) * 100)}%`,
                }}
              />
            </div>
          </div>
          <div className="jjk-route-arrows">
            <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
              Prev
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
              disabled={index === steps.length - 1}
            >
              Next
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

function Breakdown({ breakdown }) {
  return (
    <section id="jjk-costs" className="jjk-breakdown-section jjk-scroll-reveal" data-jjk-reveal>
      <div className="jjk-section-heading jjk-section-heading--compact">
        <span>{breakdown.heading}</span>
        <h2>
          Spend ceiling <em>&</em> milestones
        </h2>
      </div>
      <div className="jjk-breakdown-grid">
        <article className="jjk-cost-panel jjk-reveal-from-left jjk-scroll-reveal" data-jjk-reveal>
          <div className="jjk-panel-label">
            <span>{breakdown.equation_label}</span>
            <strong>{breakdown.total_value}</strong>
          </div>
          <p className="jjk-equation" style={{ display: "block" }}>
            {breakdown.equation}
          </p>
          <div className="jjk-cost-total">
            <div>
              <small>{breakdown.total_label}</small>
              <strong>{breakdown.total_value}</strong>
            </div>
          </div>
        </article>

        <article className="jjk-rules-panel jjk-scroll-reveal" data-jjk-reveal>
          <div className="jjk-panel-label">
            <span>Draw rules</span>
            <strong>Follow the cheaper path</strong>
          </div>
          <div className="jjk-draw-rules">
            {breakdown.rules.map((rule, i) => (
              <article key={rule.label}>
                <strong>{String(i + 1).padStart(2, "0")}</strong>
                <div>
                  <span>{rule.label}</span>
                  <p>{rule.helper}</p>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="jjk-milestone-panel jjk-reveal-from-right jjk-scroll-reveal" data-jjk-reveal>
          <div className="jjk-panel-label">
            <span>Milestones</span>
            <strong>Route rewards</strong>
          </div>
          <div className="jjk-milestone-track">
            {breakdown.milestones.map((m, i) => (
              <article
                key={m.draws}
                data-included={m.includedInRoute ? "true" : "false"}
                style={{ "--jjk-milestone-index": i }}
              >
                <div>
                  <strong>{m.draws}</strong>
                  <span>draws</span>
                </div>
                <p>{m.reward}</p>
                <small>{m.includedInRoute ? "In route" : "Optional"}</small>
              </article>
            ))}
          </div>
        </article>
      </div>

      <div className="jjk-safety-banner jjk-scroll-reveal" data-jjk-reveal>
        <div className="jjk-safety-icon" aria-hidden="true">
          !
        </div>
        <div>
          <span>Stop rule</span>
          <h3>{breakdown.safety_title}</h3>
          <p>{breakdown.safety_body}</p>
        </div>
      </div>
    </section>
  );
}

function FaqSection({ faq }) {
  return (
    <section id="jjk-faq" className="jjk-breakdown-section jjk-scroll-reveal" data-jjk-reveal>
      <div className="jjk-section-heading jjk-section-heading--compact">
        <p>{faq.heading}</p>
        <h2>Read before you spend</h2>
      </div>
      <div className="jjk-breakdown-grid">
        {faq.items.map((item) => (
          <article key={item.q} className="jjk-rules-panel" data-jjk-reveal>
            <p className="jjk-panel-label">{item.q}</p>
            <p className="jjk-route-action">{item.a}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CtaSection({ cta }) {
  return (
    <section className="jjk-footer jjk-scroll-reveal" data-jjk-reveal>
      <div>
        <img src="/img/logo.png" alt="PixieKat" width={74} height={40} />
        <span>{cta.heading}</span>
      </div>
      <div>
        <p>{cta.body}</p>
        <Link to={cta.button_href || "/games"} className="jjk-button jjk-button--primary" style={{ marginLeft: 16 }}>
          {cta.button_label}
        </Link>
      </div>
    </section>
  );
}

export default function JjkCheaperPage() {
  const rootRef = useRef(null);
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("jjk-event-guide");
  const live = useLiveStatus(settings?.hero || DEFAULT_JJK_CHEAPER.hero);

  useEffect(() => {
    let cancelled = false;
    fetchJjkCheaperSettings().then((data) => {
      if (!cancelled) {
        setSettings(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useScrollReveal(rootRef, Boolean(settings) && !loading);
  usePointerGlow(rootRef);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.classList.add("jjk-archive-active");
    body.classList.add("jjk-archive-active");
    return () => {
      html.classList.remove("jjk-archive-active");
      body.classList.remove("jjk-archive-active");
    };
  }, []);

  useEffect(() => {
    if (!settings || loading) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;
    const supported =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("animation-timeline: view()");
    root.setAttribute("data-scroll-timeline", supported ? "supported" : "fallback");
    return undefined;
  }, [settings, loading]);

  useEffect(() => {
    if (!settings) return undefined;
    const links = settings.nav.links || [];
    const onScroll = () => {
      const marker = window.scrollY + window.innerHeight * 0.32;
      let current = links[0]?.id || "jjk-event-guide";
      links.forEach((link) => {
        const el = document.getElementById(link.id);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (top <= marker) current = link.id;
      });
      setActiveNav((prev) => (prev === current ? prev : current));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [settings]);

  if (loading) {
    return <div className="jjk-loading">Loading cursed archive…</div>;
  }

  if (!isJjkCheaperPublished(settings) && !isPreview) {
    return <Navigate to="/" replace />;
  }

  const show = (key) => sectionVisible(settings, key);

  return (
    <div ref={rootRef} className="jjk-page">
      {isPreview && !isJjkCheaperPublished(settings) ? (
        <div className="jjk-preview-banner">
          <span>Admin preview · draft (not public)</span>
          <span>Remove ?preview=1 for public gate</span>
        </div>
      ) : null}
      <div className="jjk-cursed-energy-bg" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="jjk-page-noise" aria-hidden="true" />

      {show("nav") ? <EventNav settings={settings} activeId={activeNav} /> : null}

      <main className="jjk-main">
          {show("hero") ? (
            <section id="jjk-event-guide" className="jjk-hero-scroll">
              <div className="jjk-hero">
                <div className="jjk-hero-copy">
                  <div className="jjk-kicker-row">
                    <span className="jjk-collab-mark">{settings.hero.collab_mark}</span>
                    <span className={`jjk-live-pill jjk-live-pill--${live.status}`}>
                      {live.label}
                    </span>
                  </div>
                  <p className="jjk-eyebrow">{settings.hero.eyebrow}</p>
                  <h1>
                    <span>{settings.hero.title_line1}</span>
                    <strong>{settings.hero.title_line2}</strong>
                  </h1>
                  <p className="jjk-hero-summary">{settings.hero.summary}</p>
                  <div className="jjk-hero-actions">
                    <a href={settings.hero.primary_href} className="jjk-button jjk-button--primary">
                      {settings.hero.primary_cta}
                    </a>
                    <Link to={settings.hero.secondary_href} className="jjk-button jjk-button--ghost">
                      {settings.hero.secondary_cta}
                    </Link>
                  </div>
                  <div className="jjk-event-window">
                    <span>{settings.hero.window_label}</span>
                    <strong>{settings.hero.date_range_label}</strong>
                  </div>
                </div>

                {show("showcase") ? <SkinShowcase skins={settings.skins} /> : null}
              </div>
              {show("showcase") ? <StatStrip stats={settings.stats} /> : null}
            </section>
          ) : null}

          {show("story") ? <PhaseStory phases={settings.phases} skins={settings.skins} /> : null}
          {show("route") ? <RoutePlanner steps={settings.routeSteps} /> : null}
          {show("breakdown") ? <Breakdown breakdown={settings.breakdown} /> : null}
          {show("faq") ? <FaqSection faq={settings.faq} /> : null}
          {show("cta") ? <CtaSection cta={settings.cta} /> : null}
      </main>
    </div>
  );
}
