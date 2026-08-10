import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageWrapper from '../../components/common/PageWrapper';

const POWDER_BLUE = '#ADD8E6';
const POWDER_BLUE_DARK = '#5BA4CF';
const POWDER_BLUE_BG = '#EBF5FF';
const BANNER_BG = '#0f2318';

const FAQ = () => {
  const [activeCategory, setActiveCategory] = useState(0);
  const [openItems, setOpenItems] = useState(new Set(['0-0']));

  const faqCategories = [
    {
      title: 'Payment & Billing',
      icon: '💳',
      questions: [
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept all major payment methods including UPI (PhonePe, Google Pay, Paytm), Credit/Debit Cards (Visa, Mastercard, RuPay), Net Banking, and Digital Wallets. All payments are processed securely through our certified payment partners.'
        },
        {
          question: 'Is my payment information secure?',
          answer: 'Absolutely! We use industry-standard SSL encryption and PCI DSS compliant payment gateways. We never store your card details on our servers. All transactions are processed through secure, encrypted channels.'
        },
        {
          question: 'Can I get a refund if I made a wrong purchase?',
          answer: 'Refunds are processed on a case-by-case basis. If the top-up was not delivered to your game account within 24 hours, we offer a full refund. For wrong purchases, please contact our support team within 2 hours of purchase for assistance.'
        },
        {
          question: 'Do you charge any additional fees?',
          answer: 'No hidden charges! The price you see is the final price you pay. However, your bank or payment provider may charge transaction fees, which are beyond our control.'
        }
      ]
    },
    {
      title: 'Delivery & Processing',
      icon: '⚡',
      questions: [
        {
          question: 'How long does delivery take?',
          answer: 'Most top-ups are delivered instantly within 2-5 minutes. During peak hours or maintenance periods, it may take up to 30 minutes. We guarantee delivery within 24 hours or provide a full refund.'
        },
        {
          question: 'What information do I need to provide?',
          answer: 'You only need your Game ID/User ID and Server (if applicable). Make sure to double-check these details before confirming your purchase, as incorrect information may delay delivery.'
        },
        {
          question: 'Can I track my order status?',
          answer: 'Yes! After purchase, you\'ll receive an order confirmation with a tracking ID. You can check your order status in real-time through our website or by contacting our support team.'
        },
        {
          question: 'What if I don\'t receive my top-up?',
          answer: 'If you don\'t receive your top-up within the expected timeframe, please contact our 24/7 support team with your order ID. We\'ll investigate and resolve the issue immediately or provide a full refund.'
        }
      ]
    },
    {
      title: 'Account & Membership',
      icon: '👤',
      questions: [
        {
          question: 'Do I need to create an account to make a purchase?',
          answer: 'While you can make guest purchases, creating an account gives you access to order history, faster checkout, exclusive member deals, and our loyalty rewards program.'
        },
        {
          question: 'What are the benefits of premium membership?',
          answer: 'Premium members get extra bonuses on all purchases (5-15% depending on tier), priority customer support, exclusive deals, early access to new games, and higher monthly top-up limits.'
        },
        {
          question: 'How do I upgrade my membership?',
          answer: 'You can upgrade your membership anytime from your account dashboard. Choose your preferred plan and payment cycle. Upgrades take effect immediately, and you\'ll start enjoying the benefits right away.'
        },
        {
          question: 'Can I cancel my membership?',
          answer: 'Yes, you can cancel your membership anytime. Your benefits will remain active until the end of your current billing cycle. No cancellation fees apply.'
        }
      ]
    },
    {
      title: 'Games & Support',
      icon: '🎮',
      questions: [
        {
          question: 'Which games do you support?',
          answer: 'We support all major mobile games including Mobile Legends: Bang Bang, PUBG Mobile, Free Fire, Genshin Impact, Call of Duty Mobile, Clash of Clans, and many more. New games are added regularly.'
        },
        {
          question: 'Do you offer customer support?',
          answer: 'Yes! We provide 24/7 customer support through WhatsApp, Instagram, and our website chat. Premium members get priority support with faster response times.'
        },
        {
          question: 'Is PixieKat safe and legitimate?',
          answer: 'Absolutely! We\'re a registered business with over 5000+ successful orders. We\'re authorized resellers for all supported games and maintain the highest security standards for all transactions.'
        },
        {
          question: 'How do you offer better prices than competitors?',
          answer: 'We maintain direct partnerships with game publishers and buy in bulk, allowing us to offer competitive prices. Our efficient operations and lower overhead costs enable us to pass savings to our customers.'
        }
      ]
    }
  ];

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
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
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
                Frequently Asked{' '}
                <span style={{ color: POWDER_BLUE }}>Questions</span>
              </h1>
              <span className="absolute -top-5 left-0 text-xl" style={{ color: POWDER_BLUE }}>✦</span>
              <span className="absolute -top-3 right-0 text-sm" style={{ color: POWDER_BLUE }}>✦</span>
              <span className="absolute bottom-4 -left-6 text-xs text-gray-400">✦</span>
              <span className="absolute -bottom-1 -right-7 text-base" style={{ color: POWDER_BLUE }}>✦</span>
            </div>
            <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Find answers to common questions about PixieKat&apos;s{' '}
              <span className="font-semibold" style={{ color: POWDER_BLUE_DARK }}>services</span>,{' '}
              <span className="font-semibold" style={{ color: POWDER_BLUE_DARK }}>payments</span>, and support
            </p>
          </motion.div>

          {/* ── Category Tab Navigation ── */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-3xl mx-auto mb-8"
          >
            <div className="flex flex-wrap justify-center gap-3">
              {faqCategories.map((category, index) => (
                <motion.button
                  key={index}
                  variants={itemVariants}
                  onClick={() => setActiveCategory(index)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2 rounded-full border text-sm font-medium transition-all duration-200"
                  style={
                    activeCategory === index
                      ? { borderColor: POWDER_BLUE, color: POWDER_BLUE_DARK, backgroundColor: POWDER_BLUE_BG }
                      : { borderColor: '#d1d5db', color: '#4b5563', backgroundColor: '#ffffff' }
                  }
                >
                  {category.icon} {category.title}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* ── Active Category Accordion Panel ── */}
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-4xl mx-auto mb-16"
          >
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">

              {/* Category header row */}
              <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 flex-shrink-0"
                  style={{ backgroundColor: POWDER_BLUE_BG, borderColor: POWDER_BLUE }}
                >
                  {faqCategories[activeCategory].icon}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {faqCategories[activeCategory].title}
                </h2>
              </div>

              {/* Questions */}
              <div className="px-8 py-2">
                {faqCategories[activeCategory].questions.map((item, questionIndex) => {
                  const itemId = `${activeCategory}-${questionIndex}`;
                  const isOpen = openItems.has(itemId);

                  return (
                    <div key={questionIndex} className="border-b border-gray-100 last:border-b-0">
                      <button
                        onClick={() => toggleItem(activeCategory, questionIndex)}
                        className="w-full text-left py-5 flex items-center justify-between group"
                      >
                        <span
                          className="text-gray-900 font-medium pr-4 transition-colors duration-200 group-hover:text-[#5BA4CF]"
                        >
                          {item.question}
                        </span>
                        <motion.div
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border"
                          style={
                            isOpen
                              ? { borderColor: POWDER_BLUE, backgroundColor: POWDER_BLUE_BG }
                              : { borderColor: '#d1d5db', backgroundColor: '#f9fafb' }
                          }
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke={isOpen ? POWDER_BLUE_DARK : '#6b7280'}
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
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
                            <div className="pb-5 text-gray-600 leading-relaxed flex gap-3">
                              <span
                                className="mt-0.5 font-bold flex-shrink-0"
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

        </div>

        {/* ── "Still have questions?" Dark Banner ── */}
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

              {/* Left — message */}
              <div className="p-10 md:p-12 flex flex-col justify-center">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Still have{' '}
                  <span style={{ color: POWDER_BLUE }}>questions?</span>
                </h2>
                <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-sm">
                  Our support team is{' '}
                  <span className="font-semibold" style={{ color: POWDER_BLUE }}>available 24/7</span>{' '}
                  to help you with any questions or concerns. Whether it&apos;s about payments,
                  deliveries, or your account — we&apos;re here for you.
                </p>
              </div>

              {/* Right — actions */}
              <div className="p-10 md:p-12 flex flex-col items-center justify-center gap-4 border-t border-white/10 md:border-t-0 md:border-l md:border-white/10 relative">
                <span className="absolute top-6 right-10 text-xl" style={{ color: POWDER_BLUE }}>✦</span>
                <span className="absolute top-10 left-8 text-xs text-white/40">✦</span>
                <span className="absolute bottom-8 right-16 text-sm text-orange-400">✦</span>
                <span className="absolute bottom-12 left-12 text-base text-white/30">✦</span>

                <div className="flex flex-col sm:flex-row gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="font-bold py-3 px-6 rounded-xl transition-opacity duration-200 hover:opacity-90"
                    style={{ backgroundColor: POWDER_BLUE, color: BANNER_BG }}
                  >
                    Contact Support
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="border-2 border-white/50 text-white font-bold py-3 px-6 rounded-xl hover:bg-white/10 transition-colors duration-200"
                  >
                    WhatsApp Us
                  </motion.button>
                </div>
              </div>

            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-4">

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
                Get answers.<br className="hidden sm:block" />
                Play faster.
              </h2>
              <p className="text-gray-500 text-base md:text-lg mb-10 max-w-md mx-auto leading-relaxed">
                Browse our FAQ or reach out anytime — our team is ready to help you top up without any{' '}
                <span className="font-medium text-gray-700">hassle</span>.
              </p>
              <motion.button
                whileHover={{ scale: 1.04, backgroundColor: '#111827', color: '#ffffff' }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full border-2 border-gray-800 text-gray-800 font-semibold text-sm"
                style={{ backgroundColor: 'transparent' }}
              >
                Browse Games
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

export default FAQ;
