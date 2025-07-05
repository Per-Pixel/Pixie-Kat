import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MobileHelpSection = () => {
  const [showContactModal, setShowContactModal] = useState(false);
  return (
    <div className="px-4 py-6 bg-blue-50">
      {/* Need Help Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white mb-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold mb-2">Need Help?</h3>
            <p className="text-sm opacity-90 mb-4">
              Get instant support for your gaming needs
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowContactModal(true)}
              className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold text-sm"
            >
              Contact Us
            </motion.button>
          </div>
          <div className="text-4xl">
            💬
          </div>
        </div>
      </motion.div>

      {/* Game Categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        viewport={{ once: true }}
        className="mb-6"
      >
        <h4 className="text-lg font-bold text-black mb-4">You might also play these games</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black rounded-xl p-4 text-white">
            <div className="text-2xl mb-2">🎮</div>
            <h5 className="font-bold text-sm">CORPORATE</h5>
          </div>
          <div className="bg-red-500 rounded-xl p-4 text-white">
            <div className="text-2xl mb-2">⚔️</div>
            <h5 className="font-bold text-sm">Valorant</h5>
          </div>
        </div>
      </motion.div>

      {/* Additional Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        viewport={{ once: true }}
        className="bg-gray-800 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-3">
            <span className="text-black text-sm font-bold">i</span>
          </div>
          <h5 className="font-bold">Important Information</h5>
        </div>
        <p className="text-sm opacity-90 leading-relaxed">
          Make sure to check your game ID and server before making any purchase. 
          All transactions are processed securely and instantly.
        </p>
      </motion.div>

      {/* Contact Modal */}
      <AnimatePresence>
        {showContactModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black bg-opacity-50 flex items-center justify-center p-4"
            onClick={() => setShowContactModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">📞</div>
                <h3 className="text-xl font-bold text-black mb-4">Contact Support</h3>

                <div className="space-y-4">
                  <motion.a
                    href="mailto:support@uxsiostore.com"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="block bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                  >
                    📧 Email Support
                  </motion.a>

                  <motion.a
                    href="tel:+1234567890"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="block bg-green-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-600 transition-colors"
                  >
                    📱 Call Support
                  </motion.a>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => window.open('https://wa.me/1234567890', '_blank')}
                    className="block w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    💬 WhatsApp Support
                  </motion.button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowContactModal(false)}
                  className="mt-4 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileHelpSection;
