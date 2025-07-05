import React, { useState } from 'react';
import { motion } from 'framer-motion';
import PageWrapper from '../components/PageWrapper';

const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: 1,
      title: 'Choose Your Game',
      icon: '🎮',
      color: 'from-neon-purple to-neon-blue',
      description: 'Select your favorite game from our extensive collection',
      details: [
        'Browse through 50+ supported games',
        'Popular games like MLBB, PUBG, Free Fire',
        'New games added regularly',
        'All games are officially supported'
      ],
      image: '🎯'
    },
    {
      id: 2,
      title: 'Select Top-up Amount',
      icon: '💎',
      color: 'from-neon-blue to-neon-cyan',
      description: 'Pick the perfect top-up package for your needs',
      details: [
        'Multiple denomination options',
        'Best value packages with bonus rewards',
        'Member exclusive deals and discounts',
        'Transparent pricing with no hidden fees'
      ],
      image: '💰'
    },
    {
      id: 3,
      title: 'Enter Game Details',
      icon: '📝',
      color: 'from-neon-cyan to-neon-pink',
      description: 'Provide your game ID and server information',
      details: [
        'Enter your unique Game ID/User ID',
        'Select your server (if applicable)',
        'Double-check details for accuracy',
        'We guide you on finding your ID'
      ],
      image: '🔍'
    },
    {
      id: 4,
      title: 'Make Payment',
      icon: '💳',
      color: 'from-neon-pink to-neon-purple',
      description: 'Complete your purchase using secure payment methods',
      details: [
        'Multiple payment options available',
        'UPI, Cards, Net Banking, Wallets',
        'SSL encrypted secure transactions',
        'Instant payment confirmation'
      ],
      image: '🔒'
    },
    {
      id: 5,
      title: 'Receive Instantly',
      icon: '⚡',
      color: 'from-neon-purple to-neon-blue',
      description: 'Get your top-up delivered to your game account',
      details: [
        'Average delivery time: 2-5 minutes',
        'Real-time order tracking',
        '24/7 customer support available',
        '99.9% successful delivery rate'
      ],
      image: '🎉'
    }
  ];

  const features = [
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Most orders delivered within 2-5 minutes'
    },
    {
      icon: '🛡️',
      title: '100% Secure',
      description: 'Bank-grade security for all transactions'
    },
    {
      icon: '💰',
      title: 'Best Prices',
      description: 'Competitive rates with exclusive member discounts'
    },
    {
      icon: '🎯',
      title: '99.9% Success',
      description: 'Highest delivery success rate in the industry'
    },
    {
      icon: '📱',
      title: '24/7 Support',
      description: 'Round-the-clock customer assistance'
    },
    {
      icon: '🎁',
      title: 'Bonus Rewards',
      description: 'Extra diamonds/UC with every purchase'
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

  const stepVariants = {
    hidden: { x: -50, opacity: 0 },
    visible: {
      x: 0,
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
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            <span className="bg-gradient-to-r from-neon-purple to-neon-blue bg-clip-text text-transparent">
              How It Works
            </span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-3xl mx-auto">
            Get your favorite games topped up in just 5 simple steps. Fast, secure, and reliable!
          </p>
        </motion.div>

        {/* Steps Process */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-6xl mx-auto mb-16"
        >
          {/* Desktop Timeline */}
          <div className="hidden lg:block">
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-neon-purple via-neon-blue via-neon-cyan via-neon-pink to-neon-purple rounded-full transform -translate-y-1/2"></div>
              
              {/* Steps */}
              <div className="flex justify-between items-center relative z-10">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    variants={stepVariants}
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => setActiveStep(index)}
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-3xl shadow-lg mb-4 ${
                      activeStep === index ? 'ring-4 ring-white/30 animate-glow' : ''
                    }`}>
                      {step.icon}
                    </div>
                    <div className="text-center">
                      <h3 className="text-white font-bold mb-1">{step.title}</h3>
                      <p className="text-gray-400 text-sm max-w-32">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Steps */}
          <div className="lg:hidden space-y-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                variants={stepVariants}
                className={`bg-dark-600 rounded-2xl p-6 border-2 ${
                  activeStep === index ? 'border-neon-purple' : 'border-transparent'
                }`}
                onClick={() => setActiveStep(index)}
              >
                <div className="flex items-center mb-4">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-2xl mr-4`}>
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Step {step.id}</h3>
                    <h4 className="text-neon-purple font-semibold">{step.title}</h4>
                  </div>
                </div>
                <p className="text-gray-300">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Active Step Details */}
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <div className="bg-dark-600 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center mb-6">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${steps[activeStep].color} flex items-center justify-center text-3xl mr-6`}>
                {steps[activeStep].icon}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Step {steps[activeStep].id}</h2>
                <h3 className="text-xl text-neon-purple font-semibold">{steps[activeStep].title}</h3>
              </div>
              <div className="ml-auto text-6xl">
                {steps[activeStep].image}
              </div>
            </div>
            
            <p className="text-gray-300 text-lg mb-6">{steps[activeStep].description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {steps[activeStep].details.map((detail, index) => (
                <div key={index} className="flex items-center text-gray-300">
                  <span className="text-neon-purple mr-3">✓</span>
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Why Choose <span className="text-neon-purple">PixieKat</span>?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-dark-600 rounded-xl p-6 text-center shadow-xl"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-300 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-neon-purple to-neon-blue rounded-2xl p-8 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
            <p className="text-gray-200 mb-6">
              Join thousands of satisfied gamers who trust PixieKat for their gaming needs
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-neon-purple font-bold py-3 px-8 rounded-xl hover:bg-gray-100 transition-colors duration-200"
              >
                Browse Games
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-white text-white font-bold py-3 px-8 rounded-xl hover:bg-white hover:text-neon-purple transition-colors duration-200"
              >
                View Pricing
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            <div>
              <div className="text-3xl font-bold text-neon-purple mb-2">5000+</div>
              <div className="text-gray-400">Happy Customers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-neon-blue mb-2">50+</div>
              <div className="text-gray-400">Games Supported</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-neon-cyan mb-2">99.9%</div>
              <div className="text-gray-400">Success Rate</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-neon-pink mb-2">2 Min</div>
              <div className="text-gray-400">Avg Delivery</div>
            </div>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
};

export default HowItWorks;