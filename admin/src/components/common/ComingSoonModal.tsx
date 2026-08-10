import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Clock } from 'lucide-react';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  description?: string;
}

const ComingSoonModal: React.FC<ComingSoonModalProps> = ({
  isOpen,
  onClose,
  featureName,
  description = 'This feature is currently under development and will be available soon.',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon */}
              <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-10 h-10 text-white" />
              </div>

              {/* Content */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary-500" />
                <span className="text-xs font-semibold uppercase tracking-widest text-primary-600">Coming Soon</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{featureName}</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-8">{description}</p>

              {/* Progress bar */}
              <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
                <motion.div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '72%' }}
                  transition={{ delay: 0.3, duration: 1.2, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-gray-400 mb-8">Development progress: 72%</p>

              <button
                onClick={onClose}
                className="btn btn-primary btn-md w-full"
              >
                Got it, thanks!
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ComingSoonModal;
