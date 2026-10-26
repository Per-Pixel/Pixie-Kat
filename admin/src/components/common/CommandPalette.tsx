import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  Home,
  ShoppingCart,
  Package,
  Gamepad2,
  Users,
  Wallet,
  Crown,
  Trophy,
  BarChart3,
  FileText,
  TrendingUp,
  MessageSquare,
  Bell,
  Shield,
  Plug,
  Image,
  ClipboardList,
  Settings,
  ArrowRight,
  CornerDownLeft,
  Loader2,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DURATION, EASE_OUT } from '../../lib/motion';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  section: string;
  path: string;
  keywords: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard Overview', section: 'Navigation', path: '/dashboard', keywords: 'home overview kpi metrics', icon: Home },
  { id: 'orders', label: 'All Orders', section: 'Orders', path: '/orders', keywords: 'orders transactions sales razorpay', icon: ShoppingCart },
  { id: 'orders-manual', label: 'Manual Orders Queue', section: 'Orders', path: '/orders/manual', keywords: 'manual queue pending processing fulfill ai', icon: ShoppingCart },
  { id: 'orders-history', label: 'Order History', section: 'Orders', path: '/orders/history', keywords: 'history archive completed orders', icon: ShoppingCart },
  { id: 'products', label: 'All Products & Packages', section: 'Catalog', path: '/products', keywords: 'products packages skus topup', icon: Package },
  { id: 'products-active', label: 'Active Products', section: 'Catalog', path: '/products/active', keywords: 'active products live', icon: Package },
  { id: 'products-drafts', label: 'Draft Products', section: 'Catalog', path: '/products/drafts', keywords: 'draft products hidden', icon: Package },
  { id: 'games', label: 'Games Catalog', section: 'Catalog', path: '/products/games', keywords: 'games mlbb free fire pubg genshin', icon: Gamepad2 },
  { id: 'games-new', label: 'Add New Game', section: 'Catalog', path: '/products/games/new', keywords: 'create new game', icon: Gamepad2 },
  { id: 'users', label: 'Manage Users & KYC Queue', section: 'Users & Access', path: '/users', keywords: 'users customers accounts kyc', icon: Users },
  { id: 'users-kyc', label: 'Pending KYC Verifications', section: 'Users & Access', path: '/users?kyc=pending', keywords: 'kyc verification pending identity approve', icon: Shield },
  { id: 'clients', label: 'Clients (Customer Accounts)', section: 'Users & Access', path: '/auth/clients', keywords: 'clients customers', icon: Users },
  { id: 'brokers', label: 'Brokers & Resellers', section: 'Users & Access', path: '/auth/broker', keywords: 'brokers resellers partners', icon: Users },
  { id: 'admins', label: 'Administrators', section: 'Users & Access', path: '/auth/admin', keywords: 'admins staff roles', icon: Shield },
  { id: 'permissions', label: 'Role Permissions Matrix', section: 'Users & Access', path: '/auth/permissions', keywords: 'permissions rbac roles', icon: Shield },
  { id: 'wallets', label: 'Wallets & Transaction Ledger', section: 'Finance', path: '/wallets', keywords: 'wallets balance credit debit ledger', icon: Wallet },
  { id: 'memberships', label: 'Memberships & Plans', section: 'Finance', path: '/memberships', keywords: 'memberships vip tiers plans discount', icon: Crown },
  { id: 'leaderboard', label: 'Monthly Leaderboard', section: 'Finance', path: '/leaderboard', keywords: 'leaderboard rankings rewards', icon: Trophy },
  { id: 'analytics', label: 'Business Analytics', section: 'Analytics & Revenue', path: '/analytics', keywords: 'analytics bi reports charts', icon: BarChart3 },
  { id: 'sales-overview', label: 'Sales Overview', section: 'Analytics & Revenue', path: '/revenue/sales-overview', keywords: 'revenue sales overview', icon: TrendingUp },
  { id: 'profit-loss', label: 'Profit & Loss (P&L)', section: 'Analytics & Revenue', path: '/revenue/profit-loss', keywords: 'profit loss cogs margin', icon: TrendingUp },
  { id: 'revenue-products', label: 'Product Revenue Breakdown', section: 'Analytics & Revenue', path: '/revenue/products', keywords: 'product revenue performance', icon: Package },
  { id: 'referrals', label: 'Referral Program', section: 'Analytics & Revenue', path: '/revenue/referral', keywords: 'referrals commissions affiliates', icon: Users },
  { id: 'messages', label: 'Support Tickets & Messages', section: 'Communication', path: '/messages', keywords: 'messages tickets support inbox contact', icon: MessageSquare },
  { id: 'compose', label: 'Compose Message', section: 'Communication', path: '/messages/compose', keywords: 'compose send message email', icon: MessageSquare },
  { id: 'notifications', label: 'Live Notifications', section: 'Communication', path: '/notifications', keywords: 'notifications alerts', icon: Bell },
  { id: 'providers', label: 'Supplier APIs (Smile One / Yokcash)', section: 'Operations', path: '/providers', keywords: 'providers suppliers smileone yokcash api', icon: Plug },
  { id: 'yokcash-store', label: 'Yokcash Catalog Store', section: 'Operations', path: '/providers/yokcash/store', keywords: 'yokcash store catalog sync', icon: Plug },
  { id: 'storage', label: 'Site Graphics & Media Storage', section: 'Content', path: '/storage', keywords: 'storage media images graphics bucket', icon: Image },
  { id: 'pages', label: 'CMS Homepage & Content', section: 'Content', path: '/pages/homepage', keywords: 'cms pages hero faq legal promotions', icon: FileText },
  { id: 'activity-logs', label: 'Audit & Activity Logs', section: 'Operations', path: '/activity-logs', keywords: 'activity logs audit trail ip', icon: ClipboardList },
  { id: 'settings', label: 'Store Settings', section: 'Operations', path: '/settings', keywords: 'settings maintenance currency payment security', icon: Settings },
];

