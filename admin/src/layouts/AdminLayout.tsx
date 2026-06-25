import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, LogOut, Bell, Search, User, ClipboardList, Gamepad2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(prev => !prev)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-bold text-gray-800 tracking-wide">PixieKat</span>
                <span className="text-gray-300 text-xs mx-1">/</span>
                <span className="text-xs text-gray-400">Admin</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white w-44 lg:w-56 transition-all"
                />
              </div>

              {/* Notifications */}
              <button
                onClick={() => navigate('/notifications')}
                className="relative p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-4.5 h-4.5 w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full border border-white" />
              </button>

              {/* Activity logs */}
              <button
                onClick={() => navigate('/activity-logs')}
                className="relative p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors hidden sm:block"
                title="Activity Logs"
              >
                <ClipboardList className="w-5 h-5" />
              </button>

              {/* Profile */}
              <div className="flex items-center gap-2 pl-2 ml-1 border-l border-gray-200">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.email?.split('@')[0] || 'Admin'}</p>
                  <p className="text-xs text-gray-400">Super Admin</p>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors ml-1"
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
