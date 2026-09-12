import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PageWrapper from '../../components/common/PageWrapper';
import {
  DEFAULT_CONTACT,
  DEFAULT_FAQ,
  buildWhatsAppUrl,
  fetchContactSettings,
  fetchJsonSetting,
} from '../../lib/storeContent';

const POWDER_BLUE = '#ADD8E6';
const POWDER_BLUE_DARK = '#5BA4CF';
const POWDER_BLUE_BG = '#EBF5FF';
const BANNER_BG = '#0f2318';

function mergeFaqSettings(raw) {
  const source = raw || {};
  const flatFooter = source.footer_title || '';
  const footerLines = String(flatFooter).split('\n').filter(Boolean);

  return {
    ...DEFAULT_FAQ,
    ...source,
    headings: {
      ...DEFAULT_FAQ.headings,
      ...source.headings,
      ...(source.heading_prefix
        ? { title_before: `${source.heading_prefix} ` }
        : {}),
      ...(source.heading_accent ? { title_highlight: source.heading_accent } : {}),
      ...(source.subheading ? { subtitle: source.subheading } : {}),
    },
    banner: {
      ...DEFAULT_FAQ.banner,
      ...source.banner,
      ...(source.support_title
        ? {
            title_before: '',
            title_highlight: source.support_title,
            title_after: '',
          }
        : {}),
      ...(source.support_body ? { body: source.support_body } : {}),
    },
    prefooter_cta: {
      ...DEFAULT_FAQ.prefooter_cta,
      ...source.prefooter_cta,
      ...(footerLines[0] ? { title_line1: footerLines[0] } : {}),
      ...(footerLines[1] ? { title_line2: footerLines[1] } : {}),
      ...(source.footer_body ? { body: source.footer_body } : {}),
    },
    categories:
      Array.isArray(source.categories) && source.categories.length > 0
        ? source.categories
        : DEFAULT_FAQ.categories,
    contact_support_path:
      source.contact_support_path || DEFAULT_FAQ.contact_support_path,
  };
}

