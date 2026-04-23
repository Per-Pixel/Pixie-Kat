import { FaLinkedinIn, FaFacebookF, FaTwitter } from "react-icons/fa";
import { HiArrowUpRight } from "react-icons/hi2";
import MouseGlow from "../common/MouseGlow";

const footerNavLinks = [
  { label: "How It Works", href: "/how-it-works" },
  { label: "Games", href: "/games" },
  { label: "Pricing", href: "/pricing" },
  { label: "Support", href: "/support" },
];

const socialLinks = [
  { href: "https://linkedin.com", icon: <FaLinkedinIn />, label: "LinkedIn" },
  { href: "https://facebook.com", icon: <FaFacebookF />, label: "Facebook" },
  { href: "https://twitter.com", icon: <FaTwitter />, label: "Twitter" },
];

const Footer = () => {
  return (
    <footer className="footer-wrapper">
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
            <span>Get In Touch</span>
          </div>

          <h2 className="footer-cta-heading">
            <span className="footer-cta-heading-bold">
              Ready to level up your game?
            </span>{" "}
            <span className="footer-cta-heading-light">
              Top up your favorite titles instantly or explore our premium membership plans.
            </span>
          </h2>
        </div>

        {/* Divider row: contact + nav */}
        <div className="footer-divider-row">
          <div className="footer-contact">
            <span className="footer-contact-label">Reach us at:</span>
            <a href="mailto:support@pixiekatstore.com" className="footer-contact-email">
              support@pixiekatstore.com
              <HiArrowUpRight className="footer-contact-arrow" />
            </a>
          </div>

          <nav className="footer-nav">
            {footerNavLinks.map((link) => (
              <a key={link.label} href={link.href} className="footer-nav-link">
                {link.label}
              </a>
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
          <span className="footer-brand-name">pixie kat store</span>
        </div>

        {/* Static ambient glow at the bottom */}
        <div className="footer-glow" />
      </MouseGlow>

      {/* ——— Bottom bar ——— */}
      <div className="footer-bottom">
        <p className="footer-copyright">
          © {new Date().getFullYear()} Pixie Kat Store. All rights reserved.
        </p>

        <div className="footer-socials">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-link"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
