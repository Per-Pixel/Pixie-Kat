import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageWrapper from '../../components/common/PageWrapper';
import { supabase } from '../../lib/supabase';
import { fetchJsonSetting } from '../../lib/storeContent';

const currencySymbols = { INR: '₹', USD: '$', EUR: '€', BRL: 'R$' };

const formatPrice = (amount, currency = 'INR') => {
  const symbol = currencySymbols[currency] || `${currency} `;
  const value = Number(amount);
  if (Number.isNaN(value)) return `${symbol}—`;
  return `${symbol}${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const formatDuration = (days) => {
  const n = Number(days) || 0;
  if (n % 365 === 0 && n >= 365) {
    const years = n / 365;
    return years === 1 ? '1 year' : `${years} years`;
  }
  if (n % 30 === 0 && n >= 30) {
    const months = n / 30;
    return months === 1 ? '1 month' : `${months} months`;
  }
  return n === 1 ? '1 day' : `${n} days`;
};

const defaultPricingCopy = {
  heading: 'Membership Plans',
  subheading:
    'Unlock exclusive benefits and save more on your gaming top-ups with our premium membership plans',
  empty_message: 'No membership plans are available right now. Check back soon.',
  faqs: [
    {
      question: 'Can I change my plan anytime?',
      answer:
        'Yes, you can upgrade or downgrade your plan at any time. Changes take effect on your next eligible purchase.',
    },
    {
      question: 'Do unused benefits carry over?',
      answer:
        'Membership discounts apply while your plan is active. Benefits end when the plan expires unless you renew.',
    },
    {
      question: 'Is there a free trial?',
      answer:
        'Membership plans are paid subscriptions. Discounts apply immediately after purchase for the plan duration.',
    },
    {
      question: 'What payment methods do you accept?',
      answer:
        'We accept UPI, cards, net banking, digital wallets, and Pixie Wallet balance where available.',
    },
  ],
};

const tierVisuals = [
  {
    icon: '🥈',
    color: 'from-gray-400 to-gray-600',
    borderColor: 'border-gray-400',
    glowColor: 'shadow-gray-400/20',
  },
  {
    icon: '🥇',
    color: 'from-yellow-400 to-yellow-600',
    borderColor: 'border-yellow-400',
    glowColor: 'shadow-yellow-400/30',
  },
  {
    icon: '💎',
    color: 'from-purple-400 to-pink-600',
    borderColor: 'border-purple-400',
    glowColor: 'shadow-purple-400/40',
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [copy, setCopy] = useState(defaultPricingCopy);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [{ data }, pricingCopy] = await Promise.all([
        supabase
          .from('membership_plans')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        fetchJsonSetting('pricing_settings', defaultPricingCopy),
      ]);

      if (cancelled) return;
      setPlans(data ?? []);
      setCopy({
        ...defaultPricingCopy,
        ...pricingCopy,
        faqs:
          Array.isArray(pricingCopy?.faqs) && pricingCopy.faqs.length > 0
            ? pricingCopy.faqs
            : defaultPricingCopy.faqs,
      });
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const popularSlug = useMemo(() => {
    if (plans.length === 0) return null;
    const mid = Math.min(1, plans.length - 1);
    return plans[mid]?.slug ?? plans[0]?.slug;
  }, [plans]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
  };

  const cardVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  return (
    <PageWrapper>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            <span className="bg-gradient-to-r from-neon-purple to-neon-blue bg-clip-text text-transparent">
              {copy.heading}
            </span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-3xl mx-auto mb-8">
            {copy.subheading}
          </p>
        </motion.div>

        {loading ? (
          <div className="py-20 text-center text-gray-400">Loading plans…</div>
        ) : plans.length === 0 ? (
          <div className="py-20 text-center text-gray-400">{copy.empty_message}</div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto"
          >
            {plans.map((plan, index) => {
              const visual = tierVisuals[index % tierVisuals.length];
              const popular = plan.slug === popularSlug;
              const benefits = Array.isArray(plan.benefits) ? plan.benefits : [];
              const discount = Number(plan.discount_percent) || 0;

              return (
                <motion.div
                  key={plan.id}
                  variants={cardVariants}
                  whileHover={{ scale: 1.02, y: -10 }}
                  className={`relative bg-gradient-to-br ${visual.color} rounded-2xl p-8 border-2 ${visual.borderColor} ${visual.glowColor} shadow-2xl overflow-hidden ${
                    popular ? 'ring-4 ring-neon-purple/50' : ''
                  }`}
                >
                  {popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-neon-purple to-neon-blue text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                      MOST POPULAR
                    </div>
                  )}

                  <div className="text-center mb-8">
                    <div className="text-6xl mb-4">{visual.icon}</div>
                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <span className="text-4xl font-bold text-white">
                          {formatPrice(plan.price, plan.currency)}
                        </span>
                        <span className="text-gray-300 ml-2">
                          /{formatDuration(plan.duration_days)}
                        </span>
                      </div>
                      {discount > 0 && (
                        <div className="flex items-center justify-center space-x-2">
                          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                            {discount}% off top-ups
                          </span>
                        </div>
                      )}
                    </div>
                    {plan.description ? (
                      <p className="mt-4 text-sm text-gray-200">{plan.description}</p>
                    ) : null}
                  </div>

                  <div className="mb-8">
                    <h4 className="text-white font-semibold mb-4">Features Included:</h4>
                    <ul className="space-y-3">
                      {benefits.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-gray-200">
                          <span className="text-green-400 mr-3 mt-1">✓</span>
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-8">
                    <h4 className="text-white font-semibold mb-4">Plan Details:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Duration:</span>
                        <span className="text-white font-medium">{formatDuration(plan.duration_days)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Top-up discount:</span>
                        <span className="text-white font-medium">{discount}%</span>
                      </div>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/games')}
                    className={`w-full bg-gradient-to-r from-neon-purple to-neon-blue text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-neon-purple/50 transition-all duration-300 ${
                      popular ? 'animate-glow' : ''
                    }`}
                  >
                    Choose {plan.name}
                  </motion.button>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <h2 className="text-3xl font-bold text-white mb-8">Frequently Asked Questions</h2>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {copy.faqs.map((faq) => (
              <div key={faq.question} className="bg-dark-600 rounded-xl p-6 text-left">
                <h3 className="text-neon-purple font-semibold mb-2">{faq.question}</h3>
                <p className="text-gray-300 text-sm">{faq.answer}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-gray-400">
            Looking for more answers?{' '}
            <Link to="/faq" className="text-neon-blue underline">
              Visit the full FAQ
            </Link>
          </p>
        </motion.div>
      </div>
    </PageWrapper>
  );
};

export default Pricing;