const FAQ = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(0);
  const [openItems, setOpenItems] = useState(new Set(['0-0']));
  const [settings, setSettings] = useState(DEFAULT_FAQ);
  const [contact, setContact] = useState(DEFAULT_CONTACT);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchJsonSetting('faq_settings', DEFAULT_FAQ),
      fetchContactSettings(),
    ]).then(([faqData, contactData]) => {
      if (!cancelled) {
        setSettings(mergeFaqSettings(faqData));
        setContact(contactData);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const { headings, banner, prefooter_cta, categories } = settings;
  const safeActiveCategory = Math.min(
    activeCategory,
    Math.max(categories.length - 1, 0),
  );
  const currentCategory = categories[safeActiveCategory];
  const questions = Array.isArray(currentCategory?.questions)
    ? currentCategory.questions
    : [];

  const whatsappUrl = buildWhatsAppUrl(contact.whatsapp, contact.whatsapp_message);

  const toggleItem = (categoryIndex, questionIndex) => {
    const itemId = `${categoryIndex}-${questionIndex}`;
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(itemId)) {
      newOpenItems.delete(itemId);
    } else {
      newOpenItems.add(itemId);
    }
    setOpenItems(newOpenItems);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  const handleWhatsAppClick = () => {
    if (whatsappUrl.startsWith('http')) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(whatsappUrl);
  };

  return (
    <PageWrapper>
      <div className="text-gray-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <div className="relative inline-block">
              <h1 className="mb-4 text-4xl font-bold text-gray-900 md:text-6xl">
                {headings.title_before}
                <span style={{ color: POWDER_BLUE }}>{headings.title_highlight}</span>
              </h1>
              <span className="absolute -top-5 left-0 text-xl" style={{ color: POWDER_BLUE }}>
                ✦
              </span>
              <span className="absolute -top-3 right-0 text-sm" style={{ color: POWDER_BLUE }}>
                ✦
              </span>
              <span className="absolute -left-6 bottom-4 text-xs text-gray-400">✦</span>
              <span className="absolute -bottom-1 -right-7 text-base" style={{ color: POWDER_BLUE }}>
                ✦
              </span>
            </div>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-600 md:text-xl">
              {headings.subtitle.includes('services') ? (
                <>
                  Find answers to common questions about PixieKat&apos;s{' '}
                  <span className="font-semibold" style={{ color: POWDER_BLUE_DARK }}>
                    services
                  </span>
                  ,{' '}
                  <span className="font-semibold" style={{ color: POWDER_BLUE_DARK }}>
                    payments
                  </span>
                  , and support
                </>
              ) : (
                headings.subtitle
              )}
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mx-auto mb-8 max-w-3xl"
          >
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map((category, index) => (
                <motion.button
                  key={index}
                  variants={itemVariants}
                  onClick={() => setActiveCategory(index)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-full border px-5 py-2 text-sm font-medium transition-all duration-200"
                  style={
                    safeActiveCategory === index
                      ? {
                          borderColor: POWDER_BLUE,
                          color: POWDER_BLUE_DARK,
                          backgroundColor: POWDER_BLUE_BG,
                        }
                      : { borderColor: '#d1d5db', color: '#4b5563', backgroundColor: '#ffffff' }
                  }
                >
                  {category.icon} {category.title}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {currentCategory && (
            <motion.div
              key={safeActiveCategory}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mx-auto mb-16 max-w-4xl"
            >
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md">
                <div className="flex items-center gap-4 border-b border-gray-100 px-8 py-6">
                  <div
                    className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 text-2xl"
                    style={{ backgroundColor: POWDER_BLUE_BG, borderColor: POWDER_BLUE }}
                  >
                    {currentCategory.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{currentCategory.title}</h2>
                </div>

                <div className="px-8 py-2">
                  {questions.map((item, questionIndex) => {
                    const itemId = `${safeActiveCategory}-${questionIndex}`;
                    const isOpen = openItems.has(itemId);

                    return (
                      <div key={questionIndex} className="border-b border-gray-100 last:border-b-0">
                        <button
                          onClick={() => toggleItem(safeActiveCategory, questionIndex)}
                          className="group flex w-full items-center justify-between py-5 text-left"
                        >
                          <span className="pr-4 font-medium text-gray-900 transition-colors duration-200 group-hover:text-[#5BA4CF]">
                            {item.question}
                          </span>
                          <motion.div
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex size-6 shrink-0 items-center justify-center rounded-full border"
                            style={
                              isOpen
                                ? {
                                    borderColor: POWDER_BLUE,
                                    backgroundColor: POWDER_BLUE_BG,
                                  }
                                : { borderColor: '#d1d5db', backgroundColor: '#f9fafb' }
                            }
                          >
                            <svg
                              className="size-3"
                              fill="none"
                              stroke={isOpen ? POWDER_BLUE_DARK : '#6b7280'}
                              strokeWidth="2.5"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </motion.div>
                        </button>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className="flex gap-3 pb-5 leading-relaxed text-gray-600">
                                <span
                                  className="mt-0.5 shrink-0 font-bold"
                                  style={{ color: POWDER_BLUE }}
                                >
                                  ✓
                                </span>
                                <span>{item.answer}</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="mb-16 w-full px-4"
        >
          <div
            className="mx-auto max-w-6xl overflow-hidden rounded-2xl"
            style={{ backgroundColor: BANNER_BG }}
          >
            <div className="grid min-h-[280px] grid-cols-1 md:grid-cols-2">
              <div className="flex flex-col justify-center p-10 md:p-12">
                <h2 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                  {banner.title_before}
                  <span style={{ color: POWDER_BLUE }}>{banner.title_highlight}</span>
                </h2>
                <p className="max-w-sm text-sm leading-relaxed text-gray-300 md:text-base">
                  {banner.body.includes('24/7') ? (
                    <>
                      Our support team is{' '}
                      <span className="font-semibold" style={{ color: POWDER_BLUE }}>
                        available 24/7
                      </span>{' '}
                      to help you with any questions or concerns. Whether it&apos;s about payments,
                      deliveries, or your account — we&apos;re here for you.
                    </>
                  ) : (
                    banner.body
                  )}
                </p>
              </div>

              <div className="relative flex flex-col items-center justify-center gap-4 border-t border-white/10 p-10 md:border-l md:border-t-0 md:border-white/10 md:p-12">
                <span className="absolute right-10 top-6 text-xl" style={{ color: POWDER_BLUE }}>
                  ✦
                </span>
                <span className="absolute left-8 top-10 text-xs text-white/40">✦</span>
                <span className="absolute bottom-8 right-16 text-sm text-orange-400">✦</span>
                <span className="absolute bottom-12 left-12 text-base text-white/30">✦</span>

                <div className="flex flex-col gap-4 sm:flex-row">
                  <motion.button
                    type="button"
                    onClick={() => navigate(settings.contact_support_path)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-xl px-6 py-3 font-bold transition-opacity duration-200 hover:opacity-90"
                    style={{ backgroundColor: POWDER_BLUE, color: BANNER_BG }}
                  >
                    Contact Support
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={handleWhatsAppClick}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-xl border-2 border-white/50 px-6 py-3 font-bold text-white transition-colors duration-200 hover:bg-white/10"
                  >
                    WhatsApp Us
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.85 }}
            className="mb-0 mt-4 px-2"
          >
            <div
              className="mx-auto max-w-4xl rounded-3xl px-8 py-16 text-center shadow-sm md:py-20"
              style={{
                background: 'linear-gradient(165deg, #f8fafc 0%, #dce8f5 50%, #c5d8ef 100%)',
              }}
            >
              <h2 className="mb-5 text-3xl font-bold leading-tight text-gray-900 md:text-5xl">
                {prefooter_cta.title_line1}
                <br className="hidden sm:block" />
                {prefooter_cta.title_line2}
              </h2>
              <p className="mx-auto mb-10 max-w-md text-base leading-relaxed text-gray-500 md:text-lg">
                {prefooter_cta.body.includes('hassle') ? (
                  <>
                    Browse our FAQ or reach out anytime — our team is ready to help you top up
                    without any{' '}
                    <span className="font-medium text-gray-700">hassle</span>.
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
                className="inline-flex items-center gap-2 rounded-full border-2 border-gray-800 px-7 py-3 text-sm font-semibold text-gray-800"
                style={{ backgroundColor: 'transparent' }}
              >
                {prefooter_cta.button_label}
                <svg
                  className="size-4"
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

export default FAQ;
