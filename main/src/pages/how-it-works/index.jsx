import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import PageWrapper from '../../components/common/PageWrapper';

const POWDER_BLUE = '#ADD8E6';

const FeaturesCarousel = ({ features }) => {
  const [current, setCurrent] = useState(0);
  const dragStartX = useRef(0);
  const total = features.length;

  const prev = () => setCurrent(i => (i - 1 + total) % total);
  const next = () => setCurrent(i => (i + 1) % total);

  return (
    <div className="relative px-4">
      {/* Track */}
      <div className="overflow-hidden rounded-2xl">
        <motion.div
          className="flex"
          animate={{ x: `${-current * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.08}
          onDragStart={(_, info) => { dragStartX.current = info.point.x; }}
          onDragEnd={(_, info) => {
            const delta = dragStartX.current - info.point.x;
            if (delta > 40) next();
            else if (delta < -40) prev();
          }}
          style={{ cursor: 'grab' }}
        >
          {features.map((feature, index) => (
            <div
              key={index}
              className="min-w-full bg-white rounded-2xl p-8 text-center shadow-md border border-gray-100 select-none"
            >
              <div className="text-5xl mb-5">{feature.icon}</div>
              <h3 className="font-bold text-xl text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-5">
        {features.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? '24px' : '8px',
              height: '8px',
              backgroundColor: i === current ? POWDER_BLUE : '#d1d5db'
            }}
          />
        ))}
      </div>

      {/* Prev / Next arrows */}
      <button
        onClick={prev}
        className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors z-10"
        style={{ marginTop: '-16px' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={next}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors z-10"
        style={{ marginTop: '-16px' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

const POWDER_BLUE_DARK = '#5BA4CF';
const POWDER_BLUE_BG = '#EBF5FF';
const BANNER_BG = '#0f2318';

const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: 1,
      title: 'Pick Your Game',
      icon: '🎮',
      description: 'Browse 50+ supported titles and select the game you want to top up.',
      details: [
        'MLBB, PUBG, Free Fire & more',
        'New titles added every week',
        'All officially supported games',
        'Search or filter by category'
      ],
      image: '🎯'
    },
    {
      id: 2,
      title: 'Choose Package',
      icon: '💎',
      description: 'Select a top-up amount — from starter packs to premium bundles at the best prices.',
      details: [
        'Flexible denomination options',
        'Bonus rewards on select packages',
        'Member-exclusive discounts',
        'Zero hidden fees, always'
      ],
      image: '💰'
    },
    {
      id: 3,
      title: 'Enter Game Details',
      icon: '📝',
      description: 'Type in your Game ID and server. We guide you every step of the way.',
      details: [
        'Enter your Game ID / User ID',
        'Select server if required',
        'We help you locate your ID',
        'Details verified before processing'
      ],
      image: '🔍'
    },
    {
      id: 4,
      title: 'Secure Checkout',
      icon: '💳',
      description: 'Pay using your preferred method. Every transaction is SSL-encrypted and safe.',
      details: [
        'UPI, Cards, Net Banking & Wallets',
        'SSL-encrypted checkout',
        'Instant payment confirmation',
        'No data stored after purchase'
      ],
      image: '🔒'
    },
    {
      id: 5,
      title: 'Instant Delivery',
      icon: '⚡',
      description: 'Credits land in your game account within minutes. No waiting, no hassle.',
      details: [
        'Average delivery: 2–5 minutes',
        'Real-time order tracking',
        '24/7 support if needed',
        '99.9% successful delivery rate'
      ],
      image: '🎉'
    }
  ];

  const features = [
    { icon: '⚡', title: 'Instant Delivery', description: 'Most orders fulfilled within 2–5 minutes, guaranteed.' },
    { icon: '🛡️', title: '100% Secure', description: 'Bank-grade SSL encryption on every single transaction.' },
    { icon: '💰', title: 'Best Prices', description: 'Competitive rates and exclusive member-only deals.' },
    { icon: '🎯', title: '99.9% Success Rate', description: 'Industry-leading delivery success across all games.' },
    { icon: '📱', title: '24/7 Support', description: 'Real humans ready to help you around the clock.' },
    { icon: '🎁', title: 'Bonus Rewards', description: 'Earn extra credits and gifts with every purchase.' }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  return (
    <PageWrapper>
      <div className="text-gray-900">

        <div className="container mx-auto px-4">

          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="relative inline-block">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
                How it{' '}
                <span style={{ color: POWDER_BLUE }}>works?</span>
              </h1>
              <span className="absolute -top-5 left-0 text-xl" style={{ color: POWDER_BLUE }}>✦</span>
              <span className="absolute -top-3 right-0 text-sm" style={{ color: POWDER_BLUE }}>✦</span>
              <span className="absolute bottom-4 -left-6 text-xs text-gray-400">✦</span>
              <span className="absolute -bottom-1 -right-7 text-base" style={{ color: POWDER_BLUE }}>✦</span>
            </div>
            <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Top up your favorite games{' '}
              <span className="font-semibold" style={{ color: POWDER_BLUE_DARK }}>instantly</span>,{' '}
              <span className="font-semibold" style={{ color: POWDER_BLUE_DARK }}>securely</span>, and at the best prices —
              from start to finish.
            </p>
          </motion.div>

          {/* ── Step Tab Navigation ── */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-3xl mx-auto mb-8"
          >
            <div className="flex flex-wrap justify-center gap-3">
              {steps.map((step, index) => (
                <motion.button
                  key={step.id}
                  variants={itemVariants}
                  onClick={() => setActiveStep(index)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2 rounded-full border text-sm font-medium transition-all duration-200"
                  style={
                    activeStep === index
                      ? { borderColor: POWDER_BLUE, color: POWDER_BLUE_DARK, backgroundColor: POWDER_BLUE_BG }
                      : { borderColor: '#d1d5db', color: '#4b5563', backgroundColor: '#ffffff' }
                  }
                >
                  {step.title}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* ── Active Step Detail Panel ── */}
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-4xl mx-auto mb-16"
          >
            <div className="bg-white rounded-2xl p-8 shadow-md border border-gray-100">
              <div className="flex items-center mb-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mr-6 border-2"
                  style={{ backgroundColor: POWDER_BLUE_BG, borderColor: POWDER_BLUE }}
                >
                  {steps[activeStep].icon}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Step {steps[activeStep].id}</h2>
                  <h3 className="text-xl font-semibold" style={{ color: POWDER_BLUE_DARK }}>
                    {steps[activeStep].title}
                  </h3>
                </div>
                <div className="ml-auto text-5xl">{steps[activeStep].image}</div>
              </div>

              <p className="text-gray-600 text-lg mb-6">{steps[activeStep].description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {steps[activeStep].details.map((detail, index) => (
                  <div key={index} className="flex items-center text-gray-700">
                    <span className="mr-3 font-bold" style={{ color: POWDER_BLUE }}>✓</span>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── Features Grid / Carousel ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Why choose{' '}
              <span style={{ color: POWDER_BLUE }}>PixieKat</span>?
            </h2>

            {/* Mobile carousel */}
            <div className="md:hidden">
              <FeaturesCarousel features={features} />
            </div>

            {/* Desktop grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.04, y: -4 }}
                  className="bg-white rounded-xl p-6 text-center shadow-md border border-gray-100"
                >
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-500 text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>

        {/* ── "What is PixieKat?" Dark Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="w-full mb-16 px-4"
        >
          <div
            className="max-w-6xl mx-auto rounded-2xl overflow-hidden"
            style={{ backgroundColor: BANNER_BG }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 min-h-[280px]">

              {/* Left — What is PixieKat? */}
              <div className="p-10 md:p-12 flex flex-col justify-center">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  What is{' '}
                  <span style={{ color: POWDER_BLUE }}>PixieKat</span>?
                </h2>
                <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-sm">
                  PixieKat is your{' '}
                  <span className="font-semibold" style={{ color: POWDER_BLUE }}>trusted</span>,{' '}
                  <span className="font-semibold" style={{ color: POWDER_BLUE }}>instant</span>{' '}
                  game top-up platform. We deliver in-game credits, diamonds, and currency
                  directly to your account — no login required, no delays. Just{' '}
                  <span className="font-semibold" style={{ color: POWDER_BLUE }}>fast</span> and{' '}
                  <span className="font-semibold" style={{ color: POWDER_BLUE }}>secure</span>{' '}
                  top-ups every single time.
                </p>
              </div>

              {/* Right — How PixieKat works */}
              <div
                className="p-10 md:p-12 flex flex-col items-center justify-center border-t border-white/10 md:border-t-0 md:border-l md:border-white/10 relative"
              >
                <span className="absolute top-6 right-10 text-xl" style={{ color: POWDER_BLUE }}>✦</span>
                <span className="absolute top-10 left-8 text-xs text-white/40">✦</span>
                <span className="absolute bottom-8 right-16 text-sm text-orange-400">✦</span>
                <span className="absolute bottom-12 left-12 text-base text-white/30">✦</span>

                <h3 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
                  How{' '}
                  <span style={{ color: POWDER_BLUE }}>PixieKat</span> works
                </h3>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.93 }}
                  className="w-16 h-16 rounded-lg flex items-center justify-center transition-colors duration-200"
                  style={{
                    border: '2px solid rgba(255,255,255,0.5)',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
                >
                  <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </motion.button>
              </div>

            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-4">

          {/* ── CTA Section ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="text-center mb-16"
          >
            <div className="bg-white rounded-2xl p-8 max-w-2xl mx-auto shadow-md border border-gray-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to top up?</h2>
              <p className="text-gray-600 mb-6">
                Join thousands of gamers who trust{' '}
                <span className="font-semibold" style={{ color: POWDER_BLUE_DARK }}>PixieKat</span>{' '}
                for{' '}
                <span className="font-semibold" style={{ color: POWDER_BLUE_DARK }}>fast</span>,{' '}
                <span className="font-semibold" style={{ color: POWDER_BLUE_DARK }}>secure</span>{' '}
                top-ups every time.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="font-bold py-3 px-8 rounded-xl transition-opacity duration-200 hover:opacity-90"
                  style={{ backgroundColor: POWDER_BLUE, color: '#0f2318' }}
                >
                  Browse Games
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="border-2 font-bold py-3 px-8 rounded-xl transition-colors duration-200 text-gray-700 border-gray-300"
                  style={{ '--hover-border': POWDER_BLUE }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = POWDER_BLUE;
                    e.currentTarget.style.color = POWDER_BLUE_DARK;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.color = '#374151';
                  }}
                >
                  View Pricing
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* ── Stats ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="pb-16"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
              {[
                { value: '5,000+', label: 'Happy Gamers' },
                { value: '50+', label: 'Games Supported' },
                { value: '99.9%', label: 'Success Rate' },
                { value: '~2 Min', label: 'Avg. Delivery' }
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-3xl font-bold mb-2" style={{ color: POWDER_BLUE_DARK }}>
                    {stat.value}
                  </div>
                  <div className="text-gray-600 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Pre-footer CTA Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.85 }}
            className="mt-4 mb-0 px-2"
          >
            <div
              className="rounded-3xl px-8 py-16 md:py-20 text-center shadow-sm max-w-4xl mx-auto"
              style={{
                background: 'linear-gradient(165deg, #f8fafc 0%, #dce8f5 50%, #c5d8ef 100%)'
              }}
            >
              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-5">
                Stop waiting.<br className="hidden sm:block" />
                Start playing.
              </h2>
              <p className="text-gray-500 text-base md:text-lg mb-10 max-w-md mx-auto leading-relaxed">
                Top up your favorite game in under 5 minutes — no account sharing, no delays, just{' '}
                <span className="font-medium text-gray-700">instant</span> delivery straight to your account.
              </p>
              <motion.button
                whileHover={{ scale: 1.04, backgroundColor: '#111827', color: '#ffffff' }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full border-2 border-gray-800 text-gray-800 font-semibold text-sm"
                style={{ backgroundColor: 'transparent' }}
              >
                Top Up Now
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </motion.button>
            </div>
          </motion.div>

        </div>
      </div>
    </PageWrapper>
  );
};

export default HowItWorks;
