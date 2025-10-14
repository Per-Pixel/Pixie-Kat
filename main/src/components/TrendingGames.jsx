import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const trendingGames = [
  {
    title: "Black Myth Wukong",
    year: 2024,
    rating: 81,
    oldPrice: 69,
    price: 51,
    discount: 15,
    image: "/img/games/black-myth-wukong.jpg",
  },
  {
    title: "Alan Wake 2",
    year: 2024,
    rating: 86,
    oldPrice: 49,
    price: 32,
    discount: 20,
    image: "/img/games/alan-wake-2.jpg",
  },
  {
    title: "Mortal Combat 11",
    year: 2023,
    rating: 72,
    oldPrice: 62,
    price: 54,
    discount: 20,
    image: "/img/games/mortal-kombat-11.jpg",
  },
  {
    title: "Spider-Man 2",
    year: 2023,
    rating: 87,
    oldPrice: 59,
    price: 35,
    discount: 30,
    image: "/img/games/spider-man-2.jpg",
  },
  {
    title: "The Witcher 3",
    year: 2015,
    rating: 93,
    oldPrice: 49,
    price: 32,
    discount: 20,
    image: "/img/games/witcher-3.jpg",
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
      const idx = Math.max(0, Math.min(trendingGames.length - 1, Math.round(el.scrollLeft / (stride || 1))))
      setActive(idx);
    };

    computeActive();
    const onScroll = () => computeActive();
    const onResize = () => computeActive();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <section className="relative isolate z-50 py-10 px-2 md:px-8 overflow-visible">
      <div className="relative z-0 flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: '#111', fontFamily: 'zentry, sans-serif' }}>Trending Games</h2>
        <button className="text-orange-400 font-semibold flex items-center gap-1 hover:underline">
          View All <span className="text-lg">→</span>
        </button>
      </div>
      <div ref={containerRef} className="relative z-50 flex gap-6 overflow-x-auto overflow-y-visible pb-2 mt-4">
        {trendingGames.map((game, idx) => (
          <div
            key={game.title}
            className="relative bg-transparent rounded-xl p-3 min-w-[220px] max-w-[240px] flex-shrink-0 border-4 transition-transform duration-200 ease-out cursor-pointer origin-top hover:shadow-xl hover:scale-[1.02] active:scale-95 hover:z-50 active:z-50 first:ml-3 md:first:ml-5 lg:first:ml-6"
            style={{ willChange: 'transform', borderColor: 'black', borderWidth: '3px', background: 'transparent' }}
          >
            <div className="rounded-lg overflow-hidden mb-3">
              <img
                src={game.image}
                alt={game.title}
                className="w-full h-40 object-cover object-top"
                draggable={false}
                loading="lazy"
                decoding="async"
                fetchpriority={idx === 0 ? 'high' : 'low'}
                sizes="(max-width: 768px) 220px, 240px"
              />
            </div>
            <div className="text-black font-semibold text-base mb-1 truncate">{game.title}</div>
            <div className="flex items-center text-xs text-black mb-2 gap-2">
              <span className="flex items-center gap-1">
                <span role="img" aria-label="calendar">📅</span> {game.year}
              </span>
              <span className="flex items-center gap-1">
                <span role="img" aria-label="star">⭐</span> <span className="text-yellow-400 font-bold">{game.rating}</span>/100
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="line-through text-gray-500 text-sm">{game.oldPrice}$</span>
              <span className="text-lg font-bold text-black">{game.price}$</span>
              <span className="bg-orange-500 text-xs text-white rounded px-1.5 py-0.5 ml-1">{game.discount}%</span>
            </div>
            <button onClick={() => navigate('/games')} className="w-full mt-1 py-1.5 rounded bg-black text-white font-semibold flex items-center justify-center gap-2 border border-black transition-colors duration-300 hover:bg-white hover:text-black active:bg-white active:text-black group" aria-label="Buy Now - Go to All Games">
              <span className="relative inline-flex overflow-hidden font-general text-xs uppercase">
                <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">Buy Now</div>
                <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">Buy Now</div>
              </span>
              <span className="text-base">→</span>
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-center md:hidden select-none">
        {trendingGames.map((_, i) => (
          <span key={i} className={`mx-0.5 text-lg leading-none ${i === active ? 'text-black' : 'text-black/40'}`}>
            {i === active ? '-' : '.'}
          </span>
        ))}
      </div>
    </section>
  );
};

export default TrendingGames;
