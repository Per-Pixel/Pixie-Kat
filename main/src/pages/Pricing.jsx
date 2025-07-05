import React, { useState } from 'react';
import { motion } from 'framer-motion';
import PageWrapper from '../components/PageWrapper';

const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const pricingTiers = [
    {
      name: 'Silver',
      icon: '🥈',
      color: 'from-gray-400 to-gray-600',
      borderColor: 'border-gray-400',
      glowColor: 'shadow-gray-400/20',
      popular: false,
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
      popular: true,
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
      popular: false,
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
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            <span className="bg-gradient-to-r from-neon-purple to-neon-blue bg-clip-text text-transparent">
              Membership Plans
            </span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-3xl mx-auto mb-8">
            Unlock exclusive benefits and save more on your gaming top-ups with our premium membership plans
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-dark-600 rounded-full p-1 flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                  billingCycle === 'monthly'
                    ? 'bg-neon-purple text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                  billingCycle === 'yearly'
                    ? 'bg-neon-purple text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Yearly
                <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
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
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto"
        >
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              variants={cardVariants}
              whileHover={{ scale: 1.02, y: -10 }}
              className={`relative bg-gradient-to-br ${tier.color} rounded-2xl p-8 border-2 ${tier.borderColor} ${tier.glowColor} shadow-2xl overflow-hidden ${
                tier.popular ? 'ring-4 ring-neon-purple/50' : ''
              }`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-neon-purple to-neon-blue text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  MOST POPULAR
                </div>
              )}

              {/* Tier Header */}
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">{tier.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-4xl font-bold text-white">
                      ₹{tier[billingCycle].price}
                    </span>
                    <span className="text-gray-300 ml-2">
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-gray-400 line-through">
                      ₹{tier[billingCycle].originalPrice}
                    </span>
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
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
                    <li key={idx} className="flex items-start text-gray-200">
                      <span className="text-green-400 mr-3 mt-1">✓</span>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Limits */}
              <div className="mb-8">
                <h4 className="text-white font-semibold mb-4">Plan Limits:</h4>
                <div className="space-y-2">
                  {Object.entries(tier.limits).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-300">{key}:</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`w-full bg-gradient-to-r from-neon-purple to-neon-blue text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-neon-purple/50 transition-all duration-300 ${
                  tier.popular ? 'animate-glow' : ''
                }`}
              >
                Choose {tier.name}
              </motion.button>

              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/5 to-neon-blue/5 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>
            </motion.div>
          ))}
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <h2 className="text-3xl font-bold text-white mb-8">Frequently Asked Questions</h2>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-dark-600 rounded-xl p-6">
              <h3 className="text-neon-purple font-semibold mb-2">Can I change my plan anytime?</h3>
              <p className="text-gray-300 text-sm">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            <div className="bg-dark-600 rounded-xl p-6">
              <h3 className="text-neon-purple font-semibold mb-2">Do unused benefits carry over?</h3>
              <p className="text-gray-300 text-sm">Monthly bonuses reset each billing cycle, but your membership benefits remain active.</p>
            </div>
            <div className="bg-dark-600 rounded-xl p-6">
              <h3 className="text-neon-purple font-semibold mb-2">Is there a free trial?</h3>
              <p className="text-gray-300 text-sm">We offer a 7-day free trial for new users to experience our premium features.</p>
            </div>
            <div className="bg-dark-600 rounded-xl p-6">
              <h3 className="text-neon-purple font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-300 text-sm">We accept UPI, cards, net banking, and digital wallets for membership payments.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
};

export default Pricing;