import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  BarChart3,
  Home,
  FileText,
  Package,
  MessageSquare,
  Users,
  ShoppingCart,
  Gamepad2,
  UserCheck,
  Settings,
  LogOut,
  Bell,
  Search,
  User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import clsx from 'clsx';

// Legacy menu items for header title mapping
const legacyMenuItems = [
  { id: 'overview', label: 'Overview', icon: BarChart3, path: '/overview' },
  { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
  { id: 'pages', label: 'Pages', icon: FileText, path: '/pages' },
  { id: 'products', label: 'Products', icon: Package, path: '/products' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/messages' },
  { id: 'users', label: 'Users', icon: Users, path: '/users' },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, path: '/orders' },
  { id: 'games', label: 'Games', icon: Gamepad2, path: '/games' },
  { id: 'resellers', label: 'Resellers', icon: UserCheck, path: '/resellers' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
  { id: 'wallets', label: 'Wallets', icon: Package, path: '/wallets' },
];

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default to open
  const { user, logout } = useAuth();
  const location = useLocation();

  const currentPath = location.pathname;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Enhanced Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="ml-2 lg:ml-0 text-2xl font-semibold text-gray-900">
                {legacyMenuItems.find(item => item.path === currentPath)?.label || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Profile */}
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary-600" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
