import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, LogOut, Bell, Search, User, ClipboardList, Gamepad2, Coins } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminCurrency } from '../lib/currency';
import Sidebar from '../components/Sidebar';
import MobileTabBar from '../components/MobileTabBar';
import CommandPalette from '../components/common/CommandPalette';
import { DURATION, EASE_OUT, pressScale, springSnappy } from '../lib/motion';

const NOTIF_UNREAD_KEY = 'pixiekat_admin_notif_unread_count';

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  );
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    const raw = window.localStorage.getItem(NOTIF_UNREAD_KEY);
    return raw !== null ? Math.max(0, Number(raw) || 0) : 1;
  });
  const { user, logout } = useAuth();
  const { currency, setCurrency } = useAdminCurrency();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    const onNotifUpdate = (e: Event) => {
      const count = (e as CustomEvent<number>).detail;
      if (typeof count === 'number') setUnreadCount(Math.max(0, count));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === NOTIF_UNREAD_KEY && e.newValue !== null) {
        setUnreadCount(Math.max(0, Number(e.newValue) || 0));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('admin-notifications-updated', onNotifUpdate);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('admin-notifications-updated', onNotifUpdate);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <motion.button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                aria-expanded={sidebarOpen}
                title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                {...pressScale}
                animate={{ rotate: sidebarOpen ? 0 : 180 }}
                transition={springSnappy}
              >
                <Menu className="w-5 h-5" />
              </motion.button>
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-bold text-gray-800 tracking-wide">PixieKat</span>
                <span className="text-gray-300 text-xs mx-1">/</span>
                <span className="text-xs text-gray-400">Admin</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Command Palette Search Trigger */}
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="flex items-center gap-2 pl-3 pr-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 hover:bg-white hover:border-violet-300 hover:text-gray-800 transition-colors w-40 sm:w-56 lg:w-64 text-left"
                title="Quick search & navigation (Ctrl+K)"
              >
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="flex-1 truncate text-xs sm:text-sm">Search or jump...</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-white rounded border border-gray-200">
                  Ctrl K
                </kbd>
              </button>

              {/* Global Currency Display Switcher (PKS <-> INR) */}
              <div
                className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5"
                title="Switch displayed currency across dashboards (1 PKS = ₹1 INR)"
              >
                <Coins className="w-3.5 h-3.5 text-violet-500 ml-1.5 mr-1 hidden sm:inline" />
                {(['PKS', 'INR'] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setCurrency(unit)}
                    className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                      currency === unit
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {unit === 'INR' ? '₹ INR' : 'PKS'}
                  </button>
                ))}
              </div>

              {/* Notifications */}
              <motion.button
                onClick={() => navigate('/notifications')}
                className="group relative p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
                {...pressScale}
              >
                <Bell className="w-5 h-5 transition-transform duration-200 group-hover:rotate-12" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full border border-white animate-pulse-dot" />
                )}
              </motion.button>

              {/* Activity logs */}
              <motion.button
                onClick={() => navigate('/activity-logs')}
                className="relative p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors hidden sm:block"
                title="Activity Logs"
                {...pressScale}
              >
                <ClipboardList className="w-5 h-5" />
              </motion.button>

              {/* Profile */}
              <div className="flex items-center gap-2 pl-2 ml-1 border-l border-gray-200">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-shadow duration-300 hover:shadow-[0_0_16px_rgba(124,58,237,0.45)]"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}
                >
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.email?.split('@')[0] || 'Admin'}</p>
                  <p className="text-xs text-gray-400">Super Admin</p>
                </div>
                <motion.button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors ml-1"
                  title="Logout"
                  {...pressScale}
                >
                  <LogOut className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-24 lg:pb-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <MobileTabBar onOpenSidebar={() => setSidebarOpen(true)} />
    </div>
  );
};

export default AdminLayout;
