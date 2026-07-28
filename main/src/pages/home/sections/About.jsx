import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { useEffect, useState } from "react";
import AnimatedTitle from "../../../components/common/AnimatedTitle";
import { supabase } from "../../../lib/supabase";

gsap.registerPlugin(ScrollTrigger);

const defaultCopy = {
  welcome_text: "Welcome to Pixiekat",
  title_html: "T<b>o</b>p up your <br /> fav<b>o</b>rite games",
  subtext_line1: "Fast credits, instant delivery — game more, wait less",
  subtext_line2:
    "Pixiekat brings you the quickest way to top up diamonds, coins, and credits across all your favorite mobile and PC titles",
  image_url: "/img/about.webp",
  image_alt: "Background",
};

/** Read only copy + image URL from about_settings. Never touch animation/layout fields. */
function pickCopy(raw) {
  if (!raw || typeof raw !== "object") return defaultCopy;

  const nestedImage = raw.image && typeof raw.image === "object" ? raw.image : {};
  const imageUrl =
    (typeof nestedImage.url === "string" && nestedImage.url) ||
    (typeof raw.image_url === "string" && raw.image_url) ||
    defaultCopy.image_url;
  const imageAlt =
    (typeof nestedImage.alt === "string" && nestedImage.alt) ||
    (typeof raw.image_alt === "string" && raw.image_alt) ||
    defaultCopy.image_alt;

  return {
    welcome_text:
      typeof raw.welcome_text === "string" && raw.welcome_text
        ? raw.welcome_text
        : defaultCopy.welcome_text,
    title_html:
      typeof raw.title_html === "string" && raw.title_html
        ? raw.title_html
        : defaultCopy.title_html,
    subtext_line1:
      typeof raw.subtext_line1 === "string" && raw.subtext_line1
        ? raw.subtext_line1
        : defaultCopy.subtext_line1,
    subtext_line2:
      typeof raw.subtext_line2 === "string" && raw.subtext_line2
        ? raw.subtext_line2
        : defaultCopy.subtext_line2,
    image_url: imageUrl,
    image_alt: imageAlt,
  };
}

const About = () => {
  const [copy, setCopy] = useState(defaultCopy);

  useEffect(() => {
    supabase
      .from("store_settings")
      .select("about_settings")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.about_settings && Object.keys(data.about_settings).length > 0) {
          setCopy(pickCopy(data.about_settings));
        }
      });
  }, []);

  // Pristine clip animation — no settings deps, no layout overrides
  useGSAP(() => {
    const clipAnimation = gsap.timeline({
      scrollTrigger: {
        trigger: "#clip",
        start: "center center",
        end: "+=800 center",
        scrub: 0.5,
        pin: true,
        pinSpacing: true,
      },
    });

    clipAnimation.to(".mask-clip-path", {
      width: "100vw",
      height: "100vh",
      borderRadius: 0,
    });
  });

  return (
    <div id="about" className="min-h-screen w-screen">
      <div className="relative mb-8 mt-36 flex flex-col items-center gap-5">
        <h2 className="font-general text-sm uppercase md:text-[10px]">
          {copy.welcome_text}
        </h2>

        <AnimatedTitle
          title={copy.title_html}
          containerClass="mt-5 !text-black text-center"
        />

        <div className="about-subtext">
          <p>{copy.subtext_line1}</p>
          <p>{copy.subtext_line2}</p>
        </div>
      </div>
      <div className="h-dvh w-screen" id="clip">
        <div className="mask-clip-path about-image">
          <img
            src={copy.image_url}
            alt={copy.image_alt}
            className="absolute left-0 top-0 size-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default About;
