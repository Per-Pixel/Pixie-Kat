import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const trendingGames = [
  {
    title: "Black Myth Wukong",
    rating: 81,
    oldPrice: 69,
    price: 51,
    discount: 15,
    image: "/img/games/black-myth-wukong.jpg",
  },
  {
    title: "Alan Wake 2",
    rating: 86,
    oldPrice: 49,
    price: 32,
    discount: 20,
    image: "/img/games/mobile-legends.webp",
  },
  {
    title: "Mortal Combat 11",
    rating: 72,
    oldPrice: 62,
    price: 54,
    discount: 20,
    image: "/img/games/mortal-kombat-11.jpg",
  },
  {
    title: "Spider-Man 2",
    rating: 87,
    oldPrice: 59,
    price: 35,
    discount: 30,
    image: "/img/games/spider-man-2.jpg",
  },
  {
    title: "The Witcher 3",
    rating: 93,
    oldPrice: 49,
    price: 32,
    discount: 20,
    image: "/img/games/witcher-3.jpg",
  },
  {
    title: "Honor of Kings",
    rating: 89,
    oldPrice: 44,
    price: 28,
    discount: 35,
    image: "/img/games/honor-of-kings.jpg",
  },
];

const TrendingGames = () => {
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const computeActive = () => {
      const first = el.firstElementChild;
      if (!first) return;
      const itemWidth = first.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(el).columnGap || "0");
      const stride = itemWidth + gap;
      const idx = Math.max(
        0,
        Math.min(trendingGames.length - 1, Math.round(el.scrollLeft / (stride || 1)))
      );
      setActive(idx);
    };

    computeActive();
    const onScroll = () => computeActive();
    const onResize = () => computeActive();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <section className="relative isolate z-50 overflow-visible px-2 py-10 md:px-8">
      <style>{`
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; width: 0; height: 0; background: transparent; }
        .no-scrollbar::-webkit-scrollbar-thumb { background: transparent; }
        .no-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div className="relative z-0 mb-6 flex items-center justify-between">
        <h2
          className="text-2xl font-bold"
          style={{ color: "#111", fontFamily: "zentry, sans-serif" }}
        >
          Trending Games
        </h2>
        <button
          type="button"
          onClick={() => navigate("/games")}
          className="flex items-center gap-1 font-semibold text-orange-400 hover:underline"
        >
          View All <span className="text-lg">&rarr;</span>
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative z-50 mt-4 flex gap-6 overflow-x-auto overflow-y-visible pb-2 no-scrollbar"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {trendingGames.map((game, idx) => (
          <div
            key={game.title}
            className="relative min-w-[220px] max-w-[240px] flex-shrink-0 origin-top cursor-pointer rounded-xl border-4 bg-transparent p-3 transition-transform duration-200 ease-out hover:z-50 hover:scale-[1.02] hover:shadow-xl active:z-50 active:scale-95 first:ml-3 md:first:ml-5 lg:first:ml-6"
            style={{
              willChange: "transform",
              borderColor: "black",
              borderWidth: "3px",
              background: "transparent",
            }}
          >
            <div className="mb-3 overflow-hidden rounded-lg">
              <img
                src={game.image}
                alt={game.title}
                className="h-40 w-full object-cover object-top"
                draggable={false}
                loading="lazy"
                decoding="async"
                fetchpriority={idx === 0 ? "high" : "low"}
                sizes="(max-width: 768px) 220px, 240px"
              />
            </div>

            <div className="mb-1 truncate text-base font-semibold text-black">{game.title}</div>

            <div className="mb-2 flex items-center gap-2 text-xs text-black">
              <span className="flex items-center gap-1">
                <span role="img" aria-label="star">
                  ⭐
                </span>
                <span className="font-bold text-yellow-400">{game.rating}</span>/100
              </span>
            </div>

            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm text-gray-500 line-through">₹{game.oldPrice}</span>
              <span className="text-lg font-bold text-black">₹{game.price}</span>
              <span className="ml-1 rounded bg-orange-500 px-1.5 py-0.5 text-xs text-white">
                {game.discount}%
              </span>
            </div>

            <button
              onClick={() => navigate("/games")}
              className="group mt-1 flex w-full items-center justify-center gap-2 rounded border border-black bg-black py-1.5 font-semibold text-white transition-colors duration-300 hover:bg-white hover:text-black active:bg-white active:text-black"
              aria-label="Buy Now - Go to All Games"
            >
              <span className="relative inline-flex overflow-hidden font-general text-xs uppercase">
                <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">
                  Buy Now
                </div>
                <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">
                  Buy Now
                </div>
              </span>
              <span className="text-base">&rarr;</span>
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex select-none items-center justify-center md:hidden">
        {trendingGames.map((_, i) => (
          <span
            key={i}
            className={`mx-0.5 text-lg leading-none ${i === active ? "text-black" : "text-black/40"}`}
          >
            {i === active ? "-" : "."}
          </span>
        ))}
      </div>
    </section>
  );
};

export default TrendingGames;
