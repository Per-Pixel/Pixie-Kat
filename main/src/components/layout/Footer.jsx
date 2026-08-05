import { FaLinkedinIn, FaFacebookF, FaTwitter } from "react-icons/fa";
import { HiArrowUpRight } from "react-icons/hi2";
import { useEffect, useRef, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import MouseGlow from "../common/MouseGlow";
import { fetchFooterSettings, DEFAULT_FOOTER } from "../../lib/storeContent";

gsap.registerPlugin(ScrollTrigger);

const socialIconMap = {
  linkedin: <FaLinkedinIn />,
  facebook: <FaFacebookF />,
  twitter: <FaTwitter />,
};

/* ─── Split text into word spans (pure render, no hooks) ─── */
const WordSpans = ({ text, className = "", wrapperClass = "footer-reveal-word-wrapper", wordClass = "footer-reveal-word" }) => {
  const words = useMemo(() => (text || "").split(" "), [text]);
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={i} className={wrapperClass}>
          <span className={wordClass}>
            {word}
            {i < words.length - 1 ? "\u00A0" : ""}
          </span>
        </span>
      ))}
    </span>
  );
};

/* ─── Split brand name into letter spans (pure render, no hooks) ─── */
const LetterSpans = ({ text }) => (
  <span className="footer-brand-name">
    {(text || "pixie kat store").split("").map((char, i) => (
      <span key={i} className="footer-brand-letter-wrapper">
        <span className="footer-brand-letter">
          {char === " " ? "\u00A0" : char}
        </span>
      </span>
    ))}
  </span>
);

const Footer = () => {
  const footerRef = useRef(null);
  const [footerData, setFooterData] = useState(DEFAULT_FOOTER);

  useEffect(() => {
    fetchFooterSettings().then((data) => {
      if (data) setFooterData(data);
    });
  }, []);

  useEffect(() => {
    const root = footerRef.current;
    if (!root) return;

    // Gather all targets once
    const label = root.querySelector(".footer-cta-label");
    const boldWords = root.querySelectorAll(".footer-cta-heading-bold .footer-reveal-word");
    const lightWords = root.querySelectorAll(".footer-cta-heading-light .footer-reveal-word");
    const contactChildren = root.querySelector(".footer-contact")?.children;
    const navLinks = root.querySelectorAll(".footer-nav-link");
    const brandLogo = root.querySelector(".footer-brand-logo");
    const brandLetters = root.querySelectorAll(".footer-brand-letter");

    // Set initial states (no scroll listener needed for this)
    gsap.set(boldWords, { yPercent: 110, opacity: 0 });
    gsap.set(lightWords, { yPercent: 110, opacity: 0 });
    gsap.set(label, { y: 30, opacity: 0 });
    if (contactChildren) gsap.set(contactChildren, { y: 20, opacity: 0 });
    gsap.set(navLinks, { y: 20, opacity: 0 });
    gsap.set(brandLogo, { scale: 0, opacity: 0, rotation: -180 });
    gsap.set(brandLetters, { yPercent: 100, opacity: 0 });

    // ONE timeline, ONE ScrollTrigger
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: root,
        start: "top 85%",
        toggleActions: "play none none reverse",
      },
      defaults: { ease: "power3.out" },
    });

    // 1. Label slide-up
    tl.to(label, { y: 0, opacity: 1, duration: 0.5 }, 0);

    // 2. Bold heading — word reveal
    tl.to(boldWords, {
      yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.05,
    }, 0.1);

    // 3. Light heading — word reveal (starts slightly after bold)
    tl.to(lightWords, {
      yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.03,
    }, 0.35);

    // 4. Contact row
    if (contactChildren) {
      tl.to(contactChildren, {
        y: 0, opacity: 1, duration: 0.5, stagger: 0.1,
      }, 0.5);
    }

    // 5. Nav links
    tl.to(navLinks, {
      y: 0, opacity: 1, duration: 0.5, stagger: 0.06,
    }, 0.55);

    // 6. Brand logo spin-in
    tl.to(brandLogo, {
      scale: 1, opacity: 1, rotation: 0, duration: 0.8, ease: "back.out(1.4)",
    }, 0.6);

    // 7. Brand letters
    tl.to(brandLetters, {
      yPercent: 0, opacity: 1, duration: 0.5, stagger: 0.025,
    }, 0.7);

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [footerData]);

  return (
    <footer ref={footerRef} className="footer-wrapper">
      {/* ——— Main dark container with mouse-tracking glow ——— */}
      <MouseGlow intensity={0.75} spotlight className="footer-main">
        {/* CTA / Contact section */}
        <div className="footer-cta">
          <div className="footer-cta-label">
            <img
              src="/img/logo4.png"
              alt="Pixie Kat"
              className="footer-cta-label-icon"
            />
            <span>{footerData.cta_label_text || "Get In Touch"}</span>
          </div>

          <h2 className="footer-cta-heading">
            <WordSpans
              text={footerData.cta_heading_bold || "Ready to level up your game?"}
              className="footer-cta-heading-bold"
            />{" "}
            <WordSpans
              text={footerData.cta_heading_light || "Top up your favorite titles instantly or explore our premium membership plans."}
              className="footer-cta-heading-light"
            />
          </h2>
        </div>

        {/* Divider row: contact + nav */}
        <div className="footer-divider-row">
          <div className="footer-contact">
            <span className="footer-contact-label">{footerData.contact_label || "Reach us at:"}</span>
            <a href={`mailto:${footerData.contact_email || "support@pixiekatstore.com"}`} className="footer-contact-email">
              {footerData.contact_email || "support@pixiekatstore.com"}
              <HiArrowUpRight className="footer-contact-arrow" />
            </a>
          </div>

          <nav className="footer-nav">
            {(footerData.nav_links || DEFAULT_FOOTER.nav_links).map((link) => (
              <Link key={link.label} to={link.href} className="footer-nav-link">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Large branding */}
        <div className="footer-brand">
          <img
            src="/img/logo4.png"
            alt="Pixie Kat Store"
            className="footer-brand-logo"
          />
          <LetterSpans text={footerData.brand_name_text || "pixie kat store"} />
        </div>

        {/* Static ambient glow at the bottom */}
        <div className="footer-glow" />
      </MouseGlow>

      {/* ——— Bottom bar ——— */}
      <div className="footer-bottom">
        <p className="footer-copyright">
          {footerData.copyright_text || `© ${new Date().getFullYear()} Pixie Kat Store. All rights reserved.`}
        </p>

        <div className="footer-socials">
          {(footerData.social_links || DEFAULT_FOOTER.social_links).map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-link"
            >
              {socialIconMap[link.icon?.toLowerCase()] || link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
