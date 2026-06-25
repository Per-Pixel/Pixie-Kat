import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';

const quotes = [
  'Top up. Dominate. Repeat.',
  'Power delivered at the speed of gaming.',
  'Fueling champions, one credit at a time.',
  'Premium credits. Instant delivery.',
  'The arena awaits. Load fast, play faster.',
  'Your next victory starts here.',
  'No lag. No wait. Just wins.',
];

const floatingIcons = [
  { icon: '🎮', x: '8%',  y: '15%', size: 'text-3xl', delay: 0 },
  { icon: '⚡', x: '88%', y: '12%', size: 'text-2xl', delay: 0.4 },
  { icon: '🏆', x: '5%',  y: '70%', size: 'text-2xl', delay: 0.8 },
  { icon: '💎', x: '92%', y: '65%', size: 'text-2xl', delay: 0.2 },
  { icon: '🔥', x: '18%', y: '82%', size: 'text-xl',  delay: 1.0 },
  { icon: '🎯', x: '80%', y: '80%', size: 'text-xl',  delay: 0.6 },
  { icon: '👾', x: '50%', y: '8%',  size: 'text-2xl', delay: 1.2 },
  { icon: '🚀', x: '70%', y: '25%', size: 'text-xl',  delay: 0.3 },
];

const LoadingScreen: React.FC = () => {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setQuoteIndex(i => (i + 1) % quotes.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: 'linear-gradient(135deg, #080812 0%, #120828 50%, #080818 100%)' }}
    >
      {/* Dot-grid pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(139,92,246,0.35) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      {/* Floating icons */}
      {floatingIcons.map((item, i) => (
        <motion.div
          key={i}
          className={`absolute ${item.size} pointer-events-none`}
          style={{ left: item.x, top: item.y }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0.08, 0.22, 0.08], y: [-8, 8, -8], scale: [0.9, 1.05, 0.9] }}
          transition={{ duration: 3 + i * 0.4, delay: item.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          {item.icon}
        </motion.div>
      ))}

      {/* Glow orb */}
      <div
        className="absolute w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)' }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo icon */}
        <motion.div
          animate={{ scale: [1, 1.06, 1], boxShadow: ['0 0 20px rgba(124,58,237,0.3)', '0 0 40px rgba(124,58,237,0.6)', '0 0 20px rgba(124,58,237,0.3)'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
        >
          <Gamepad2 className="w-10 h-10 text-white" strokeWidth={1.5} />
        </motion.div>

        {/* Brand name */}
        <h1 className="text-5xl font-black tracking-tight text-white mb-1">
          Pixie<span style={{ color: '#a78bfa' }}>Kat</span>
        </h1>
        <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-10" style={{ color: '#6d28d9' }}>
          Admin Control Center
        </p>

        {/* Progress bar */}
        <div className="w-56 h-1 rounded-full mb-6 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #7c3aed, #a78bfa)' }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Rotating quote */}
        <AnimatePresence mode="wait">
          <motion.p
            key={quoteIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="text-sm font-medium text-center px-8"
            style={{ color: '#9ca3af' }}
          >
            {quotes[quoteIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LoadingScreen;
