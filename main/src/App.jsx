import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  Code2,
  Command,
  Globe2,
  Layers3,
  Menu,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useDummyAnimations } from "./animations/useDummyAnimations";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Services", to: "/#services", hash: true },
  { label: "Works", to: "/works" },
  { label: "Contact", to: "/contact" },
];

const animatedLogoVideo = "https://v1.pinimg.com/videos/iht/expMp4/e6/55/c1/e655c1996d66ced6c1f3f29b4b96692e_720w.mp4";
const eyesVideo = "https://v1.pinimg.com/videos/iht/expMp4/1c/f3/5f/1cf35f884d3c5e22e55c2d85a4ace1c3_720w.mp4";

const serviceItems = [
  {
    number: "01",
    icon: Layers3,
    title: "Product systems",
    description:
      "We turn complicated workflows into calm, useful products people want to return to.",
    tags: ["Strategy", "UX / UI", "Prototyping"],
  },
  {
    number: "02",
    icon: Code2,
    title: "Software engineering",
    description:
      "Fast, resilient software built with the right foundations for the next stage of growth.",
    tags: ["Web apps", "Platforms", "APIs"],
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Data in motion",
    description:
      "Clear signals from messy data, so your team can make better decisions sooner.",
    tags: ["Analytics", "Automation", "AI workflows"],
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "Operational clarity",
    description:
      "The guardrails, rituals, and tooling that keep good ideas moving after launch day.",
    tags: ["Systems", "Security", "Enablement"],
  },
];

const workItems = [
  {
    client: "Chris Lund",
    category: "Digital experience",
    title: "A sharper frame for a clear point of view.",
    description:
      "A bold, image-led web experience with strong pacing, oversized type, and a confident editorial rhythm.",
    tags: ["Framer", "Art direction"],
    variant: "orbit",
    image: "/works/work1.png",
    siteUrl: "https://chrislund.framer.website/",
  },
  {
    client: "Silk Tricky",
    category: "Brand / Web",
    title: "A little more edge in every detail.",
    description:
      "A distinctive visual system built around contrast, atmosphere, and a memorable digital first impression.",
    tags: ["Branding", "Web design"],
    variant: "pulse",
    image: "/works/work2.png",
    siteUrl: "https://www.silktricky.com/",
  },
  {
    client: "Air Jordan 1",
    category: "Campaign / Product",
    title: "The icon, in motion.",
    description:
      "A high-impact product story that puts the object first and lets the movement carry the emotion.",
    tags: ["Campaign", "Motion"],
    variant: "atlas",
    image: "/works/work3.png",
    siteUrl: "https://airjordan.framer.website/",
  },
  {
    client: "Interior Define",
    category: "Interior / Commerce",
    title: "Crafting dreams into living spaces.",
    description:
      "A warm, considered experience that makes a visual world feel tangible before the first conversation.",
    tags: ["Editorial", "Experience"],
    variant: "relay",
    image: "/works/work4.png",
    siteUrl: "https://interiordefine.framer.website/",
  },
  {
    client: "Roman24",
    category: "Creative studio",
    title: "Create, innovate, collaborate.",
    description:
      "A clear studio introduction with a strong visual point of view and a direct invitation to get started.",
    tags: ["Studio", "Digital"],
    variant: "orbit",
    image: "/works/work5.png",
    siteUrl: "https://roman24.framer.website/",
  },
];

