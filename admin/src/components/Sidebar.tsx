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

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [expandedSubItems, setExpandedSubItems] = useState<string[]>([]);

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
            { label: 'Trending Games', path: '/pages/homepage/trending-games' },
            { label: 'Exclusive Offers', path: '/pages/homepage/exclusive-offers' },
          ],
        },
        { label: 'Products Page', path: '/pages/products' },
        { label: 'About Page', path: '/pages/about' },
        { label: 'Contact Page', path: '/pages/contact' },
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
      navigate(item.path);
      onClose();
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

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl border-r border-gray-200',
          'lg:static lg:translate-x-0 lg:block',
          isOpen ? 'block' : 'hidden lg:block'
        )}
        style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">PK</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">PixieKat</span>
            </div>
            <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {menuItems.map((item) => {
              const isExpanded = expandedItems.includes(item.id);
              const parentActive = isParentActive(item);
              const Icon = item.icon;

              return (
                <div key={item.id}>
                  {/* Level 1 */}
                  <button
                    onClick={() => handleItemClick(item)}
                    className={clsx(
                      'w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                      parentActive
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <div className="flex items-center">
                      <Icon className="w-4 h-4 mr-3 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.subItems && (
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-3.5 h-3.5" />
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
                                  onClick={() => {
                                    if (sub.children) {
                                      toggleSubExpanded(subKey);
                                    } else if (sub.path) {
                                      navigate(sub.path);
                                      onClose();
                                    }
                                  }}
                                  className={clsx(
                                    'w-full flex items-center justify-between pl-9 pr-3 py-2 text-sm rounded-lg transition-colors duration-150',
                                    subActive
                                      ? 'bg-primary-50 text-primary-700 font-medium'
                                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <ChevronRight className="w-3 h-3 shrink-0 text-gray-400" />
                                    <span>{sub.label}</span>
                                  </div>
                                  {sub.children && (
                                    <motion.div
                                      animate={{ rotate: isSubExpanded ? 90 : 0 }}
                                      transition={{ duration: 0.15 }}
                                    >
                                      <ChevronRight className="w-3 h-3 text-gray-400" />
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
                                            key={child.path}
                                            onClick={() => { navigate(child.path); onClose(); }}
                                            className={clsx(
                                              'w-full flex items-center pl-14 pr-3 py-1.5 text-xs rounded-lg transition-colors',
                                              isActive(child.path)
                                                ? 'bg-primary-50 text-primary-700 font-semibold'
                                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
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
                </div>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
