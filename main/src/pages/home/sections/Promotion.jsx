import gsap from "gsap";
import { useRef, useState } from "react";

import AnimatedTitle from "../../../components/common/AnimatedTitle";
import { BentoTilt } from "./Features";

const promotions = [
  {
    title: "MLBB Festive TopUp Rewards: Earn 5% Coda Reward",
    description:
      "Celebrate this festive season by topping up MLBB Diamonds with GCash on Codashop and earn 5% Coda Rewards.",
    details:
      "How to earn? Make a minimum purchase of 70 Diamonds and pay with GCash to enjoy extra rewards for your next top up.",
    image: "/img/promotion/leomord.webp",
    discount: "5%",
  },
  {
    title: "2x Recharge Bonus is Back + 10% Coda Rewards!",
    description:
      "Great news, Commanders. The 2x Recharge Bonus in Magic Chess: Go Go has been reset.",
    details:
      "Even if you bought it before, you can buy it again now. Enjoy double Diamonds on eligible first recharge bundles and extra 10% rewards.",
    image: "/img/promotion/eternal.webp",
    discount: "10%",
  },
  {
    title: "Limited Faze Offer: Bonus Rewards on Every Top Up",
    description:
      "Power up faster with bonus value and unlock more in-game rewards while the promotion lasts.",
    details:
      "Top up during the active period to receive bonus credits and seasonal perks. Limited-time offer, terms and conditions apply.",
    image: "/img/promotion/starlight.webp",
    discount: "15%",
  },
];

const PromotionCard = ({
  title,
  description,
  details,
  image,
  discount,
  compact = false,
  noStroke = false,
}) => (
  <article
    className={`h-full overflow-hidden rounded-2xl bg-white ${
      noStroke ? "" : "border-[3px] border-black"
    }`}
  >
    <div className="relative">
      <img
        src={image}
        alt={title}
        className="h-44 w-full object-cover object-center sm:h-48 md:h-52"
        loading="lazy"
        decoding="async"
      />
      <span className="absolute right-0 top-0 rounded-bl-xl bg-lime-300 px-3 py-1 font-general text-sm font-semibold text-black">
        {discount}
      </span>
    </div>

    <div className="space-y-3 p-4 text-black sm:p-5">
      <h3 className="font-general text-lg font-semibold leading-snug sm:text-xl">
        {title}
      </h3>
      <p className="font-circular-web text-sm leading-relaxed sm:text-base">
        {description}
      </p>
      <p
        className={`font-circular-web text-sm leading-relaxed text-black/80 sm:text-base ${
          compact ? "hidden md:block" : ""
        }`}
      >
        {details}
      </p>
    </div>
  </article>
);

const Promotion = () => {
  const promoFrameRef = useRef(null);
  const smallCarouselRef = useRef(null);
  const [activeSmallIndex, setActiveSmallIndex] = useState(0);

  const smallPromotions = promotions;

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

  const handleSmallCarouselScroll = () => {
    const carousel = smallCarouselRef.current;
    if (!carousel) return;

    const firstCard = carousel.querySelector("[data-small-card]");
    if (!firstCard) return;

    const computed = window.getComputedStyle(carousel);
    const gap = parseFloat(computed.columnGap || computed.gap || "0");
    const step = firstCard.clientWidth + gap;
    if (step <= 0) return;

    const nextIndex = Math.round(carousel.scrollLeft / step);
    const clampedIndex = Math.max(0, Math.min(nextIndex, smallPromotions.length - 1));
    setActiveSmallIndex(clampedIndex);
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

          <div className="relative z-10 translate-y-16 sm:hidden">
            <div
              ref={smallCarouselRef}
              onScroll={handleSmallCarouselScroll}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {smallPromotions.map((promotion) => (
                <div
                  key={promotion.title}
                  data-small-card
                  className="w-[78%] shrink-0 snap-center"
                >
                  <PromotionCard {...promotion} compact noStroke />
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              {smallPromotions.map((promotion, index) => (
                <span
                  key={promotion.title}
                  className={`h-2.5 rounded-full transition-all ${
                    index === activeSmallIndex
                      ? "w-8 bg-indigo-500"
                      : "w-4 bg-black/20"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="relative z-10 hidden translate-y-16 grid-cols-2 gap-4 sm:grid sm:translate-y-20 sm:gap-6 lg:translate-y-28 lg:grid-cols-3">
            {promotions.map((promotion, index) => (
              index === 0 ? (
                <BentoTilt
                  key={promotion.title}
                  className="col-span-2 lg:col-span-1"
                >
                  <PromotionCard {...promotion} noStroke />
                </BentoTilt>
              ) : (
                <div key={promotion.title} className="col-span-1">
                  <PromotionCard {...promotion} compact noStroke />
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Promotion;
