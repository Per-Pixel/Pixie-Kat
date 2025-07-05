import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GameHero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const slides = [
    {
      id: 1,
      title: "UXSIOSTORE",
      subtitle: "Official Gaming Platform",
      description: "UXSIOSTORE is a practical solution for every game lover to buy game vouchers without having to go to a physical store.",
      cta: "WWW.UXSIOSTORE.COM",
      bgGradient: "from-blue-600 via-purple-600 to-blue-800"
    },
    {
      id: 2,
      title: "MOBILE LEGENDS",
      subtitle: "Top Up Diamonds",
      description: "Get instant diamonds for Mobile Legends. Fast, secure, and reliable top-up service with 24/7 support.",
      cta: "TOP UP NOW",
      bgGradient: "from-blue-500 via-indigo-600 to-purple-700"
    },
    {
      id: 3,
      title: "PUBG GLOBAL",
      subtitle: "UC Coins Available",
      description: "Purchase UC coins for PUBG Mobile Global. Instant delivery and competitive prices guaranteed.",
      cta: "BUY UC COINS",
      bgGradient: "from-orange-500 via-red-600 to-pink-700"
    },
    {
      id: 4,
      title: "GENSHIN IMPACT",
      subtitle: "Genesis Crystals",
      description: "Top up Genesis Crystals for Genshin Impact. Safe transactions with instant delivery to your account.",
      cta: "GET CRYSTALS",
      bgGradient: "from-purple-500 via-pink-600 to-rose-700"
    }
  ];

  // Auto-advance slides
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

  // Touch handlers for mobile swipe
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

  return (
    <div
      className="relative pt-20 pb-16 px-4 md:px-8 min-h-[60vh] flex items-center overflow-hidden"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background with gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${slides[currentSlide].bgGradient} transition-all duration-1000`} />

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        {/* Carousel Content */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="text-center mb-12"
            >
              {/* Logo/Brand */}
              <div className="flex items-center justify-center mb-8">
                <div className="text-4xl md:text-5xl font-bold text-white flex items-center">
                  <span className="text-5xl md:text-6xl mr-3">✚</span>
                  <span>{slides[currentSlide].title}</span>
                </div>
              </div>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-blue-200 text-lg md:text-xl mb-6"
              >
                {slides[currentSlide].subtitle}
              </motion.p>

              {/* Main Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-base md:text-lg text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed"
              >
                {slides[currentSlide].description}
              </motion.p>

              {/* CTA Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-black px-6 md:px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-all duration-300 text-sm md:text-base"
              >
                {slides[currentSlide].cta}
              </motion.button>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Arrows */}
        <div className="hidden md:block">
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-200"
          >
            ←
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-200"
          >
            →
          </button>
        </div>

        {/* Pagination Dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex justify-center space-x-3 mt-12"
        >
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'bg-white scale-125'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default GameHero;
