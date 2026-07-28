import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/all";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import AnimatedTitle from "../../../components/common/AnimatedTitle";
import { supabase } from "../../../lib/supabase";

gsap.registerPlugin(ScrollTrigger);

const defaultTransform = () => ({
  scale: 100,
  rotate: 0,
  x: 0,
  y: 0,
  pos_left: "50%",
  pos_top: "50%",
});

const defaultAboutSettings = {
  welcome_text: "Welcome to Pixiekat",
  title_html: "T<b>o</b>p up your <br /> fav<b>o</b>rite games",
  subtext_line1: "Fast credits, instant delivery — game more, wait less",
  subtext_line2:
    "Pixiekat brings you the quickest way to top up diamonds, coins, and credits across all your favorite mobile and PC titles",
  button_text: "",
  button_link: "/about",
  image: {
    url: "/img/about.webp",
    alt: "Background",
    desktop: defaultTransform(),
    tablet: defaultTransform(),
    mobile: defaultTransform(),
  },
  bg_color: "",
  text_color: "#000000",
  subtext_color: "#6b7280",
  welcome_text_color: "",
  welcome_font_size: "",
  title_font_size: "",
  subtext_font_size: "",
  image_object_fit: "cover",
  image_border_radius: "0",
  section_min_height: "100vh",
  clip_animation_enabled: true,
};

function mergeTransform(raw) {
  return { ...defaultTransform(), ...(raw ?? {}) };
}

/** Merge DB payload including legacy flat image_url / image_alt. */
function mergeAboutSettings(raw) {
  if (!raw || typeof raw !== "object") return defaultAboutSettings;

  const legacyUrl = typeof raw.image_url === "string" ? raw.image_url : undefined;
  const legacyAlt = typeof raw.image_alt === "string" ? raw.image_alt : undefined;
  const rawImage = raw.image && typeof raw.image === "object" ? raw.image : {};

  const image = {
    url: (typeof rawImage.url === "string" && rawImage.url) || legacyUrl || defaultAboutSettings.image.url,
    alt: (typeof rawImage.alt === "string" && rawImage.alt) || legacyAlt || defaultAboutSettings.image.alt,
    desktop: mergeTransform(rawImage.desktop),
    tablet: mergeTransform(rawImage.tablet),
    mobile: mergeTransform(rawImage.mobile),
  };

  const { image_url: _iu, image_alt: _ia, image: _img, ...rest } = raw;

  return {
    ...defaultAboutSettings,
    ...rest,
    image,
  };
}

function pickDevice(width) {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

const About = () => {
  const [settings, setSettings] = useState(defaultAboutSettings);
  const [device, setDevice] = useState(() =>
    typeof window !== "undefined" ? pickDevice(window.innerWidth) : "desktop"
  );

  useEffect(() => {
    supabase
      .from("store_settings")
      .select("about_settings")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.about_settings && Object.keys(data.about_settings).length > 0) {
          setSettings(mergeAboutSettings(data.about_settings));
        }
      });
  }, []);

  useEffect(() => {
    const onResize = () => setDevice(pickDevice(window.innerWidth));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useGSAP(() => {
    if (!settings.clip_animation_enabled) return;

    const clipAnimation = gsap.timeline({
      scrollTrigger: {
        trigger: "#clip",
        start: "center center",
        end: "+=800 center",
        scrub: 0.5,
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
      },
    });

    clipAnimation.to(".mask-clip-path", {
      width: "100vw",
      height: "100vh",
      borderRadius: 0,
    });
  }, [settings.clip_animation_enabled]);

  const tx = settings.image?.[device] ?? defaultTransform();
  const imageUrl = settings.image?.url || "/img/about.webp";
  const imageAlt = settings.image?.alt || "Background";

  return (
    <div
      id="about"
      className="w-screen"
      style={{
        minHeight: settings.section_min_height || "100vh",
        backgroundColor: settings.bg_color || undefined,
      }}
    >
      <div className="relative mb-8 mt-36 flex flex-col items-center gap-5">
        <p
          className="font-general text-sm uppercase md:text-[10px]"
          style={{
            color: settings.welcome_text_color || undefined,
            fontSize: settings.welcome_font_size || undefined,
          }}
        >
          {settings.welcome_text}
        </p>

        <div style={{ fontSize: settings.title_font_size || undefined }}>
          <AnimatedTitle
            title={settings.title_html}
            containerClass="mt-5 text-center"
            textColor={settings.text_color || undefined}
          />
        </div>

        <div
          className="about-subtext"
          style={{ fontSize: settings.subtext_font_size || undefined }}
        >
          <p style={{ color: settings.text_color || undefined }}>
            {settings.subtext_line1}
          </p>
          <p style={{ color: settings.subtext_color || "#6b7280" }}>
            {settings.subtext_line2}
          </p>
        </div>

        {settings.button_text ? (
          /^https?:\/\//i.test(settings.button_link || "") ? (
            <a
              href={settings.button_link}
              className="mt-2 rounded-full bg-black px-6 py-2.5 text-sm font-general font-semibold uppercase tracking-wide text-white transition hover:bg-gray-800"
            >
              {settings.button_text}
            </a>
          ) : (
            <Link
              to={settings.button_link || "/about"}
              className="mt-2 rounded-full bg-black px-6 py-2.5 text-sm font-general font-semibold uppercase tracking-wide text-white transition hover:bg-gray-800"
            >
              {settings.button_text}
            </Link>
          )
        ) : null}
      </div>

      <div className="h-dvh w-screen" id="clip">
        <div className="mask-clip-path about-image">
          <img
            src={imageUrl}
            alt={imageAlt}
            className="absolute"
            style={{
              left: tx.pos_left,
              top: tx.pos_top,
              width: "100%",
              height: "100%",
              objectFit: settings.image_object_fit || "cover",
              borderRadius: settings.image_border_radius || "0",
              transform: `translate(-50%,-50%) scale(${tx.scale / 100}) rotate(${tx.rotate}deg) translate(${tx.x}px,${tx.y}px)`,
              willChange: "transform",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default About;
