import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildWhatsAppUrl, fetchContactSettings, DEFAULT_CONTACT } from '../../../lib/storeContent';

const MobileHelpSection = () => {
  const [showContactModal, setShowContactModal] = useState(false);
  const [contact, setContact] = useState(DEFAULT_CONTACT);

  useEffect(() => {
    fetchContactSettings().then(setContact);
  }, []);

  const phoneHref = contact.support_phone || contact.phone_display
    ? `tel:${String(contact.support_phone || contact.phone_display).replace(/[^\d+]/g, '')}`
    : '/support/contact-us';

  const whatsappUrl = buildWhatsAppUrl(contact.whatsapp, contact.whatsapp_message);

  return (
    <div className="bg-blue-50 px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="mb-6 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="mb-2 text-lg font-bold">Need Help?</h3>
            <p className="mb-4 text-sm opacity-90">
              Get instant support for your gaming needs
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowContactModal(true)}
              className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-black"
            >
              Contact Us
            </motion.button>
          </div>
          <div className="text-4xl">
            💬
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        viewport={{ once: true }}
        className="mb-6"
      >
        <h4 className="mb-4 text-lg font-bold text-black">You might also play these games</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-black p-4 text-white">
            <div className="mb-2 text-2xl">🔥</div>
            <h5 className="text-sm font-bold">Free Fire</h5>
          </div>
          <div className="rounded-xl bg-red-500 p-4 text-white">
            <div className="mb-2 text-2xl">⚔️</div>
            <h5 className="text-sm font-bold">Valorant</h5>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        viewport={{ once: true }}
        className="rounded-2xl bg-gray-800 p-6 text-white"
      >
        <div className="mb-4 flex items-center">
          <div className="mr-3 flex size-8 items-center justify-center rounded-full bg-white">
            <span className="text-sm font-bold text-black">i</span>
          </div>
          <h5 className="font-bold">Important Information</h5>
        </div>
        <p className="text-sm leading-relaxed opacity-90">
          Make sure to check your game ID and server before making any purchase.
          All transactions are processed securely and instantly.
        </p>
      </motion.div>

      <AnimatePresence>
        {showContactModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={() => setShowContactModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="mb-4 text-4xl">📞</div>
                <h3 className="mb-4 text-xl font-bold text-black">Contact Support</h3>

                <div className="space-y-4">
                  <motion.a
                    href={`mailto:${contact.support_email}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="block rounded-lg bg-blue-500 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-600"
                  >
                    📧 Email Support
                  </motion.a>

                  {(contact.support_phone || contact.phone_display) ? (
                    <motion.a
                      href={phoneHref}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="block rounded-lg bg-green-500 px-4 py-3 font-medium text-white transition-colors hover:bg-green-600"
                    >
                      📱 Call Support
                    </motion.a>
                  ) : null}

                  <motion.a
                    href={whatsappUrl}
                    target={whatsappUrl.startsWith('http') ? '_blank' : undefined}
                    rel={whatsappUrl.startsWith('http') ? 'noreferrer' : undefined}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="block w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-700"
                  >
                    💬 WhatsApp Support
                  </motion.a>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowContactModal(false)}
                  className="mt-4 text-gray-500 transition-colors hover:text-gray-700"
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
