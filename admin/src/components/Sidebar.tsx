import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  Wallet,
  FileText,
  TrendingUp,
  MessageSquare,
  Bell,
  BarChart3,
  Shield,
  ChevronDown,
  ChevronRight,
  X,
  HardDrive,
  Settings,
  ClipboardList,
  Crown,
  Plug,
} from 'lucide-react';

interface SubSubMenuItem {
  label: string;
  path: string;
}

interface SubMenuItem {
  label: string;
  path?: string;
  children?: SubSubMenuItem[];
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path?: string;
  subItems?: SubMenuItem[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const isMobileViewport = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [expandedSubItems, setExpandedSubItems] = useState<string[]>([]);

  const navigateAndMaybeClose = (path: string) => {
    navigate(path);
    // Only auto-close after nav on mobile overlay mode — desktop collapse is user-controlled.
    if (isMobileViewport()) onClose();
  };

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      subItems: [
        { label: 'All Products', path: '/products' },
        { label: 'Games', path: '/products/games' },
        { label: 'Active', path: '/products/active' },
        { label: 'Drafts', path: '/products/drafts' },
      ],
    },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, path: '/orders' },
    { id: 'users', label: 'Users', icon: Users, path: '/users' },
    { id: 'wallets', label: 'Wallets', icon: Wallet, path: '/wallets' },
    { id: 'memberships', label: 'Memberships', icon: Crown, path: '/memberships' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
    {
      id: 'content',
      label: 'Content',
      icon: FileText,
      subItems: [
        {
          label: 'Homepage',
          path: '/pages/homepage',
          children: [
            { label: 'Hero Section', path: '/pages/homepage/hero' },
            { label: 'About Section', path: '/pages/homepage/about' },
            { label: 'Trending Games', path: '/pages/homepage/trending-games' },
            { label: 'Exclusive Offers', path: '/pages/homepage/exclusive-offers' },
          ],
        },
        { label: 'Products Page', path: '/pages/products' },
        { label: 'JJK Cheaper Guide', path: '/pages/events/jjk-cheaper' },
        { label: 'How It Works', path: '/pages/how-it-works' },
        { label: 'FAQ', path: '/pages/faq' },
        { label: 'Contact Page', path: '/pages/contact' },
        { label: 'Pricing Copy', path: '/pages/pricing' },
        { label: 'Footer Section', path: '/pages/footer' },
        { label: 'Legal & Policies', path: '/pages/legal' },
      ],
    },
    {
      id: 'revenue',
      label: 'Revenue',
      icon: TrendingUp,
      subItems: [
        { label: 'Overview', path: '/revenue/sales-overview' },
        { label: 'Products', path: '/revenue/products' },
        { label: 'Orders', path: '/revenue/orders' },
        { label: 'Brokers', path: '/revenue/brokers' },
        { label: 'Referral', path: '/revenue/referral' },
      ],
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      subItems: [
        { label: 'Inbox', path: '/messages' },
        { label: 'Compose', path: '/messages/compose' },
        { label: 'Sent', path: '/messages/sent' },
      ],
    },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
    {
      id: 'auth',
      label: 'Access',
      icon: Shield,
      subItems: [
        { label: 'All Users', path: '/auth/users' },
        { label: 'Brokers', path: '/auth/broker' },
        { label: 'Admins', path: '/auth/admin' },
        { label: 'Clients', path: '/auth/clients' },
        { label: 'Referrals', path: '/auth/referrals' },
        { label: 'Permissions', path: '/auth/permissions' },
      ],
    },
    {
      id: 'providers',
      label: 'Providers',
      icon: Plug,
      subItems: [
        { label: 'All Providers', path: '/providers' },
        { label: 'Smile One', path: '/providers/smile-one' },
        { label: 'Smile Coin', path: '/providers/smile-coin' },
        { label: 'API Console', path: '/providers/smile-coin/api-console' },
      ],
    },
    { id: 'storage', label: 'Storage', icon: HardDrive, path: '/storage' },
    { id: 'activity-logs', label: 'Activity Logs', icon: ClipboardList, path: '/activity-logs' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleSubExpanded = (key: string) => {
    setExpandedSubItems(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.subItems) {
      toggleExpanded(item.id);
    } else if (item.path) {
      navigateAndMaybeClose(item.path);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const isPathUnder = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const isSubItemActive = (sub: SubMenuItem): boolean => {
    if (!sub.path) return false;
    if (sub.children) return sub.children.some(c => isPathUnder(c.path));
    return isPathUnder(sub.path);
  };

  const isParentActive = (item: MenuItem): boolean => {
    if (item.path) return isActive(item.path);
    if (item.subItems) {
      return item.subItems.some(sub => isSubItemActive(sub));
    }
    return false;
  };

  const panelStyle: React.CSSProperties = {
    background: '#0c0c18',
    backgroundImage: 'radial-gradient(circle, rgba(139,92,246,0.12) 1px, transparent 1px)',
    backgroundSize: '28px 28px',
  };

  const renderPanel = (showMobileClose: boolean) => (
    <div className="flex h-full w-64 flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-white/5">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">PK</span>
          </div>
          <span className="ml-2 text-xl font-black text-white tracking-tight">
            Pixie<span style={{ color: '#a78bfa' }}>Kat</span>
          </span>
        </div>
        {showMobileClose ? (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <span className="w-5" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {menuItems.map((item, index) => {
          const isExpanded = expandedItems.includes(item.id);
          const parentActive = isParentActive(item);
          const Icon = item.icon;

          return (
            <motion.div
              key={item.id}
              initial={false}
              animate={isOpen ? { opacity: 1, x: 0 } : { opacity: 0.35, x: -6 }}
              transition={{ duration: 0.2, delay: isOpen ? index * 0.018 : 0 }}
            >
              {/* Level 1 */}
              <button
                type="button"
                onClick={() => handleItemClick(item)}
                className={clsx(
                  'w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                  parentActive
                    ? 'bg-gradient-to-r from-violet-600/80 to-purple-700/60 text-white shadow-lg shadow-violet-900/40'
                    : 'text-gray-500 hover:bg-white/5 hover:text-white'
                )}
              >
                <div className="flex items-center">
                  <Icon className="w-4 h-4 mr-3 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.subItems && (
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
                  </motion.div>
                )}
              </button>

              {/* Level 2 */}
              <AnimatePresence>
                {item.subItems && isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-0.5 space-y-0.5 pb-1">
                      {item.subItems.map((sub) => {
                        const subKey = `${item.id}__${sub.label}`;
                        const isSubExpanded = expandedSubItems.includes(subKey);
                        const subActive = isSubItemActive(sub);

                        return (
                          <div key={sub.label}>
                            <button
                              type="button"
                              onClick={() => {
                                if (sub.children) {
                                  toggleSubExpanded(subKey);
                                } else if (sub.path) {
                                  navigateAndMaybeClose(sub.path);
                                }
                              }}
                              className={clsx(
                                'w-full flex items-center justify-between pl-9 pr-3 py-2 text-sm rounded-lg transition-colors duration-150',
                                subActive
                                  ? 'text-violet-300 font-medium'
                                  : 'text-gray-600 hover:bg-white/5 hover:text-gray-200'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <ChevronRight className="w-3 h-3 shrink-0 text-gray-700" />
                                <span>{sub.label}</span>
                              </div>
                              {sub.children && (
                                <motion.div
                                  animate={{ rotate: isSubExpanded ? 90 : 0 }}
                                  transition={{ duration: 0.15 }}
                                >
                                  <ChevronRight className="w-3 h-3 text-gray-600" />
                                </motion.div>
                              )}
                            </button>

                            {/* Level 3 */}
                            <AnimatePresence>
                              {sub.children && isSubExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-0.5 space-y-0.5 pb-0.5">
                                    {sub.children.map((child) => (
                                      <button
                                        type="button"
                                        key={child.path}
                                        onClick={() => navigateAndMaybeClose(child.path)}
                                        className={clsx(
                                          'w-full flex items-center pl-14 pr-3 py-1.5 text-xs rounded-lg transition-colors',
                                          isActive(child.path)
                                            ? 'text-violet-300 font-semibold'
                                            : 'text-gray-600 hover:bg-white/5 hover:text-gray-300'
                                        )}
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 opacity-40 shrink-0" />
                                        {child.label}
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </nav>
    </div>
  );

  const spring = { type: 'spring' as const, stiffness: 380, damping: 36, mass: 0.85 };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <motion.aside
        className="fixed inset-y-0 left-0 z-50 w-64 shadow-2xl border-r border-white/5 lg:hidden"
        style={panelStyle}
        initial={false}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={spring}
        aria-hidden={!isOpen}
      >
        {renderPanel(true)}
      </motion.aside>

      {/* Desktop collapsible rail — width spring so content slides with it */}
      <motion.div
        className="relative z-20 hidden h-full shrink-0 overflow-hidden lg:block"
        initial={false}
        animate={{ width: isOpen ? 256 : 0 }}
        transition={spring}
        aria-hidden={!isOpen}
      >
        <aside className="h-full w-64 border-r border-white/5 shadow-2xl" style={panelStyle}>
          {renderPanel(false)}
        </aside>
      </motion.div>
    </>
  );
};

export default Sidebar;
