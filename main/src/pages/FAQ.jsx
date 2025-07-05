import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageWrapper from '../components/PageWrapper';

const FAQ = () => {
  const [openItems, setOpenItems] = useState(new Set([0])); // First item open by default

  const faqCategories = [
    {
      title: 'Payment & Billing',
      icon: '💳',
      color: 'from-neon-purple to-neon-blue',
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
      color: 'from-neon-blue to-neon-cyan',
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
      color: 'from-neon-cyan to-neon-pink',
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
      color: 'from-neon-pink to-neon-purple',
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
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const categoryVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
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
              Frequently Asked Questions
            </span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-3xl mx-auto">
            Find answers to common questions about PixieKat's services, payments, and support
          </p>
        </motion.div>

        {/* FAQ Categories */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto space-y-8"
        >
          {faqCategories.map((category, categoryIndex) => (
            <motion.div
              key={categoryIndex}
              variants={categoryVariants}
              className="bg-dark-600 rounded-2xl overflow-hidden shadow-xl"
            >
              {/* Category Header */}
              <div className={`bg-gradient-to-r ${category.color} p-6`}>
                <div className="flex items-center">
                  <span className="text-3xl mr-4">{category.icon}</span>
                  <h2 className="text-2xl font-bold text-white">{category.title}</h2>
                </div>
              </div>

              {/* Questions */}
              <div className="p-6 space-y-4">
                {category.questions.map((item, questionIndex) => {
                  const itemId = `${categoryIndex}-${questionIndex}`;
                  const isOpen = openItems.has(itemId);

                  return (
                    <div key={questionIndex} className="border-b border-gray-700 last:border-b-0">
                      <button
                        onClick={() => toggleItem(categoryIndex, questionIndex)}
                        className="w-full text-left py-4 flex items-center justify-between hover:text-neon-purple transition-colors duration-200"
                      >
                        <span className="text-white font-medium pr-4">{item.question}</span>
                        <motion.span
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-neon-purple text-xl flex-shrink-0"
                        >
                          ▼
                        </motion.span>
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
                            <div className="pb-4 text-gray-300 leading-relaxed">
                              {item.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Contact Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-neon-purple to-neon-blue rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">Still have questions?</h3>
            <p className="text-gray-200 mb-6">
              Our support team is available 24/7 to help you with any questions or concerns.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-neon-purple font-bold py-3 px-6 rounded-xl hover:bg-gray-100 transition-colors duration-200"
              >
                Contact Support
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="border-2 border-white text-white font-bold py-3 px-6 rounded-xl hover:bg-white hover:text-neon-purple transition-colors duration-200"
              >
                WhatsApp Us
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
};

export default FAQ;