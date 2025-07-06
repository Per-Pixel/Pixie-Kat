import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  Home,
  FileText,
  TrendingUp,
  MessageSquare,
  Bell,
  BarChart3,
  Wallet,
  Shield,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';

interface SubMenuItem {
  label: string;
  path: string;
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

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
    {
      id: 'pages',
      label: 'Pages',
      icon: FileText,
      subItems: [
        { label: 'All Pages', path: '/pages' },
        { label: 'Create Page', path: '/pages/create' },
        { label: 'Page Settings', path: '/pages/settings' }
      ]
    },
    {
      id: 'revenue',
      label: 'Revenue',
      icon: TrendingUp,
      subItems: [
        { label: 'Sales Overview', path: '/revenue/sales-overview' },
        { label: 'Products', path: '/revenue/products' },
        { label: 'Brokers', path: '/revenue/brokers' },
        { label: 'Referral', path: '/revenue/referral' }
      ]
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      subItems: [
        { label: 'Inbox', path: '/messages' },
        { label: 'Compose', path: '/messages/compose' },
        { label: 'Sent', path: '/messages/sent' }
      ]
    },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
    { id: 'wallets', label: 'Wallets', icon: Wallet, path: '/wallets' },
    {
      id: 'auth',
      label: 'Auth',
      icon: Shield,
      subItems: [
        { label: 'Users', path: '/auth/users' },
        { label: 'Clients', path: '/auth/clients' },
        { label: 'Permissions', path: '/auth/permissions' }
      ]
    }
  ];

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
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

  const handleSubItemClick = (subItem: SubMenuItem) => {
    navigate(subItem.path);
    onClose();
  };

  const isItemActive = (path: string) => {
    return location.pathname === path;
  };

  const isParentActive = (item: MenuItem) => {
    if (item.path && isItemActive(item.path)) return true;
    if (item.subItems) {
      return item.subItems.some(subItem => isItemActive(subItem.path));
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl border-r border-gray-200",
          "lg:static lg:translate-x-0 lg:block",
          isOpen ? "block" : "hidden lg:block"
        )}
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
        }}
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
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const isExpanded = expandedItems.includes(item.id);
              const isActive = isParentActive(item);
              const Icon = item.icon;

              return (
                <div key={item.id}>
                  <button
                    onClick={() => handleItemClick(item)}
                    className={clsx(
                      "w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <div className="flex items-center">
                      <Icon className="w-5 h-5 mr-3" />
                      <span>{item.label}</span>
                    </div>
                    {item.subItems && (
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </motion.div>
                    )}
                  </button>

                  {/* Sub Items */}
                  <AnimatePresence>
                    {item.subItems && isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        {item.subItems.map((subItem) => {
                          const isSubActive = isItemActive(subItem.path);
                          return (
                            <motion.button
                              key={subItem.path}
                              onClick={() => handleSubItemClick(subItem)}
                              className={clsx(
                                "w-full flex items-center px-3 py-2 ml-6 text-sm rounded-lg transition-colors duration-200",
                                isSubActive
                                  ? "bg-primary-50 text-primary-700 border-l-2 border-primary-500"
                                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                              )}
                              initial={{ x: -10, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <ChevronRight className="w-3 h-3 mr-2" />
                              {subItem.label}
                            </motion.button>
                          );
                        })}
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
