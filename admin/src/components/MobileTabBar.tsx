import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import {
  Home,
  ShoppingCart,
  Plus,
  MessageSquare,
  LayoutGrid,
  BadgePercent,
  TrendingUp,
  Zap,
  Package,
  Gamepad2,
  PenSquare,
  X,
} from 'lucide-react';

interface MobileTabBarProps {
  onOpenSidebar: () => void;
}

const spring = { type: 'spring' as const, stiffness: 420, damping: 34 };

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
  path?: string;
  match?: (p: string) => boolean;
  isFab?: boolean;
  isMenu?: boolean;
}

const quickActions = [
  { label: 'New Promotion', desc: 'Promo card + /promotions page', icon: BadgePercent, path: '/pages/promotions/new' },
  { label: 'Trending Item', desc: 'Homepage carousel card', icon: TrendingUp, path: '/pages/homepage/trending-games/new' },
  { label: 'Exclusive Offer', desc: 'Homepage offer grid card', icon: Zap, path: '/pages/homepage/exclusive-offers/new' },
  { label: 'New Product', desc: 'Add a top-up product', icon: Package, path: '/quick/add-product' },
  { label: 'New Game', desc: 'Add a game to the catalog', icon: Gamepad2, path: '/products/games/new' },
  { label: 'Compose Message', desc: 'Send a message to a user', icon: PenSquare, path: '/messages/compose' },
];

const MobileTabBar: React.FC<MobileTabBarProps> = ({ onOpenSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [addOpen, setAddOpen] = useState(false);

  const tabs: Tab[] = [
    { id: 'home', label: 'Home', icon: Home, path: '/dashboard', match: (p: string) => p === '/dashboard' || p === '/' },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, path: '/orders', match: (p: string) => p.startsWith('/orders') },
    { id: 'add', label: 'Add', icon: Plus, isFab: true },
    { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/messages', match: (p: string) => p.startsWith('/messages') },
    { id: 'more', label: 'More', icon: LayoutGrid, isMenu: true },
  ];

  const go = (path?: string) => {
    setAddOpen(false);
    if (path) navigate(path);
  };

  return (
    <>
      {/* Bottom tab bar — mobile only */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary"
      >
        <div className="mx-3 mb-2 flex items-center justify-between rounded-2xl border border-white/10 bg-[#0c0c18]/95 px-1.5 py-1.5 shadow-2xl shadow-black/40 backdrop-blur-md">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.path ? tab.match?.(location.pathname) : false;

            if (tab.isFab) {
              return (
                <motion.button
                  key={tab.id}
                  type="button"
                  onClick={() => setAddOpen(true)}
                  whileTap={{ scale: 0.88 }}
                  className="mx-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-violet-900/50"
                  aria-label="Quick add"
                >
                  <Icon className="h-5 w-5" />
                </motion.button>
              );
            }

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => (tab.isMenu ? onOpenSidebar() : go(tab.path))}
                className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5"
                aria-label={tab.label}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-tab-pill"
                    transition={spring}
                    className="absolute inset-0 rounded-xl bg-violet-600/80"
                  />
                )}
                <motion.span
                  whileTap={{ scale: 0.85 }}
                  className={clsx(
                    'relative z-10 flex flex-col items-center gap-0.5',
                    active ? 'text-white' : 'text-gray-500'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium leading-none">{tab.label}</span>
                </motion.span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Quick-add bottom sheet */}
      <AnimatePresence>
        {addOpen && (
          <>
            <motion.div
              key="qa-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setAddOpen(false)}
            />
            <motion.div
              key="qa-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Quick add"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={spring}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 600) setAddOpen(false);
              }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[#12121f] px-5 pb-6 pt-3 lg:hidden"
              style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Quick add</h2>
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {quickActions.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <motion.button
                      key={action.path}
                      type="button"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 + i * 0.03 }}
                      onClick={() => go(action.path)}
                      className="flex flex-col items-start gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-3.5 text-left active:bg-white/10"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/30 text-violet-300">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-sm font-semibold text-white">{action.label}</span>
                      <span className="text-[11px] leading-tight text-gray-500">{action.desc}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileTabBar;
