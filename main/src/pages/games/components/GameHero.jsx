import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GameHero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const slides = [
    {
      id: 1,
      title: 'PIXIEKAT STORE',
      subtitle: 'Official Gaming Platform',
      description:
        'PIXIEKAT STORE is a practical solution for every game lover to buy game vouchers without having to go to a physical store.',
      cta: 'WWW.PIXIEKATSTORE.COM',
      bgGradient: 'from-blue-700 via-violet-700 to-indigo-900',
      image: '/img/hero/game-hero-card.gif',
    },
    {
      id: 2,
      title: 'MOBILE LEGENDS',
      subtitle: 'Top Up Diamonds',
      description:
        'Get instant diamonds for Mobile Legends. Fast, secure, and reliable top-up service with 24/7 support.',
      cta: 'TOP UP NOW',
      bgGradient: 'from-indigo-700 via-fuchsia-700 to-violet-900',
      image: '/img/hero/game-mlbb-card.webp',
    },
    {
      id: 3,
      title: 'PUBG GLOBAL',
      subtitle: 'UC Coins Available',
      description:
        'Purchase UC coins for PUBG Mobile Global. Instant delivery and competitive prices guaranteed.',
      cta: 'BUY UC COINS',
      bgGradient: 'from-orange-600 via-rose-700 to-red-900',
      image: '/img/hero/game-pubg-card.webp',
    },
    {
      id: 4,
      title: 'GENSHIN IMPACT',
      subtitle: 'Genesis Crystals',
      description:
        'Top up Genesis Crystals for Genshin Impact. Safe transactions with instant delivery to your account.',
      cta: 'GET CRYSTALS',
      bgGradient: 'from-cyan-700 via-sky-700 to-indigo-900',
      image: '/img/hero/game-genshin-card.webp',
    },
  ];

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  const getRelativeIndex = (index) => {
    const total = slides.length;
    let diff = index - currentSlide;

    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    return diff;
  };

  const getCardPositionClasses = (index) => {
    const relativeIndex = getRelativeIndex(index);

    if (relativeIndex === 0) {
      return 'w-[96%] sm:w-[88%] md:w-[76%] h-[145px] sm:h-[308px] md:h-[374px] opacity-100 scale-100 z-30 -translate-x-1/2';
    }

    if (relativeIndex === -1) {
      return 'w-[72%] md:w-[38%] h-[130px] sm:h-[275px] md:h-[330px] opacity-55 scale-95 z-20 -translate-x-[112%] md:-translate-x-[122%]';
    }

    if (relativeIndex === 1) {
      return 'w-[72%] md:w-[38%] h-[130px] sm:h-[275px] md:h-[330px] opacity-55 scale-95 z-20 translate-x-[12%] md:translate-x-[22%]';
    }

    return 'w-[66%] md:w-[32%] h-[121px] sm:h-[253px] md:h-[308px] opacity-0 scale-90 z-10 pointer-events-none -translate-x-1/2';
  };

  return (
    <div
      className="group relative px-4 py-1 md:px-8 md:py-2 lg:py-6 min-h-[calc(28vh-3rem)] min-h-[calc(28svh-3rem)] md:min-h-[calc(34vh-4rem)] md:min-h-[calc(34svh-4rem)] lg:min-h-[calc(50vh-6rem)] lg:min-h-[calc(50svh-6rem)] flex items-start lg:items-center overflow-hidden"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-0 bg-[#dfdff0]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2),transparent_58%)]" />
      <div className="absolute inset-0 opacity-[0.15]">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="relative mx-auto -mt-5 md:-mt-10 lg:mt-0 h-[180px] sm:h-[340px] md:h-[390px]">
          {slides.map((slide, index) => {
            const relativeIndex = getRelativeIndex(index);
            const isActive = relativeIndex === 0;

            return (
              <div
                key={slide.id}
                className={`absolute left-1/2 top-1/2 -translate-y-1/2 overflow-hidden rounded-[26px] shadow-[0_16px_36px_rgba(0,0,0,0.32)] transition-all duration-700 ease-out ${getCardPositionClasses(index)}`}
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading={isActive ? 'eager' : 'lazy'}
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-r opacity-[0.3] ${slide.bgGradient}`}
                />
                <div className="absolute inset-0 bg-black/20" />

                {isActive && (
                  <div className="relative z-10 flex h-full flex-col justify-center px-4 sm:px-10 md:px-12">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0, x: 36 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -36 }}
                        transition={{ duration: 0.45, ease: 'easeInOut' }}
                        className="mx-auto max-w-3xl text-center"
                      >
                        <button
                          type="button"
                          onClick={nextSlide}
                          className="mx-auto block text-center text-xl font-extrabold uppercase leading-none text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] sm:mb-4 sm:text-4xl md:text-6xl"
                          aria-label={`${slide.title} heading`}
                        >
                          {slide.title}
                        </button>
                        <p className="hidden sm:block mb-3 text-base font-semibold tracking-wide text-blue-100 md:text-xl">
                          {slide.subtitle}
                        </p>
                        <p className="hidden sm:block mx-auto mb-5 max-w-2xl text-sm text-white/90 md:text-base">
                          {slide.description}
                        </p>
                        <button className="hidden sm:inline-flex rounded-lg bg-[#f4b73f] px-6 py-2 text-sm font-bold text-black transition-all duration-300 hover:bg-[#ffd06f] md:px-8 md:text-base">
                          {slide.cta}
                        </button>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={prevSlide}
            className="absolute left-[2.5%] top-1/2 z-40 h-10 w-10 -translate-y-1/2 rounded-full bg-[#cbb6a7] text-black backdrop-blur-sm transition-all duration-200 hover:bg-[#d8c6b9] sm:left-[4%] md:left-[12%] md:h-12 md:w-12 md:bg-white/25 md:text-white md:hover:bg-white/35 md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto"
            aria-label="Previous slide"
          >
            <span className="text-lg leading-none md:text-2xl">{'<'}</span>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-[2.5%] top-1/2 z-40 h-10 w-10 -translate-y-1/2 rounded-full bg-[#cbb6a7] text-black backdrop-blur-sm transition-all duration-200 hover:bg-[#d8c6b9] sm:right-[4%] md:right-[12%] md:h-12 md:w-12 md:bg-white/25 md:text-white md:hover:bg-white/35 md:opacity-0 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto"
            aria-label="Next slide"
          >
            <span className="text-lg leading-none md:text-2xl">{'>'}</span>
          </button>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7 }}
            className="absolute bottom-3 left-1/2 z-40 -translate-x-1/2 rounded-full bg-[#c7d08a]/85 px-3 py-1.5 backdrop-blur-sm md:bottom-4 md:bg-white/45"
          >
            <div className="flex items-center gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? 'w-6 bg-black'
                      : 'w-2.5 bg-black/40 hover:bg-black/60'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default GameHero;
