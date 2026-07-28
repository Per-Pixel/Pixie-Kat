import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageWrapper from '../../components/common/PageWrapper';
import {
  DEFAULT_HOW_IT_WORKS,
  fetchJsonSetting,
} from '../../lib/storeContent';

const POWDER_BLUE = '#ADD8E6';

const FeaturesCarousel = ({ features }) => {
  const [current, setCurrent] = useState(0);
  const dragStartX = useRef(0);
  const total = features.length;

  const prev = () => setCurrent((i) => (i - 1 + total) % total);
  const next = () => setCurrent((i) => (i + 1) % total);

  if (total === 0) return null;

  return (
    <div className="relative px-4">
      <div className="overflow-hidden rounded-2xl">
        <motion.div
          className="flex"
          animate={{ x: `${-current * 100}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.08}
          onDragStart={(_, info) => {
            dragStartX.current = info.point.x;
          }}
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

      <div className="flex justify-center gap-2 mt-5">
        {features.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? '24px' : '8px',
              height: '8px',
              backgroundColor: i === current ? POWDER_BLUE : '#d1d5db',
            }}
          />
        ))}
      </div>

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

function mergeHowItWorksSettings(raw) {
  const source = raw || {};
  const flatBannerTitle = source.banner_title || '';
  const flatFooter = source.footer_title || '';
  const footerLines = String(flatFooter).split('\n').filter(Boolean);

  return {
    ...DEFAULT_HOW_IT_WORKS,
    ...source,
    headings: {
      ...DEFAULT_HOW_IT_WORKS.headings,
      ...source.headings,
      ...(source.heading_prefix
        ? { title_before: `${source.heading_prefix} ` }
        : {}),
      ...(source.heading_accent ? { title_highlight: source.heading_accent } : {}),
      ...(source.subheading ? { subtitle: source.subheading } : {}),
    },
    banner: {
      ...DEFAULT_HOW_IT_WORKS.banner,
      ...source.banner,
      ...(flatBannerTitle
        ? {
            title_before: '',
            title_highlight: flatBannerTitle,
            title_after: '',
          }
        : {}),
      ...(source.banner_body ? { body: source.banner_body } : {}),
    },
    cta: {
      ...DEFAULT_HOW_IT_WORKS.cta,
      ...source.cta,
      ...(source.cta_title ? { title: source.cta_title } : {}),
      ...(source.cta_body ? { body: source.cta_body } : {}),
    },
    prefooter_cta: {
      ...DEFAULT_HOW_IT_WORKS.prefooter_cta,
      ...source.prefooter_cta,
      ...(footerLines[0] ? { title_line1: footerLines[0] } : {}),
      ...(footerLines[1] ? { title_line2: footerLines[1] } : {}),
      ...(source.footer_body ? { body: source.footer_body } : {}),
    },
    steps:
      Array.isArray(source.steps) && source.steps.length > 0
        ? source.steps.map((step, index) => ({
            ...step,
            id: step.id ?? index + 1,
            details: Array.isArray(step.details)
              ? step.details
              : String(step.details || '')
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean),
          }))
        : DEFAULT_HOW_IT_WORKS.steps,
    features:
      Array.isArray(source.features) && source.features.length > 0
        ? source.features
        : DEFAULT_HOW_IT_WORKS.features,
    stats:
      Array.isArray(source.stats) && source.stats.length > 0
        ? source.stats
        : DEFAULT_HOW_IT_WORKS.stats,
    video_url: source.video_url || DEFAULT_HOW_IT_WORKS.video_url,
  };
}

const HowItWorks = () => {
  const navigate = useNavigate();
  const stepsRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_HOW_IT_WORKS);

  useEffect(() => {
    let cancelled = false;

    fetchJsonSetting('how_it_works_settings', DEFAULT_HOW_IT_WORKS).then((data) => {
      if (!cancelled) {
        setSettings(mergeHowItWorksSettings(data));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const { headings, banner, cta, prefooter_cta, steps, features, stats } = settings;
  const safeActiveStep = Math.min(activeStep, Math.max(steps.length - 1, 0));
  const currentStep = steps[safeActiveStep] || steps[0];
  const stepDetails = Array.isArray(currentStep?.details) ? currentStep.details : [];

  const handleVideoPlay = () => {
    if (settings.video_url) {
      window.open(settings.video_url, '_blank', 'noopener,noreferrer');
      return;
    }
    stepsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <PageWrapper>
      <div className="text-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="relative inline-block">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
                {headings.title_before}
                <span style={{ color: POWDER_BLUE }}>{headings.title_highlight}</span>
              </h1>
              <span className="absolute -top-5 left-0 text-xl" style={{ color: POWDER_BLUE }}>
                ✦
              </span>
              <span className="absolute -top-3 right-0 text-sm" style={{ color: POWDER_BLUE }}>
                ✦
              </span>
              <span className="absolute bottom-4 -left-6 text-xs text-gray-400">✦</span>
              <span className="absolute -bottom-1 -right-7 text-base" style={{ color: POWDER_BLUE }}>
                ✦
              </span>
            </div>
            <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              {headings.subtitle.includes('instantly') ? (
                <>
                  Top up your favorite games{' '}
                  <span className="font-semibold" style={{ color: POWDER_BLUE_DARK }}>
                    instantly
                  </span>
                  ,{' '}
                  <span className="font-semibold" style={{ color: POWDER_BLUE_DARK }}>
                    securely
                  </span>
                  , and at the best prices — from start to finish.
                </>
              ) : (
                headings.subtitle
              )}
            </p>
          </motion.div>

          <motion.div
            ref={stepsRef}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-3xl mx-auto mb-8"
          >
            <div className="flex flex-wrap justify-center gap-3">
              {steps.map((step, index) => (
                <motion.button
                  key={step.id ?? index}
                  variants={itemVariants}
                  onClick={() => setActiveStep(index)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2 rounded-full border text-sm font-medium transition-all duration-200"
                  style={
                    safeActiveStep === index
                      ? {
                          borderColor: POWDER_BLUE,
                          color: POWDER_BLUE_DARK,
                          backgroundColor: POWDER_BLUE_BG,
                        }
                      : { borderColor: '#d1d5db', color: '#4b5563', backgroundColor: '#ffffff' }
                  }
                >
                  {step.title}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {currentStep && (
            <motion.div
              key={safeActiveStep}
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
                    {currentStep.icon}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">
                      Step {currentStep.id ?? safeActiveStep + 1}
                    </h2>
                    <h3 className="text-xl font-semibold" style={{ color: POWDER_BLUE_DARK }}>
                      {currentStep.title}
                    </h3>
                  </div>
                  <div className="ml-auto text-5xl">{currentStep.image}</div>
                </div>

                <p className="text-gray-600 text-lg mb-6">{currentStep.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stepDetails.map((detail, index) => (
                    <div key={index} className="flex items-center text-gray-700">
                      <span className="mr-3 font-bold" style={{ color: POWDER_BLUE }}>
                        ✓
                      </span>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              {headings.features_title_before}
              <span style={{ color: POWDER_BLUE }}>{headings.features_title_highlight}</span>
              {headings.features_title_after}
            </h2>

            <div className="md:hidden">
              <FeaturesCarousel features={features} />
            </div>

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
              <div className="p-10 md:p-12 flex flex-col justify-center">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  {banner.title_before}
                  <span style={{ color: POWDER_BLUE }}>{banner.title_highlight}</span>
                  {banner.title_after}
                </h2>
                <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-sm">
                  {banner.body}
                </p>
              </div>

              <div className="p-10 md:p-12 flex flex-col items-center justify-center border-t border-white/10 md:border-t-0 md:border-l md:border-white/10 relative">
                <span className="absolute top-6 right-10 text-xl" style={{ color: POWDER_BLUE }}>
                  ✦
                </span>
                <span className="absolute top-10 left-8 text-xs text-white/40">✦</span>
                <span className="absolute bottom-8 right-16 text-sm text-orange-400">✦</span>
                <span className="absolute bottom-12 left-12 text-base text-white/30">✦</span>

                <h3 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
                  {banner.video_title_before}
                  <span style={{ color: POWDER_BLUE }}>{banner.video_title_highlight}</span>
                  {banner.video_title_after}
                </h3>

                <motion.button
                  type="button"
                  onClick={handleVideoPlay}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.93 }}
                  className="w-16 h-16 rounded-lg flex items-center justify-center transition-colors duration-200"
                  style={{
                    border: '2px solid rgba(255,255,255,0.5)',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  }}
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="text-center mb-16"
          >
            <div className="bg-white rounded-2xl p-8 max-w-2xl mx-auto shadow-md border border-gray-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">{cta.title}</h2>
              <p className="text-gray-600 mb-6">
                {cta.body.includes('PixieKat') ? (
                  <>
                    Join thousands of gamers who trust{' '}
                    <span className="font-semibold" style={{ color: POWDER_BLUE_DARK }}>
                      PixieKat
                    </span>{' '}
                    for{' '}
                    <span className="font-semibold" style={{ color: POWDER_BLUE_DARK }}>
                      fast
                    </span>
                    ,{' '}
                    <span className="font-semibold" style={{ color: POWDER_BLUE_DARK }}>
                      secure
                    </span>{' '}
                    top-ups every time.
                  </>
                ) : (
                  cta.body
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button
                  type="button"
                  onClick={() => navigate('/games')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="font-bold py-3 px-8 rounded-xl transition-opacity duration-200 hover:opacity-90"
                  style={{ backgroundColor: POWDER_BLUE, color: '#0f2318' }}
                >
                  {cta.primary_label}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => navigate('/pricing')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="border-2 font-bold py-3 px-8 rounded-xl transition-colors duration-200 text-gray-700 border-gray-300"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = POWDER_BLUE;
                    e.currentTarget.style.color = POWDER_BLUE_DARK;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.color = '#374151';
                  }}
                >
                  {cta.secondary_label}
                </motion.button>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="pb-16"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
              {stats.map((stat, i) => (
                <div key={i}>
                  <div className="text-3xl font-bold mb-2" style={{ color: POWDER_BLUE_DARK }}>
                    {stat.value}
                  </div>
                  <div className="text-gray-600 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.85 }}
            className="mt-4 mb-0 px-2"
          >
            <div
              className="rounded-3xl px-8 py-16 md:py-20 text-center shadow-sm max-w-4xl mx-auto"
              style={{
                background: 'linear-gradient(165deg, #f8fafc 0%, #dce8f5 50%, #c5d8ef 100%)',
              }}
            >
              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-5">
                {prefooter_cta.title_line1}
                <br className="hidden sm:block" />
                {prefooter_cta.title_line2}
              </h2>
              <p className="text-gray-500 text-base md:text-lg mb-10 max-w-md mx-auto leading-relaxed">
                {prefooter_cta.body.includes('instant') ? (
                  <>
                    Top up your favorite game in under 5 minutes — no account sharing, no delays, just{' '}
                    <span className="font-medium text-gray-700">instant</span> delivery straight to
                    your account.
                  </>
                ) : (
                  prefooter_cta.body
                )}
              </p>
              <motion.button
                type="button"
                onClick={() => navigate('/games')}
                whileHover={{ scale: 1.04, backgroundColor: '#111827', color: '#ffffff' }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full border-2 border-gray-800 text-gray-800 font-semibold text-sm"
                style={{ backgroundColor: 'transparent' }}
              >
                {prefooter_cta.button_label}
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
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