const legalPages = {
  terms: {
    eyebrow: "Legal / 01",
    title: "Terms & Conditions",
    intro:
      "These draft terms describe the basic rules for using the PixieKat System website and engaging with our studio. They are placeholder copy for this temporary site and should be reviewed before launch.",
    sections: [
      [
        "Using this site",
        "By visiting this website, you agree to use it lawfully and respectfully. You may browse, share, and link to our public pages, but you may not interfere with the site, attempt to gain unauthorized access, or use its content to mislead others.",
      ],
      [
        "Our services",
        "Any services, timelines, deliverables, or estimates discussed on this website are illustrative until confirmed in a written statement of work. A signed agreement will define the scope, responsibilities, fees, and ownership terms for a project.",
      ],
      [
        "Intellectual property",
        "The PixieKat name, visual identity, original copy, designs, and site code belong to PixieKat System or their respective owners. You may not reproduce or commercially reuse them without permission. Client work shown on this site remains subject to each client agreement.",
      ],
      [
        "Third-party links",
        "This website may link to third-party services for convenience. PixieKat System does not control those services and is not responsible for their availability, content, or privacy practices.",
      ],
      [
        "Updates",
        "We may update these terms as the site or our services change. The date at the top of this page indicates when the current version was last revised.",
      ],
    ],
  },
  refund: {
    eyebrow: "Legal / 02",
    title: "Refund Policy",
    intro:
      "This draft policy covers deposits and payments made for PixieKat System services. It is placeholder copy for this temporary site and will be replaced with project-specific commercial terms before launch.",
    sections: [
      [
        "Project deposits",
        "Deposits reserve studio capacity and allow work to begin. Unless a signed project agreement says otherwise, deposits are non-refundable once discovery, planning, or production work has started.",
      ],
      [
        "Cancellations",
        "If you need to pause or cancel a project, contact us as soon as possible. We will review completed work, committed expenses, and scheduled capacity before confirming any eligible refund or credit.",
      ],
      [
        "Overpayments",
        "If an accidental duplicate payment or overpayment is identified, we will work with the payer to return the excess amount using the original payment method where possible.",
      ],
      [
        "Requesting a review",
        "Send refund questions to hello@pixiekat.com with your project name, invoice reference, and a short explanation. We aim to acknowledge requests within five business days.",
      ],
      [
        "Exceptions",
        "A signed statement of work, order form, or other written agreement may contain terms that differ from this general policy. The project-specific agreement will take precedence.",
      ],
    ],
  },
  privacy: {
    eyebrow: "Legal / 03",
    title: "Privacy Policy",
    intro:
      "This draft policy explains the limited information PixieKat System may collect through this temporary website and how we intend to use it. It is placeholder copy and should be updated after the final forms, analytics, and hosting setup are chosen.",
    sections: [
      [
        "Information you send us",
        "When you contact us, we may receive your name, email address, company, project details, and anything else you choose to include. We use this information to respond to your inquiry and discuss a potential engagement.",
      ],
      [
        "Technical information",
        "Our hosting provider may process basic technical information such as an IP address, browser type, device type, and request timestamps to keep the site secure and reliable. We do not sell personal information.",
      ],
      [
        "How we share information",
        "We share information only with service providers who help us host, secure, or operate the website, or when disclosure is required by law. We ask those providers to handle information appropriately.",
      ],
      [
        "Retention and security",
        "We keep inquiry information only as long as needed to respond, manage a relationship, meet legal obligations, or resolve disputes. We use reasonable safeguards, but no internet transmission or storage system can be guaranteed completely secure.",
      ],
      [
        "Your choices",
        "You can ask us what personal information we hold about you, request a correction, or ask us to delete it where applicable. Email hello@pixiekat.com to make a request.",
      ],
    ],
  },
};

function Brand({ footer = false }) {
  return (
    <Link to="/" className={`dummy-brand ${footer ? "dummy-brand--footer" : ""}`}>
      <span className="dummy-brand-motion" aria-hidden="true">
        <video autoPlay muted loop playsInline preload="metadata" poster="/img/logo.png">
          <source src={animatedLogoVideo} type="video/mp4" />
          <source src="/videos/hero-1.mp4" type="video/mp4" />
        </video>
        <span className="dummy-brand-mark">
          <span />
          <span />
          <span />
          <span />
        </span>
      </span>
      <span>pixiekat system</span>
    </Link>
  );
}

