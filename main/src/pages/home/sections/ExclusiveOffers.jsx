import { useNavigate } from "react-router-dom";

import { publicMediaUrl } from "../../../lib/supabase";
import { siteGraphicUrl } from "../../../lib/storeContent";
import { useAppearance } from "../../../contexts/AppearanceContext";
import { usePromoSection } from "../../../hooks/usePromoSection";
import { useJjkCheaperPlacement } from "../../../hooks/useJjkCheaperPlacement";

const fallbackExclusiveOffers = [
  {
    title: "Hayabusa Starlight Pass",
    image: publicMediaUrl("/img/games/starlight.jpg"),
    link: "/games/starlight",
  },
  {
    title: "Mobile Legends Diamonds",
    image: publicMediaUrl("/img/games/mobile-legends.webp"),
    link: "/games/mobile-legends",
  },
  {
    title: "Honkai: Star Rail Top Up",
    image: publicMediaUrl("/img/games/honkai-star-rail.webp"),
    link: "/games/honkai-star-rail",
  },
  {
    title: "Honor of Kings Tokens",
    image: publicMediaUrl("/img/games/honor-of-kings.jpg"),
    link: "/games/honor-of-kings",
  },
  {
    title: "Magic Chess: Go Go Bundle",
    image: publicMediaUrl("/img/games/magic-chess-go-go.jpg"),
    link: "/games/magic-chess-go-go",
  },
  {
    title: "Genshin Impact Genesis Crystals",
    image: publicMediaUrl("/img/hero/game-genshin-card.webp"),
    link: "/games/genshin-impact",
  },
  {
    title: "PUBG Mobile Top Up",
    image: publicMediaUrl("/img/games/pubg-global.jpg"),
    link: "/games/pubg-global",
  },
  {
    title: "BGMI UC Top Up",
    image: publicMediaUrl("/img/games/bgmi-not-instant.webp"),
    link: "/games/bgmi",
  },
];

const ExclusiveOfferCard = ({ title, image, flag, link }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(link ?? "/games")}
      className="group relative cursor-pointer overflow-hidden rounded-xl border-[3px] border-black"
      style={{ aspectRatio: "15 / 16" }}
    >
      <img
        src={image}
        alt={title}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 size-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      <span className="absolute left-2 top-2 rounded-full bg-yellow-300 px-2 py-0.5 font-general text-[10px] font-bold uppercase tracking-wide text-black">
        Promo
      </span>

      {flag && (
        <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 font-general text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          {flag}
        </span>
      )}

      <p className="absolute inset-x-2.5 bottom-2.5 line-clamp-2 font-general text-xs font-semibold leading-snug text-white">
        {title}
      </p>
    </div>
  );
};

const ExclusiveOffers = () => {
  const { items: promoItems } = usePromoSection("exclusive_offers");
  const jjkPromo = useJjkCheaperPlacement("homepage_banner");
  const appearance = useAppearance();

  const exclusiveOffers =
    promoItems.length > 0
      ? promoItems.map((item) => ({
          title: item.title,
          image: item.image_url || publicMediaUrl("/img/games/mobile-legends.webp"),
          flag: item.flag ?? undefined,
          link: item.link_url || "/games",
        }))
      : fallbackExclusiveOffers.map((offer, index) => ({
          ...offer,
          image: siteGraphicUrl(appearance, `exclusive_fallback_${index + 1}`, offer.image),
        }));

  const offers = jjkPromo ? [jjkPromo, ...exclusiveOffers] : exclusiveOffers;

  return (
    <section className="bg-[#dfdff0] px-2 py-12 md:px-8 md:py-16">
      <div className="mb-6">
        <h2
          className="text-2xl font-bold uppercase text-black md:text-3xl"
          style={{ fontFamily: "display, sans-serif" }}
        >
          Exclusive Offers
        </h2>
        <p className="mt-1 font-general text-sm text-violet-300">
          Limited time deals on featured products — grab them before they&apos;re gone!
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:gap-4 lg:grid-cols-6">
        {offers.map((offer) => (
          <ExclusiveOfferCard key={`${offer.title}-${offer.link || ""}`} {...offer} />
        ))}
      </div>
    </section>
  );
};

export default ExclusiveOffers;
