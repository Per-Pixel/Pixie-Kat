import gsap from "gsap";
import { useRef } from "react";

import AnimatedTitle from "../../../components/common/AnimatedTitle";

const promotions = [
  {
    title: "MLBB Festive TopUp Rewards: Earn 5% Coda Reward",
    description:
      "Celebrate this festive season by topping up MLBB Diamonds with GCash on Codashop and earn 5% Coda Rewards.",
    details:
      "How to earn? Make a minimum purchase of 70 Diamonds and pay with GCash to enjoy extra rewards for your next top up.",
    image: "/img/hero/melissa.webp",
    discount: "5%",
  },
  {
    title: "2x Recharge Bonus is Back + 10% Coda Rewards!",
    description:
      "Great news, Commanders. The 2x Recharge Bonus in Magic Chess: Go Go has been reset.",
    details:
      "Even if you bought it before, you can buy it again now. Enjoy double Diamonds on eligible first recharge bundles and extra 10% rewards.",
    image: "/img/hero/Jinx.webp",
    discount: "10%",
  },
  {
    title: "Limited Faze Offer: Bonus Rewards on Every Top Up",
    description:
      "Power up faster with bonus value and unlock more in-game rewards while the promotion lasts.",
    details:
      "Top up during the active period to receive bonus credits and seasonal perks. Limited-time offer, terms and conditions apply.",
    image: "/img/hero/Faze.webp",
    discount: "15%",
  },
];

const PromotionCard = ({ title, description, details, image, discount }) => (
  <article
    className="overflow-hidden rounded-2xl bg-white"
    style={{ borderColor: "black", borderWidth: "3px", borderStyle: "solid" }}
  >
    <div className="relative">
      <img
        src={image}
        alt={title}
        className="h-48 w-full object-cover object-center md:h-52"
        loading="lazy"
        decoding="async"
      />
      <span className="absolute right-0 top-0 rounded-bl-xl bg-lime-300 px-3 py-1 font-general text-sm font-semibold text-black">
        {discount}
      </span>
    </div>

    <div className="space-y-4 p-5 text-black">
      <h3 className="font-general text-xl font-semibold leading-snug">{title}</h3>
      <p className="font-circular-web text-base leading-relaxed">{description}</p>
      <p className="font-circular-web text-base leading-relaxed text-black/80">
        {details}
      </p>
    </div>
  </article>
);

const Promotion = () => {
  const promoFrameRef = useRef(null);

  const handlePromoMouseMove = (event) => {
    const { clientX, clientY } = event;
    const element = promoFrameRef.current;

    if (!element) return;

    const rect = element.getBoundingClientRect();
    const xPos = clientX - rect.left;
    const yPos = clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((yPos - centerY) / centerY) * -10;
    const rotateY = ((xPos - centerX) / centerX) * 10;

    gsap.to(element, {
      duration: 0.3,
      rotateX,
      rotateY,
      transformPerspective: 500,
      ease: "power1.inOut",
    });
  };

  const handlePromoMouseLeave = () => {
    const element = promoFrameRef.current;

    if (!element) return;

    gsap.to(element, {
      duration: 0.3,
      rotateX: 0,
      rotateY: 0,
      ease: "power1.inOut",
    });
  };

  return (
    <section className="bg-[#dfdff0] px-4 pb-44 pt-16 md:px-10 md:pb-56 md:pt-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between gap-4 md:mb-10">
          <AnimatedTitle
            title="pr<b>o</b>moti<b>o</b>ns"
            textColor="#000000"
            containerClass="!mt-0 !items-start !gap-0 !px-0 !text-left !text-4xl !leading-[0.9] md:!text-6xl"
          />
          <p className="max-w-sm text-right font-circular-web text-sm text-black/70 md:text-base">
            Limited-time offers and bonus rewards for your next top up.
          </p>
        </div>

        <div
          onMouseMove={handlePromoMouseMove}
          onMouseLeave={handlePromoMouseLeave}
          onMouseUp={handlePromoMouseLeave}
          onMouseEnter={handlePromoMouseLeave}
          className="relative overflow-visible rounded-3xl p-4 md:p-8"
        >
          <div
            ref={promoFrameRef}
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{
              backgroundImage: "url('/img/hero/promotion-art.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />

          <div className="relative z-10 grid translate-y-20 grid-cols-1 gap-6 sm:translate-y-24 sm:grid-cols-2 lg:translate-y-28 lg:grid-cols-3">
            {promotions.map((promotion) => (
              <PromotionCard key={promotion.title} {...promotion} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Promotion;
