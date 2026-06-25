import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import PageWrapper from '../../components/common/PageWrapper';

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef(null);

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const scrollLeft = container.scrollLeft;
    const cardWidth = container.firstElementChild?.clientWidth || 0;
    const gap = 16;
    const index = Math.round(scrollLeft / (cardWidth + gap));
    setActiveSlide(Math.min(index, pricingTiers.length - 1));
  };

  const scrollToSlide = (index) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const card = container.children[index];
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const pricingTiers = [
    {
      name: 'Silver',
      icon: '🥈',
      color: 'from-gray-400 to-gray-600',
      borderColor: 'border-gray-400',
      glowColor: 'shadow-gray-400/20',
      accentColor: 'shadow-gray-400/40',
      accentBg: 'bg-gray-400',
      accentText: 'text-gray-400',
      popular: false,
      rotation: 'rotate-[-1deg]',
      monthly: {
        price: 299,
        originalPrice: 399,
        discount: '25% OFF'
      },
      yearly: {
        price: 2999,
        originalPrice: 4788,
        discount: '37% OFF'
      },
      features: [
        '5% Extra Diamonds/UC on all purchases',
        'Priority customer support',
        'Exclusive Silver member deals',
        'Monthly bonus rewards',
        'Access to flash sales',
        'Basic transaction history'
      ],
      limits: {
        'Monthly Top-up Limit': '₹10,000',
        'Bonus Rate': '5%',
        'Support Response': '< 2 hours'
      }
    },
    {
      name: 'Gold',
      icon: '🥇',
      color: 'from-yellow-400 to-yellow-600',
      borderColor: 'border-yellow-400',
      glowColor: 'shadow-yellow-400/30',
      accentColor: 'shadow-yellow-400/40',
      accentBg: 'bg-yellow-400',
      accentText: 'text-yellow-400',
      popular: true,
      rotation: 'rotate-[1deg]',
      monthly: {
        price: 599,
        originalPrice: 799,
        discount: '25% OFF'
      },
      yearly: {
        price: 5999,
        originalPrice: 9588,
        discount: '37% OFF'
      },
      features: [
        '10% Extra Diamonds/UC on all purchases',
        'VIP customer support (24/7)',
        'Exclusive Gold member deals',
        'Weekly bonus rewards',
        'Early access to new games',
        'Advanced transaction analytics',
        'Custom payment methods',
        'Referral bonus program'
      ],
      limits: {
        'Monthly Top-up Limit': '₹25,000',
        'Bonus Rate': '10%',
        'Support Response': '< 30 minutes'
      }
    },
    {
      name: 'Diamond',
      icon: '💎',
      color: 'from-purple-400 to-pink-600',
      borderColor: 'border-purple-400',
      glowColor: 'shadow-purple-400/40',
      accentColor: 'shadow-purple-400/40',
      accentBg: 'bg-purple-400',
      accentText: 'text-purple-400',
      popular: false,
      rotation: 'rotate-[-2deg]',
      monthly: {
        price: 999,
        originalPrice: 1299,
        discount: '23% OFF'
      },
      yearly: {
        price: 9999,
        originalPrice: 15588,
        discount: '36% OFF'
      },
      features: [
        '15% Extra Diamonds/UC on all purchases',
        'Dedicated account manager',
        'Exclusive Diamond member deals',
        'Daily bonus rewards',
        'Beta access to new features',
        'Premium transaction analytics',
        'All payment methods supported',
        'Enhanced referral rewards',
        'Custom top-up packages',
        'Priority game updates'
      ],
      limits: {
        'Monthly Top-up Limit': 'Unlimited',
        'Bonus Rate': '15%',
        'Support Response': '< 15 minutes'
      }
    }
  ];

  const faqItems = [
    {
      q: 'Can I change my plan anytime?',
      a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.'
    },
    {
      q: 'Do unused benefits carry over?',
      a: 'Monthly bonuses reset each billing cycle, but your membership benefits remain active.'
    },
    {
      q: 'Is there a free trial?',
      a: 'We offer a 7-day free trial for new users to experience our premium features.'
    },
    {
      q: 'What payment methods do you accept?',
      a: 'We accept UPI, cards, net banking, and digital wallets for membership payments.'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <PageWrapper>
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="relative inline-block">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Membership Plans
              </span>
            </h1>
            <div className="absolute -right-8 -top-2 text-amber-500 rotate-12 text-2xl">✨</div>
            <div className="absolute -left-6 bottom-0 text-blue-600 -rotate-12 text-2xl">⭐</div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-48 h-3 bg-blue-500/20 rotate-[-1deg] rounded-full blur-sm" />
          </div>
          <p className="text-zinc-700 text-lg md:text-xl max-w-3xl mx-auto mb-8">
            Unlock exclusive benefits and save more on your gaming top-ups with our premium membership plans
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-8">
            <div className="relative bg-white border-2 border-zinc-200 rounded-full p-1 flex shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`relative px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                  billingCycle === 'monthly'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`relative px-6 py-2 rounded-full font-medium transition-all duration-300 flex items-center ${
                  billingCycle === 'yearly'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Yearly
                <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full border border-green-600/20">
                  Save 37%
                </span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          ref={carouselRef}
          className="flex md:grid md:grid-cols-3 gap-4 md:gap-8 max-w-7xl mx-auto overflow-x-auto snap-x snap-mandatory pb-6 md:overflow-visible md:snap-none scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              variants={cardVariants}
              whileHover={{ scale: 1.02, y: -10 }}
              className={`relative group ${tier.rotation} snap-center shrink-0 w-[85vw] max-w-[360px] md:w-auto md:max-w-none`}
            >
              {/* Shadow layer */}
              <div className={`
                absolute inset-0 bg-[#0E041D]
                border-2 border-white/20
                rounded-2xl
                shadow-[6px_6px_0px_0px_rgba(255,255,255,0.08)]
                transition-all duration-300
                group-hover:shadow-[10px_10px_0px_0px_rgba(255,255,255,0.12)]
                group-hover:translate-x-[-4px]
                group-hover:translate-y-[-4px]
              `} />

              {/* Card content */}
              <div className="relative bg-[#0E041D] border-2 border-white/20 rounded-2xl p-8 overflow-hidden flex flex-col h-full">
                {/* Popular Badge */}
                {tier.popular && (
                  <div className="absolute -top-3 -right-2 bg-gradient-to-r from-neon-purple to-neon-blue text-white font-bold px-4 py-1 rounded-full rotate-6 text-sm border-2 border-white/20 shadow-lg z-10">
                    Popular!
                  </div>
                )}

                {/* Tier Header */}
                <div className="text-center mb-8">
                  <div className={`
                    w-16 h-16 rounded-full mb-4 mx-auto
                    flex items-center justify-center
                    border-2 border-white/20
                    bg-white/10 text-3xl
                  `}>
                    {tier.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                  <div className="text-center">
                    <div className="flex items-baseline justify-center mb-2">
                      <span className="text-4xl font-bold text-white">
                        ₹{tier[billingCycle].price}
                      </span>
                      <span className="text-gray-400 ml-2 text-lg">
                        /{billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-gray-500 line-through text-sm">
                        ₹{tier[billingCycle].originalPrice}
                      </span>
                      <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/30">
                        {tier[billingCycle].discount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="mb-8">
                  <h4 className="text-white font-semibold mb-4">Features Included:</h4>
                  <ul className="space-y-3">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-gray-300">
                        <div className="w-5 h-5 rounded-full border-2 border-green-400/60 flex items-center justify-center mr-3 mt-0.5 shrink-0">
                          <Check className="w-3 h-3 text-green-400" />
                        </div>
                        <span className="text-sm leading-5">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Limits */}
                <div className="mb-8 flex-grow">
                  <h4 className="text-white font-semibold mb-4">Plan Limits:</h4>
                  <div className="space-y-3">
                    {Object.entries(tier.limits).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">{key}:</span>
                        <span className="text-white font-medium bg-white/5 px-2 py-1 rounded-md">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    w-full relative font-bold py-4 px-6 rounded-xl
                    transition-all duration-300
                    border-2 border-white/20
                    shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]
                    hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)]
                    hover:translate-x-[-2px] hover:translate-y-[-2px]
                    ${tier.popular
                      ? 'bg-gradient-to-r from-neon-purple to-neon-blue text-white'
                      : 'bg-white/10 text-white hover:bg-white/15'
                    }
                  `}
                >
                  Choose {tier.name}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile Carousel Dots */}
        <div className="flex justify-center gap-2 mt-2 mb-4 md:hidden">
          {pricingTiers.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                activeSlide === index
                  ? 'bg-neon-purple w-6'
                  : 'bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-20 text-center"
        >
          <h2 className="text-3xl font-bold text-zinc-900 mb-10">Frequently Asked Questions</h2>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqItems.map((item, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02, y: -4 }}
                className={`
                  relative group
                  ${index === 0 && 'rotate-[-1deg]'}
                  ${index === 1 && 'rotate-[1deg]'}
                  ${index === 2 && 'rotate-[0.5deg]'}
                  ${index === 3 && 'rotate-[-0.5deg]'}
                `}
              >
                <div className={`
                  absolute inset-0 bg-[#0E041D]
                  border-2 border-white/10
                  rounded-xl
                  shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]
                  transition-all duration-300
                  group-hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.08)]
                  group-hover:translate-x-[-2px]
                  group-hover:translate-y-[-2px]
                `} />
                <div className="relative bg-[#0E041D] border-2 border-white/10 rounded-xl p-6 text-left">
                  <h3 className="text-neon-purple font-semibold mb-2">{item.q}</h3>
                  <p className="text-gray-400 text-sm">{item.a}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Decorative elements */}
        <div className="absolute -z-10 inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-40 left-10 text-4xl rotate-12 opacity-20">✨</div>
          <div className="absolute bottom-60 right-10 text-4xl -rotate-12 opacity-20">⭐</div>
          <div className="absolute top-1/2 left-5 text-3xl -rotate-6 opacity-10">💎</div>
          <div className="absolute top-20 right-20 text-3xl rotate-6 opacity-10">🥇</div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Pricing;
