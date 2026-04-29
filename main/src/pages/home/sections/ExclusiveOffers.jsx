import { useNavigate } from "react-router-dom";

const exclusiveOffers = [
  {
    title: "Mobile Legend Bang Bang",
    image: "/img/hero/game-mlbb-card.webp",
  },
  {
    title: "PUBG Mobile Top Up",
    image: "/img/hero/game-pubg-card.webp",
  },
  {
    title: "Genshin Impact Genesis Crystals",
    image: "/img/hero/game-genshin-card.webp",
    flag: "🇮🇳",
  },
  {
    title: "Honor of Kings Tokens",
    image: "/img/games/honor-of-kings.jpg",
  },
  {
    title: "Mobile Legends Diamonds",
    image: "/img/games/mobile-legends.webp",
  },
  {
    title: "MLBB Leomord Special Pack",
    image: "/img/promotion/leomord.webp",
  },
  {
    title: "Magic Chess: Go Go Bundle",
    image: "/img/promotion/eternal.webp",
  },
  {
    title: "Starlight Pass Top Up",
    image: "/img/promotion/starlight.webp",
  },
  {
    title: "Jinx Champion Bundle",
    image: "/img/hero/Jinx.webp",
  },
  {
    title: "Faze Clan Promo Pack",
    image: "/img/hero/Faze.webp",
  },
  {
    title: "Melissa Character Pack",
    image: "/img/hero/melissa.webp",
  },
  {
    title: "Hero Special Top Up",
    image: "/img/hero/game-hero-card.gif",
  },
  {
    title: "Battle Arena Premium Pack",
    image: "/img/loading/1.jpg",
  },
  {
    title: "Dragon Quest Crystals",
    image: "/img/loading/2.jpg",
  },
  {
    title: "Fantasy Realm Credits",
    image: "/img/loading/3.jpg",
  },
  {
    title: "Shadow Warriors Bundle",
    image: "/img/loading/4.jpg",
  },
  {
    title: "Cyber Strike Coin Pack",
    image: "/img/loading/6.jpg",
  },
  {
    title: "Valor Points Top Up",
    image: "/img/loading/7.jpg",
  },
];

const ExclusiveOfferCard = ({ title, image, flag }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate("/games")}
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

const ExclusiveOffers = () => (
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
      {exclusiveOffers.map((offer) => (
        <ExclusiveOfferCard key={offer.title} {...offer} />
      ))}
    </div>
  </section>
);

export default ExclusiveOffers;
