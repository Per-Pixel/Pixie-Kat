import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, BarChart3, Home, FileText, Package, MessageSquare,
  Users, ShoppingCart, Gamepad2, UserCheck, Settings, LogOut,
  Bell, Search, User, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';

const legacyMenuItems = [
  { id: 'overview', label: 'Overview', path: '/overview' },
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { id: 'pages', label: 'Pages', path: '/pages' },
  { id: 'products', label: 'Products', path: '/products' },
  { id: 'products-active', label: 'Active Products', path: '/products/active' },
  { id: 'products-drafts', label: 'Draft Products', path: '/products/drafts' },
  { id: 'products-games', label: 'Games', path: '/products/games' },
  { id: 'messages', label: 'Messages', path: '/messages' },
  { id: 'users', label: 'Users', path: '/users' },
  { id: 'orders', label: 'Orders', path: '/orders' },
  { id: 'revenue-orders', label: 'Orders', path: '/revenue/orders' },
  { id: 'quick-orders', label: 'Orders', path: '/quick/orders' },
  { id: 'games', label: 'Games', path: '/games' },
  { id: 'resellers', label: 'Resellers', path: '/resellers' },
  { id: 'settings', label: 'Settings', path: '/settings' },
  { id: 'notifications', label: 'Notifications', path: '/notifications' },
  { id: 'analytics', label: 'Analytics', path: '/analytics' },
  { id: 'wallets', label: 'Wallets', path: '/wallets' },
  { id: 'activity-logs', label: 'Activity Logs', path: '/activity-logs' },
  { id: 'storage', label: 'Storage', path: '/storage' },
  { id: 'documentation', label: 'Documentation', path: '/documentation' },
];

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;
  const pageTitle = legacyMenuItems.find((item) => item.path === currentPath)?.label || 'Dashboard';

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 z-10">
          <div className="flex items-center justify-between px-6 py-3.5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent focus:bg-white transition-all w-48 lg:w-64"
                />
              </div>

              {/* Notifications */}
              <button
                onClick={() => navigate('/notifications')}
                className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
              </button>

              {/* Logs shortcut */}
              <button
                onClick={() => navigate('/activity-logs')}
                className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors hidden sm:block"
                title="Activity Logs"
              >
                <ClipboardList className="w-5 h-5" />
              </button>

              {/* Profile */}
              <div className="flex items-center gap-2 pl-2 border-l border-gray-100">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-600" />
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.email?.split('@')[0] || 'Admin'}</p>
                  <p className="text-xs text-gray-400">Super Admin</p>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors ml-1"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
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
