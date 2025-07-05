import React from 'react';
import { motion } from 'framer-motion';

const ContactSection = () => {
  const contactMethods = [
    {
      id: 'email',
      name: 'Email',
      icon: '📧',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: '💬',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: '📷',
      color: 'bg-pink-500',
      hoverColor: 'hover:bg-pink-600'
    },
    {
      id: 'discord',
      name: 'Discord',
      icon: '🎮',
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-600'
    }
  ];

  const paymentMethods = [
    { name: 'Visa', color: 'bg-blue-600' },
    { name: 'MC', color: 'bg-red-500' },
    { name: 'PayPal', color: 'bg-blue-500' },
    { name: 'Skrill', color: 'bg-purple-600' },
    { name: 'OVO', color: 'bg-blue-400' },
    { name: 'DANA', color: 'bg-blue-500' }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="py-8 md:py-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Contact Us Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-8 md:mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-black mb-6 md:mb-8">Contact Us</h2>

          {/* Contact Methods Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-2xl mx-auto mb-8 md:mb-16"
          >
            {contactMethods.map((method) => (
              <motion.button
                key={method.id}
                variants={itemVariants}
                whileHover={{
                  scale: 1.03,
                  y: -2,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.97 }}
                className={`${method.color} ${method.hoverColor} text-white py-3 md:py-4 px-4 md:px-6 rounded-lg md:rounded-xl font-medium transition-all duration-300 shadow-md hover:shadow-lg flex flex-col items-center space-y-1 md:space-y-2`}
              >
                <span className="text-xl md:text-2xl">{method.icon}</span>
                <span className="text-xs md:text-sm font-bold">{method.name}</span>
              </motion.button>
            ))}
          </motion.div>
        </motion.div>

        {/* Footer Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="bg-gray-900 rounded-xl md:rounded-2xl p-6 md:p-8 text-white"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Company Info */}
            <div className="md:col-span-1">
              <div className="flex items-center mb-3 md:mb-4">
                <span className="text-xl md:text-2xl mr-2">✚</span>
                <span className="text-lg md:text-xl font-bold">UXSIOSTORE</span>
              </div>
              <p className="text-gray-300 text-xs md:text-sm leading-relaxed mb-3 md:mb-4">
                UXSIOSTORE is a practical solution for every game lover who wants to buy game vouchers without having to go to a physical store.
              </p>
              <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                With a variety of game choices, community comments, and vouchers, UXSIOSTORE can provide a comfortable and satisfying experience for all gamers.
              </p>
            </div>

            {/* Site Map */}
            <div>
              <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4">Site Map</h3>
              <ul className="space-y-1 md:space-y-2 text-xs md:text-sm text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">UXSIOSTORE Official</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Games</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Promotions</a></li>
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Affiliate Program</a></li>
              </ul>
            </div>

            {/* Payment Methods */}
            <div>
              <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4">Payment Method</h3>
              <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                {paymentMethods.map((method, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    className={`${method.color} text-white text-xs font-bold py-1.5 md:py-2 px-2 md:px-3 rounded text-center cursor-pointer transition-transform`}
                  >
                    {method.name}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-700 mt-6 md:mt-8 pt-4 md:pt-6 text-center">
            <p className="text-gray-400 text-xs md:text-sm">
              Copyright © 2023 UXSIOSTORE
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactSection;