interface LiveResults {
  orders: Array<{ id: string; product_name: string; status: string; total_amount: number | string; currency: string }>;
  users: Array<{ id: string; name: string; email: string; role: string }>;
  games: Array<{ id: string; name: string; slug: string; provider: string }>;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const [live, setLive] = useState<LiveResults>({ orders: [], users: [], games: [] });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setLive({ orders: [], users: [], games: [] });
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  useEffect(() => {
    const q = query.trim();
    if (!isOpen || q.length < 2) {
      setLive({ orders: [], users: [], games: [] });
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const [ordersRes, usersRes, gamesRes] = await Promise.all([
          supabase
            .from('orders')
            .select('id, product_name, status, total_amount, currency')
            .or(`id.ilike.%${q}%,product_name.ilike.%${q}%,payment_id.ilike.%${q}%`)
            .order('created_at', { ascending: false })
            .limit(4),
          supabase
            .from('profiles')
            .select('id, name, email, role')
            .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
            .limit(4),
          supabase
            .from('games')
            .select('id, name, slug, provider')
            .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
            .limit(4),
        ]);
        if (cancelled) return;
        setLive({
          orders: (ordersRes.data ?? []) as LiveResults['orders'],
          users: (usersRes.data ?? []) as LiveResults['users'],
          games: (gamesRes.data ?? []) as LiveResults['games'],
        });
      } catch {
        // ignore search errors in command palette
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, isOpen]);

  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV_ITEMS.slice(0, 10);
    return NAV_ITEMS.filter((item) =>
      `${item.label} ${item.section} ${item.keywords}`.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query]);

  const combinedEntries = useMemo(() => {
    const entries: Array<{
      key: string;
      group: string;
      title: string;
      subtitle: string;
      badge?: string;
      icon: React.ElementType;
      onSelect: () => void;
    }> = [];

    filteredNav.forEach((nav) => {
      entries.push({
        key: `nav-${nav.id}`,
        group: nav.section,
        title: nav.label,
        subtitle: nav.path,
        icon: nav.icon,
        onSelect: () => {
          navigate(nav.path);
          onClose();
        },
      });
    });

    live.orders.forEach((order) => {
      entries.push({
        key: `order-${order.id}`,
        group: 'Live Orders',
        title: `${order.product_name} (#${order.id.slice(0, 8)})`,
        subtitle: `${order.currency} ${Number(order.total_amount).toFixed(2)}`,
        badge: order.status,
        icon: ShoppingCart,
        onSelect: () => {
          navigate(`/orders?search=${encodeURIComponent(order.id)}`);
          onClose();
        },
      });
    });

    live.users.forEach((u) => {
      entries.push({
        key: `user-${u.id}`,
        group: 'Live Users',
        title: u.name || 'Unnamed User',
        subtitle: u.email,
        badge: u.role,
        icon: Users,
        onSelect: () => {
          navigate(`/users/${u.id}`);
          onClose();
        },
      });
    });

    live.games.forEach((g) => {
      entries.push({
        key: `game-${g.id}`,
        group: 'Live Games',
        title: g.name,
        subtitle: `/${g.slug}`,
        badge: g.provider,
        icon: Gamepad2,
        onSelect: () => {
          navigate(`/products/games/${g.id}`);
          onClose();
        },
      });
    });

    return entries;
  }, [filteredNav, live, navigate, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [combinedEntries.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (combinedEntries.length ? (prev + 1) % combinedEntries.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          combinedEntries.length ? (prev - 1 + combinedEntries.length) % combinedEntries.length : 0
        );
      } else if (e.key === 'Enter' && combinedEntries[selectedIndex]) {
        e.preventDefault();
        combinedEntries[selectedIndex].onSelect();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, combinedEntries, selectedIndex, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.fast }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: DURATION.base, ease: EASE_OUT }}
            className="relative z-10 w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden"
          >
            <div className="flex items-center px-4 py-3.5 border-b border-gray-100 gap-3">
              <Search className="w-5 h-5 text-violet-600 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to page or search orders, users, games..."
                className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
              />
              {searching && <Loader2 className="w-4 h-4 text-gray-400 animate-spin shrink-0" />}
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono text-gray-400 bg-gray-100 rounded border border-gray-200">
                ESC
              </kbd>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50 p-2">
              {combinedEntries.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">
                  No matching pages, orders, users, or games for "{query}"
                </div>
              ) : (
                combinedEntries.map((entry, idx) => {
                  const Icon = entry.icon;
                  const active = idx === selectedIndex;
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={entry.onSelect}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        active ? 'bg-violet-50 text-violet-900' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            active ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{entry.title}</span>
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                              {entry.group}
                            </span>
                            {entry.badge && (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 capitalize">
                                {entry.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">{entry.subtitle}</p>
                        </div>
                      </div>
                      <ArrowRight
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          active ? 'text-violet-600 translate-x-0.5' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <CornerDownLeft className="w-3 h-3" /> Select
                </span>
                <span>↑↓ Navigate</span>
              </div>
              <span>Search orders by ID, users by email, or games</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
