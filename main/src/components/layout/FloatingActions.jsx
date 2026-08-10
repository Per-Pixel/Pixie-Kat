import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, Send, ArrowUp } from 'lucide-react';

const FloatingActions = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'PixieKat', url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <>
      {/* ── Mobile-only FABs (Contact + Share) ─────────────────────────── */}

      {/* Contact / Support button — mobile only */}
      <motion.a
        href="/support"
        aria-label="Contact Support"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed z-[140] flex h-14 w-14 items-center justify-center rounded-full shadow-lg lg:hidden"
        style={{
          bottom: '13rem',  /* shifted up to make room for scroll-to-top */
          right: '1rem',
          backgroundColor: '#DFDFF0',
          color: '#1a1a2e',
        }}
      >
        <Headphones className="h-6 w-6" />
      </motion.a>

      {/* Share button — mobile only */}
      <motion.button
        type="button"
        aria-label="Share"
        onClick={handleShare}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed z-[140] flex h-14 w-14 items-center justify-center rounded-full shadow-lg lg:hidden"
        style={{
          bottom: '9rem',   /* shifted up to make room for scroll-to-top */
          right: '1rem',
          backgroundColor: '#e8a44a',
          color: '#fff',
        }}
      >
        <Send className="h-6 w-6" />
      </motion.button>

      {/* ── Scroll-to-top button — ALL devices ─────────────────────────── */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            key="scroll-to-top"
            type="button"
            aria-label="Scroll to top"
            onClick={scrollToTop}
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            className="fixed z-[140] flex h-14 w-14 items-center justify-center rounded-full shadow-xl"
            style={{
              /* On mobile: just above the bottom nav (64px) + small gap.
                 On desktop (lg+): standard 2rem from bottom edge. */
              bottom: '5rem',
              right: '1rem',
              background: 'linear-gradient(135deg, #7c6ef2 0%, #9f8cff 100%)',
              color: '#fff',
              boxShadow: '0 4px 24px rgba(124, 110, 242, 0.45)',
            }}
          >
            <ArrowUp className="h-6 w-6" strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingActions;
