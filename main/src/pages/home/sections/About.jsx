import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/all";
import { useState, useEffect } from "react";

import AnimatedTitle from "../../../components/common/AnimatedTitle";
import { supabase } from "../../../lib/supabase";

gsap.registerPlugin(ScrollTrigger);

const defaultAboutSettings = {
  welcome_text: "Welcome to Pixiekat",
  title_html: "T<b>o</b>p up your <br /> fav<b>o</b>rite games",
  subtext_line1: "Fast credits, instant delivery — game more, wait less",
  subtext_line2:
    "Pixiekat brings you the quickest way to top up diamonds, coins, and credits across all your favorite mobile and PC titles",
  image_url: "/img/about.webp",
  image_alt: "Background",
  bg_color: "",
  text_color: "#000000",
  subtext_color: "#6b7280",
  welcome_text_color: "",
  image_object_fit: "cover",
  image_border_radius: "0",
  section_min_height: "100vh",
  clip_animation_enabled: true,
};

const About = () => {
  const [settings, setSettings] = useState(defaultAboutSettings);

  useEffect(() => {
    supabase
      .from("store_settings")
      .select("about_settings")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.about_settings && Object.keys(data.about_settings).length > 0) {
          setSettings((prev) => ({ ...prev, ...data.about_settings }));
        }
      });
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
          style={{ color: settings.welcome_text_color || undefined }}
        >
          {settings.welcome_text}
        </p>

        <AnimatedTitle
          title={settings.title_html}
          containerClass="mt-5 !text-black text-center"
        />

        <div className="about-subtext">
          <p style={{ color: settings.text_color || undefined }}>
            {settings.subtext_line1}
          </p>
          <p style={{ color: settings.subtext_color || "#6b7280" }}>
            {settings.subtext_line2}
          </p>
        </div>
      </div>

      <div className="h-dvh w-screen" id="clip">
        <div className="mask-clip-path about-image">
          <img
            src={settings.image_url}
            alt={settings.image_alt}
            className="absolute left-0 top-0 size-full"
            style={{
              objectFit: settings.image_object_fit || "cover",
              borderRadius: settings.image_border_radius || "0",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default About;
