import { useNavigate } from "react-router-dom";

import { publicMediaUrl } from "../../../lib/supabase";
import { usePromoSection } from "../../../hooks/usePromoSection";
import { useJjkCheaperPlacement } from "../../../hooks/useJjkCheaperPlacement";

const fallbackExclusiveOffers = [
  {
    title: "Mobile Legend Bang Bang",
    image: publicMediaUrl("/img/hero/game-mlbb-card.webp"),
  },
  {
    title: "PUBG Mobile Top Up",
    image: publicMediaUrl("/img/hero/game-pubg-card.webp"),
  },
  {
    title: "Genshin Impact Genesis Crystals",
    image: publicMediaUrl("/img/hero/game-genshin-card.webp"),
    flag: "🇮🇳",
  },
  {
    title: "Honor of Kings Tokens",
    image: publicMediaUrl("/img/games/honor-of-kings.jpg"),
  },
  {
    title: "Mobile Legends Diamonds",
    image: publicMediaUrl("/img/games/mobile-legends.webp"),
  },
  {
    title: "MLBB Leomord Special Pack",
    image: publicMediaUrl("/img/promotion/leomord.webp"),
  },
  {
    title: "Magic Chess: Go Go Bundle",
    image: publicMediaUrl("/img/promotion/eternal.webp"),
  },
  {
    title: "Starlight Pass Top Up",
    image: publicMediaUrl("/img/promotion/starlight.webp"),
  },
  {
    title: "Jinx Champion Bundle",
    image: publicMediaUrl("/img/hero/Jinx.webp"),
  },
  {
    title: "Faze Clan Promo Pack",
    image: publicMediaUrl("/img/hero/Faze.webp"),
  },
  {
    title: "Melissa Character Pack",
    image: publicMediaUrl("/img/hero/melissa.webp"),
  },
  {
    title: "Hero Special Top Up",
    image: publicMediaUrl("/img/hero/game-hero-card.gif"),
  },
  {
    title: "Battle Arena Premium Pack",
    image: publicMediaUrl("/img/loading/1.jpg"),
  },
  {
    title: "Dragon Quest Crystals",
    image: publicMediaUrl("/img/loading/2.jpg"),
  },
  {
    title: "Fantasy Realm Credits",
    image: publicMediaUrl("/img/loading/3.jpg"),
  },
  {
    title: "Shadow Warriors Bundle",
    image: publicMediaUrl("/img/loading/4.jpg"),
  },
  {
    title: "Cyber Strike Coin Pack",
    image: publicMediaUrl("/img/loading/6.jpg"),
  },
  {
    title: "Valor Points Top Up",
    image: publicMediaUrl("/img/loading/7.jpg"),
  },
];

const ExclusiveOfferCard = ({ title, image, flag, link }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(link ?? "/games")}
      className="group relative cursor-pointer overflow-hidden rounded-xl"
      style={{ aspectRatio: "15 / 16" }}
    >
      <img
        src={image}
        alt={title}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      <span className="absolute left-2 top-2 rounded-full bg-lime-400 px-2 py-0.5 font-general text-[10px] font-bold uppercase tracking-wide text-black">
        Promo
      </span>

      {flag && (
        <span className="absolute right-2 top-2 text-sm leading-none">{flag}</span>
      )}

      <p className="absolute bottom-2 left-2 right-2 line-clamp-2 font-general text-[11px] font-semibold leading-snug text-white">
        {title}
      </p>
    </div>
  );
};

const ExclusiveOffers = () => {
  const { items: promoItems } = usePromoSection("exclusive_offers");
  const jjkPromo = useJjkCheaperPlacement("homepage_banner");

  const exclusiveOffers =
    promoItems.length > 0
      ? promoItems.map((item) => ({
          title: item.title,
          image: item.image_url || publicMediaUrl("/img/games/mobile-legends.webp"),
          flag: item.flag ?? undefined,
          link: item.link_url || (item.game_id ? `/games/${item.game_id}` : "/games"),
        }))
      : fallbackExclusiveOffers;

  const offers = jjkPromo ? [jjkPromo, ...exclusiveOffers] : exclusiveOffers;

  return (
    <section className="bg-[#dfdff0] px-2 py-12 md:px-8 md:py-16">
      <div className="mb-6">
        <h2
          className="text-2xl font-bold uppercase text-black md:text-3xl"
          style={{ fontFamily: "zentry, sans-serif" }}
        >
          Exclusive Offers
        </h2>
        <p className="mt-1 font-general text-sm text-lime-600">
          Limited time deals on featured products — grab them before they&apos;re gone!
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-6 md:gap-4">
        {offers.map((offer) => (
          <ExclusiveOfferCard key={`${offer.title}-${offer.link || ""}`} {...offer} />
        ))}
      </div>
    </section>
  );
};

export default ExclusiveOffers;
