import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/all";

import AnimatedTitle from "../../../components/common/AnimatedTitle";

gsap.registerPlugin(ScrollTrigger);

const About = () => {
  useGSAP(() => {
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
  });

  return (
    <div id="about" className="min-h-screen w-screen">
      <div className="relative mb-8 mt-36 flex flex-col items-center gap-5">
        <p className="font-general text-sm uppercase md:text-[10px]">
          Welcome to Pixiekat
        </p>

        <AnimatedTitle
          title="T<b>o</b>p up your <br /> fav<b>o</b>rite games"
          containerClass="mt-5 !text-black text-center"
        />

        <div className="about-subtext">
          <p>Fast credits, instant delivery — game more, wait less</p>
          <p className="text-gray-500">
            Pixiekat brings you the quickest way to top up diamonds, coins, and
            credits across all your favorite mobile and PC titles
          </p>
        </div>
      </div>

      <div className="h-dvh w-screen" id="clip">
        <div className="mask-clip-path about-image">
          <img
            src="img/about.webp"
            alt="Background"
            className="absolute left-0 top-0 size-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default About;