function ArrowLink({ children, to, light = false }) {
  return (
    <Link className={`dummy-arrow-link ${light ? "dummy-arrow-link--light" : ""}`} to={to}>
      <span>{children}</span>
      <ArrowUpRight size={16} strokeWidth={1.8} />
    </Link>
  );
}

function RouteEffects() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const targetId = decodeURIComponent(location.hash.slice(1));
      window.requestAnimationFrame(() => {
        const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth";
        document.getElementById(targetId)?.scrollIntoView({ behavior });
      });
      return;
    }

    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  return null;
}

function SiteNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  return (
    <header className="dummy-site-nav">
      <div className="dummy-nav-inner">
        <Brand />
        <nav className={`dummy-nav-links ${menuOpen ? "dummy-nav-links--open" : ""}`}>
          {navItems.map((item) => {
            const isCurrent = item.hash
              ? location.pathname === "/" && location.hash === "#services"
              : location.pathname === item.to;

            return item.hash ? (
              <Link
                key={item.label}
                to={item.to}
                className={`dummy-nav-link ${isCurrent ? "dummy-nav-link--active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ) : (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `dummy-nav-link ${isActive ? "dummy-nav-link--active" : ""}`
                }
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            );
          })}
          <Link to="/contact" className="dummy-nav-cta" onClick={() => setMenuOpen(false)}>
            Let&apos;s talk <ArrowUpRight size={15} />
          </Link>
        </nav>
        <button
          type="button"
          className="dummy-menu-toggle"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="dummy-site-footer">
      <div className="dummy-footer-cta">
        <div className="dummy-section-kicker dummy-section-kicker--light">
          <span className="dummy-kicker-line" />
          Have a good problem?
        </div>
        <h2>
          Let&apos;s make the
          <br />
          <em>next thing</em> matter.
        </h2>
        <ArrowLink to="/contact" light>
          Start a conversation
        </ArrowLink>
      </div>

      <div className="dummy-footer-grid">
        <div className="dummy-footer-brand-block">
          <Brand footer />
          <p>
            Independent software systems
            <br />
            for ambitious teams.
          </p>
        </div>
        <div className="dummy-footer-column">
          <span className="dummy-footer-label">Explore</span>
          <Link to="/">Home</Link>
          <Link to="/#services">Services</Link>
          <Link to="/works">Works</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div className="dummy-footer-column">
          <span className="dummy-footer-label">Say hello</span>
          <a href="mailto:hello@pixiekat.com">hello@pixiekat.com</a>
          <span>Brooklyn · London · Everywhere</span>
        </div>
        <div className="dummy-footer-column">
          <span className="dummy-footer-label">Elsewhere</span>
          <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">
            LinkedIn <ArrowUpRight size={13} />
          </a>
          <a href="https://github.com" target="_blank" rel="noreferrer">
            GitHub <ArrowUpRight size={13} />
          </a>
        </div>
      </div>

      <div className="dummy-footer-bottom">
        <span>© {new Date().getFullYear()} PixieKat System</span>
        <div className="dummy-legal-links">
          <Link to="/terms">Terms &amp; Conditions</Link>
          <Link to="/refund-policy">Refund Policy</Link>
          <Link to="/privacy-policy">Privacy Policy</Link>
        </div>
        <span>Built with intent.</span>
      </div>
    </footer>
  );
}

function SectionKicker({ children, light = false }) {
  return (
    <div className={`dummy-section-kicker ${light ? "dummy-section-kicker--light" : ""}`}>
      <span className="dummy-kicker-line" />
      {children}
    </div>
  );
}

function WorkArtwork({ variant, image, fallbackImage }) {
  const media = image ? (
    <img
      className="dummy-work-art-image"
      src={image}
      alt=""
      loading="lazy"
      decoding="async"
      onError={(event) => {
        event.currentTarget.onerror = null;
        if (fallbackImage) {
          event.currentTarget.src = fallbackImage;
        } else {
          event.currentTarget.style.display = "none";
        }
      }}
    />
  ) : null;

  if (variant === "orbit") {
    return (
      <div className="dummy-work-art dummy-work-art--orbit" aria-hidden="true">
        {media}
        <div className="dummy-orbit-grid" />
        <div className="dummy-orbit-ring dummy-orbit-ring--one" />
        <div className="dummy-orbit-ring dummy-orbit-ring--two" />
        <div className="dummy-orbit-core">AX</div>
        <span className="dummy-orbit-dot dummy-orbit-dot--one" />
        <span className="dummy-orbit-dot dummy-orbit-dot--two" />
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className="dummy-work-art dummy-work-art--pulse" aria-hidden="true">
        {media}
        <div className="dummy-pulse-topline">
          <span />
          <span />
          <span />
        </div>
        <div className="dummy-pulse-copy">A calmer way forward.</div>
        <div className="dummy-pulse-chart">
          <span style={{ height: "28%" }} />
          <span style={{ height: "43%" }} />
          <span style={{ height: "37%" }} />
          <span style={{ height: "64%" }} />
          <span style={{ height: "56%" }} />
          <span style={{ height: "82%" }} />
          <span style={{ height: "74%" }} />
          <span style={{ height: "94%" }} />
        </div>
        <div className="dummy-pulse-label">steady / growing</div>
      </div>
    );
  }

  if (variant === "atlas") {
    return (
      <div className="dummy-work-art dummy-work-art--atlas" aria-hidden="true">
        {media}
        <div className="dummy-atlas-map-lines" />
        <div className="dummy-atlas-card dummy-atlas-card--top">
          <span>air / now</span>
          <strong>94</strong>
          <small>good to go</small>
        </div>
        <div className="dummy-atlas-card dummy-atlas-card--bottom">
          <span>signal coverage</span>
          <div><i /><i /><i /><i /><i /></div>
        </div>
        <span className="dummy-atlas-pin dummy-atlas-pin--one" />
        <span className="dummy-atlas-pin dummy-atlas-pin--two" />
      </div>
    );
  }

  return (
    <div className="dummy-work-art dummy-work-art--relay" aria-hidden="true">
      {media}
      <div className="dummy-relay-sun" />
      <div className="dummy-relay-orbit dummy-relay-orbit--one" />
      <div className="dummy-relay-orbit dummy-relay-orbit--two" />
      <div className="dummy-relay-label">RELAY / PEOPLE OPS</div>
      <div className="dummy-relay-block dummy-relay-block--one">01</div>
      <div className="dummy-relay-block dummy-relay-block--two">02</div>
      <div className="dummy-relay-block dummy-relay-block--three">03</div>
    </div>
  );
}

function WorkCard({ work, featured = false }) {
  return (
    <article
      className={`dummy-work-card ${featured ? "dummy-work-card--featured" : ""}`}
      data-reveal-item
    >
      <WorkArtwork
        variant={work.variant}
        image={work.image}
        fallbackImage={work.fallbackImage}
      />
      <div className="dummy-work-card-body">
        <div className="dummy-work-card-meta">
          <span>{work.client}</span>
          <span>{work.category}</span>
        </div>
        <h3>{work.title}</h3>
        <p>{work.description}</p>
        <div className="dummy-tag-list">
          {work.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        {work.siteUrl ? (
          <a
            className="dummy-work-card-link"
            href={work.siteUrl}
            target="_blank"
            rel="noreferrer"
          >
            View work <ArrowUpRight size={14} />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function HomePage() {
  return (
    <main>
      <section className="dummy-hero">
        <div className="dummy-hero-noise" />
        <div className="dummy-hero-orb dummy-hero-orb--one" />
        <div className="dummy-hero-orb dummy-hero-orb--two" />
        <div className="dummy-container dummy-hero-layout">
          <div className="dummy-hero-copy">
            <div className="dummy-hero-eyebrow" data-intro="eyebrow">
              <span className="dummy-status-dot" />
              Independent software company / Est. 2016
            </div>
            <h1 data-intro="title">
              We build the systems
              <br />
              that make ideas
              <br />
              <span>move.</span>
            </h1>
            <p className="dummy-hero-description" data-intro="description">
              PixieKat System partners with ambitious teams to turn complex products,
              data, and operations into software that feels inevitable.
            </p>
            <div className="dummy-hero-actions" data-intro="actions">
              <Link to="/contact" className="dummy-primary-button">
                Start a conversation <ArrowUpRight size={17} />
              </Link>
              <Link to="/works" className="dummy-text-button">
                See our work <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div
            className="dummy-hero-visual"
            data-intro="visual"
            aria-label="PixieKat System product systems visualization"
          >
            <div className="dummy-hero-video-frame">
              <video
                className="dummy-hero-video"
                autoPlay
                muted
                loop
                playsInline
                poster="/img/about.webp"
                aria-hidden="true"
              >
                <source src="/videos/hero-1.mp4" type="video/mp4" />
              </video>
              <div className="dummy-hero-video-overlay" />
            </div>
            <div className="dummy-hero-visual-grid" data-parallax="36" />
            <div className="dummy-hero-visual-label dummy-hero-visual-label--top" data-intro="label">
              <Command size={14} /> system / 04
            </div>
            <div className="dummy-hero-logo-pulse" aria-hidden="true">
              <video autoPlay muted loop playsInline preload="metadata" poster="/img/logo.png">
                <source src={animatedLogoVideo} type="video/mp4" />
                <source src="/videos/hero-1.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="dummy-hero-window" data-intro="window">
              <div className="dummy-window-bar">
                <div className="dummy-window-dots"><i /><i /><i /></div>
                <span>pixiekat system / command center</span>
                <span className="dummy-window-live">live</span>
              </div>
              <div className="dummy-window-content">
                <div className="dummy-window-intro">
                  <span>Tuesday, 09:41</span>
                  <strong>Good morning, team.</strong>
                </div>
                <div className="dummy-window-summary">
                  <div>
                    <small>Momentum index</small>
                    <b>87.4</b>
                    <span className="dummy-positive">↑ 12.8%</span>
                  </div>
                  <div className="dummy-summary-sparkline"><i /><i /><i /><i /><i /><i /><i /></div>
                </div>
                <div className="dummy-window-lower">
                  <div className="dummy-window-list">
                    <span>Priority signals</span>
                    <div><i className="dummy-list-icon dummy-list-icon--lime" />Launch readiness <b>94%</b></div>
                    <div><i className="dummy-list-icon dummy-list-icon--blue" />Customer health <b>88%</b></div>
                    <div><i className="dummy-list-icon dummy-list-icon--orange" />Team capacity <b>76%</b></div>
                  </div>
                  <div className="dummy-window-ring"><span>4.8</span><small>signal</small></div>
                </div>
              </div>
            </div>
            <div className="dummy-hero-float dummy-hero-float--top" data-intro="float">
              <Sparkles size={15} />
              <span>Make room<br /><b>for better.</b></span>
            </div>
            <div className="dummy-hero-float dummy-hero-float--bottom" data-intro="float">
              <span className="dummy-float-arrow"><ArrowUpRight size={14} /></span>
              <span><b>38%</b><small>faster decisions</small></span>
            </div>
            <div className="dummy-hero-visual-label dummy-hero-visual-label--bottom" data-intro="label">01 — 04</div>
          </div>
        </div>
        <div className="dummy-hero-scroll">Scroll to explore <span /></div>
      </section>

      <section className="dummy-signal-strip">
        <div className="dummy-container dummy-signal-inner" data-reveal="clip">
          <span className="dummy-signal-label">Built for teams who are</span>
          <div className="dummy-signal-words">
            <span>curious</span>
            <span>restless</span>
            <span>kind</span>
            <span>all in</span>
          </div>
          <span className="dummy-signal-mark">✳</span>
        </div>
      </section>

      <section id="services" className="dummy-light-section dummy-services-section">
        <div className="dummy-container">
          <div className="dummy-section-heading-row" data-reveal="clip">
            <div>
              <SectionKicker>What we do / 01</SectionKicker>
              <h2 className="dummy-display-heading">
                The difficult parts,
                <br />
                <em>made clearer.</em>
              </h2>
            </div>
            <p className="dummy-section-intro">
              We sit where strategy meets execution. That means fewer handoffs,
              sharper decisions, and software that earns its place in the world.
            </p>
          </div>

          <div className="dummy-services-grid" data-reveal-group>
            {serviceItems.map((service) => {
              const Icon = service.icon;
              return (
                <article className="dummy-service-card" key={service.number} data-reveal-item>
                  <div className="dummy-service-card-top">
                    <span>{service.number}</span>
                    <Icon size={22} strokeWidth={1.5} />
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <div className="dummy-tag-list">
                    {service.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="dummy-dark-section dummy-approach-section">
        <div className="dummy-container dummy-approach-layout">
          <div className="dummy-approach-statement" data-reveal="clip">
            <SectionKicker light>Our point of view / 02</SectionKicker>
            <h2>
              Most product problems are
              <span> alignment problems </span>
              in disguise.
            </h2>
            <p>
              We bring the people, product thinking, and technical depth into
              the same room early. The result is less theatre, more traction.
            </p>
            <ArrowLink to="/contact" light>Meet your next partner</ArrowLink>
          </div>
          <div className="dummy-principles-list" data-reveal-group>
            {[
              ["01", "Start with the signal", "Before we build anything, we find the useful truth hiding in the noise."],
              ["02", "Make it tangible", "A working prototype is usually a better conversation than another meeting."],
              ["03", "Leave it stronger", "We build the capability around the product, not dependence on the studio."],
            ].map(([number, title, description]) => (
              <div className="dummy-principle" key={number} data-reveal-item>
                <span>{number}</span>
                <div><h3>{title}</h3><p>{description}</p></div>
                <ArrowUpRight size={17} />
              </div>
            ))}
          </div>
        </div>
        <div className="dummy-container dummy-eyes-feature">
          <div className="dummy-eyes-feature-copy" data-reveal="clip">
            <span>03 / perspective</span>
            <h3>Make work worth watching.</h3>
            <p>Attention is a design material too. We use motion to make the important parts impossible to miss.</p>
          </div>
          <div className="dummy-eyes-video" data-reveal="clip">
            <video autoPlay muted loop playsInline preload="metadata" poster="/img/contact-2.webp" aria-hidden="true">
              <source src={eyesVideo} type="video/mp4" />
              <source src="/videos/feature-3.mp4" type="video/mp4" />
            </video>
            <div className="dummy-eyes-video-overlay" />
            <span>signal / human / attention</span>
          </div>
        </div>
      </section>

      <section id="work" className="dummy-light-section dummy-work-preview-section">
        <div className="dummy-container">
          <div className="dummy-section-heading-row dummy-section-heading-row--work" data-reveal="clip">
            <div>
              <SectionKicker>Selected work / 03</SectionKicker>
              <h2 className="dummy-display-heading">
                Useful things,
                <br />
                <em>beautifully built.</em>
              </h2>
            </div>
            <ArrowLink to="/works">View all work</ArrowLink>
          </div>
          <div className="dummy-home-work-grid" data-reveal-group>
            <WorkCard work={workItems[0]} featured />
            <WorkCard work={workItems[1]} />
          </div>
        </div>
      </section>

      <section className="dummy-stats-section">
        <div className="dummy-container dummy-stats-layout" data-reveal-group>
          <div className="dummy-stats-lead" data-reveal-item>
            <Globe2 size={24} strokeWidth={1.4} />
            <span>Small enough to care.<br />Experienced enough to deliver.</span>
          </div>
          <div className="dummy-stat" data-reveal-item><strong data-count="42">42</strong><span>products shipped</span></div>
          <div className="dummy-stat" data-reveal-item><strong data-count="8" data-pad="2">08</strong><span>countries reached</span></div>
          <div className="dummy-stat" data-reveal-item><strong data-count="11">11<span>yr</span></strong><span>of making things</span></div>
        </div>
      </section>

      <section className="dummy-home-cta">
        <div className="dummy-container dummy-home-cta-inner" data-reveal="clip">
          <div>
            <SectionKicker>What&apos;s next / 04</SectionKicker>
            <h2>
              Bring us the
              <br />
              thing you can&apos;t
              <br />
              quite <em>name.</em>
            </h2>
          </div>
          <ArrowLink to="/contact">Tell us about it</ArrowLink>
        </div>
      </section>
    </main>
  );
}

function PageIntro({ eyebrow, title, description }) {
  return (
    <section className="dummy-page-intro">
      <div className="dummy-container">
        <SectionKicker light>{eyebrow}</SectionKicker>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
    </section>
  );
}

function WorksPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const filters = ["All", "Framer", "Brand", "Campaign", "Interior", "Studio"];
  const visibleWorks = workItems.filter((work) => {
    if (activeFilter === "All") return true;
    const searchableText = `${work.category} ${work.title} ${work.description} ${work.tags.join(" ")}`.toLowerCase();
    return searchableText.includes(activeFilter.toLowerCase());
  });

  return (
    <main className="dummy-works-page">
      <PageIntro
        eyebrow="Selected work / 2020—26"
        title={<>WORK.<br /><em>made useful.</em></>}
        description="A few collaborations with people who were willing to question the obvious and build the useful."
      />
      <section className="dummy-light-section dummy-works-list-section">
        <div className="dummy-container">
          <div className="dummy-work-filters" role="tablist" aria-label="Filter projects">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                role="tab"
                aria-selected={activeFilter === filter}
                className={`dummy-work-filter ${activeFilter === filter ? "dummy-work-filter--active" : ""}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="dummy-works-grid" data-reveal-group>
            {visibleWorks.map((work, index) => <WorkCard key={work.client} work={work} featured={index === 0} />)}
          </div>
          <div className="dummy-works-bottom-note">
            <span className="dummy-kicker-line" />
            <p>
              Every project starts with a conversation, not a proposal. If the work
              above feels familiar, <Link to="/contact">we should talk.</Link>
            </p>
            <ArrowUpRight size={18} />
          </div>
        </div>
      </section>
    </main>
  );
}

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="dummy-contact-page">
      <PageIntro
        eyebrow="Start a conversation"
        title={<>Tell us what you&apos;re<br /><em>thinking about.</em></>}
        description="You do not need a polished brief. A rough idea, a stubborn problem, or a question is enough to begin."
      />
      <section className="dummy-light-section dummy-contact-section">
        <div className="dummy-container dummy-contact-layout" data-reveal="clip">
          <aside className="dummy-contact-aside">
            <div className="dummy-contact-detail">
              <span className="dummy-footer-label">Email</span>
              <a href="mailto:hello@pixiekat.com">hello@pixiekat.com</a>
            </div>
            <div className="dummy-contact-detail">
              <span className="dummy-footer-label">Based in</span>
              <span>Brooklyn &amp; London<br />Working everywhere</span>
            </div>
            <div className="dummy-contact-detail">
              <span className="dummy-footer-label">Availability</span>
              <span className="dummy-availability"><i />Taking on select Q4 projects</span>
            </div>
            <div className="dummy-contact-aside-mark"><Command size={26} strokeWidth={1.2} /><span>Make it useful.<br />Make it last.</span></div>
          </aside>

          <div className="dummy-form-wrap">
            {submitted ? (
              <div className="dummy-form-success">
                <div className="dummy-success-icon"><Check size={23} /></div>
                <SectionKicker>Message received</SectionKicker>
                <h2>That&apos;s a good start.</h2>
                <p>
                  Thanks for reaching out. This demo form is not connected to a
                  mailbox yet, but your message flow is ready for a real endpoint.
                </p>
                <button type="button" className="dummy-outline-button" onClick={() => setSubmitted(false)}>
                  Send another message <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <form className="dummy-contact-form" onSubmit={handleSubmit}>
                <div className="dummy-form-heading">
                  <span>01 / 03</span>
                  <h2>Let&apos;s get into it.</h2>
                </div>
                <div className="dummy-form-row">
                  <label>
                    <span>Your name</span>
                    <input type="text" name="name" placeholder="Ada Lovelace" required />
                  </label>
                  <label>
                    <span>Email address</span>
                    <input type="email" name="email" placeholder="ada@company.com" required />
                  </label>
                </div>
                <div className="dummy-form-row">
                  <label>
                    <span>Company</span>
                    <input type="text" name="company" placeholder="The next big thing" />
                  </label>
                  <label>
                    <span>What do you need?</span>
                    <select name="need" defaultValue="" required>
                      <option value="" disabled>Select one</option>
                      <option>Product strategy</option>
                      <option>Design &amp; prototyping</option>
                      <option>Software engineering</option>
                      <option>Something else</option>
                    </select>
                  </label>
                </div>
                <label>
                  <span>Tell us a little more</span>
                  <textarea name="message" rows="5" placeholder="The short version is..." required />
                </label>
                <div className="dummy-form-submit-row">
                  <span>We usually reply within two business days.</span>
                  <button type="submit" className="dummy-primary-button">
                    Send inquiry <Send size={16} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function LegalPage({ type }) {
  const page = legalPages[type];

  return (
    <main className="dummy-legal-page">
      <PageIntro
        eyebrow={page.eyebrow}
        title={page.title}
        description="Effective August 24, 2026 · Draft policy for the temporary PixieKat System website"
      />
      <section className="dummy-light-section dummy-legal-section">
        <div className="dummy-container dummy-legal-layout" data-reveal="clip">
          <aside className="dummy-legal-aside">
            <span>On this page</span>
            {page.sections.map(([heading]) => <a key={heading} href={`#${heading.toLowerCase().replaceAll(" ", "-")}`}>{heading}</a>)}
          </aside>
          <article className="dummy-legal-content">
            <p className="dummy-legal-intro">{page.intro}</p>
            {page.sections.map(([heading, body], index) => (
              <section key={heading} id={heading.toLowerCase().replaceAll(" ", "-")}>
                <span className="dummy-legal-number">{String(index + 1).padStart(2, "0")}</span>
                <div><h2>{heading}</h2><p>{body}</p></div>
              </section>
            ))}
            <div className="dummy-legal-contact">
              Questions about this policy? <a href="mailto:hello@pixiekat.com">hello@pixiekat.com</a>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

function DummySite() {
  const siteRef = useRef(null);
  const location = useLocation();

  useDummyAnimations(siteRef, location.pathname);

  return (
    <div className="dummy-site" ref={siteRef}>
      <SiteNav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/works" element={<WorksPage />} />
        <Route path="/work" element={<WorksPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/contact-us" element={<ContactPage />} />
        <Route path="/terms" element={<LegalPage type="terms" />} />
        <Route path="/terms-and-conditions" element={<LegalPage type="terms" />} />
        <Route path="/refund-policy" element={<LegalPage type="refund" />} />
        <Route path="/privacy-policy" element={<LegalPage type="privacy" />} />
        <Route path="/privacy" element={<LegalPage type="privacy" />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
      <SiteFooter />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <RouteEffects />
      <DummySite />
    </BrowserRouter>
  );
}

export default App;
