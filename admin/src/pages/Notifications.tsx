import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Bell, ShoppingCart, TrendingUp, Shield, Settings,
  Check, X, ChevronDown, Filter, Search,
  CheckCheck, Trash2, RefreshCw, RotateCcw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import { badgePop, DURATION, EASE_OUT, expandCollapse, fadeUp, pop, staggerDelay } from '../lib/motion';

type NotifCategory = 'all' | 'orders' | 'sales' | 'security' | 'system';
type NotifPriority = 'high' | 'medium' | 'low';
type NotifReadFilter = 'all' | 'unread' | 'read';
type NotifWindow = '24h' | '48h' | '7d' | '30d';

interface Notification {
  id: string;
  title: string;
  message: string;
  category: Exclude<NotifCategory, 'all'>;
  priority: NotifPriority;
  read: boolean;
  timeAgo: string;
  created_at: string;
  action?: string;
}

const READ_STORAGE_KEY = 'pixiekat_admin_notif_read';
const DISMISSED_STORAGE_KEY = 'pixiekat_admin_notif_dismissed';
const UNREAD_COUNT_KEY = 'pixiekat_admin_notif_unread_count';

function readIdSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function writeIdSet(key: string, set: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // ignore storage errors
  }
}

function broadcastUnreadCount(count: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(UNREAD_COUNT_KEY, String(count));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent<number>('admin-notifications-updated', { detail: count }));
}

const categoryConfig: Record<Exclude<NotifCategory, 'all'>, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  orders:   { label: 'Orders',   icon: ShoppingCart, color: 'text-blue-600',   bg: 'bg-blue-50' },
  sales:    { label: 'Sales',    icon: TrendingUp,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  security: { label: 'Security', icon: Shield,       color: 'text-red-600',     bg: 'bg-red-50' },
  system:   { label: 'System',   icon: Settings,     color: 'text-purple-600',  bg: 'bg-purple-50' },
};

const priorityConfig: Record<NotifPriority, { label: string; badge: string; dot: string }> = {
  high:   { label: 'High',   badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500' },
  medium: { label: 'Medium', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  low:    { label: 'Low',    badge: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400' },
};

const tabs: Array<{ id: NotifCategory; label: string; icon: React.ElementType }> = [
  { id: 'all',      label: 'All',      icon: Bell },
  { id: 'orders',   label: 'Orders',   icon: ShoppingCart },
  { id: 'sales',    label: 'Sales',    icon: TrendingUp },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'system',   label: 'System',   icon: Settings },
];

const WINDOW_HOURS: Record<NotifWindow, number> = {
  '24h': 24,
  '48h': 48,
  '7d': 24 * 7,
  '30d': 24 * 30,
};

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Derive notifications from real Supabase tables */
async function fetchLiveNotifications(windowKey: NotifWindow): Promise<Notification[]> {
  const hours = WINDOW_HOURS[windowKey] ?? 48;
  const sinceIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const readSet = readIdSet(READ_STORAGE_KEY);
  const dismissedSet = readIdSet(DISMISSED_STORAGE_KEY);
  const notifs: Notification[] = [];

  // 1. Orders: new + failed + refund-requested in window
  const { data: orders } = await supabase
    .from('orders')
    .select('id, product_name, total_amount, currency, status, user_id, created_at, profiles:user_id(name, email)')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(60);

  (orders ?? []).forEach((o: any) => {
    const customer = o.profiles?.name ?? o.profiles?.email ?? 'a customer';
    const amount = `${o.currency} ${Number(o.total_amount).toFixed(2)}`;

    if (o.status === 'pending' || o.status === 'processing' || o.status === 'on_hold') {
      const id = `order-new-${o.id}`;
      if (!dismissedSet.has(id)) {
        notifs.push({
          id,
          title: o.status === 'on_hold' ? 'Order On Hold' : 'New Order Received',
          message: `Order #${o.id.slice(0, 8).toUpperCase()} — ${o.product_name} from ${customer} (${amount})`,
          category: 'orders',
          priority: 'high',
          read: readSet.has(id),
          created_at: o.created_at,
          timeAgo: timeAgo(o.created_at),
          action: `/orders?search=${encodeURIComponent(o.id)}`,
        });
      }
    } else if (o.status === 'failed') {
      const id = `order-failed-${o.id}`;
      if (!dismissedSet.has(id)) {
        notifs.push({
          id,
          title: 'Order Payment Failed',
          message: `Order #${o.id.slice(0, 8).toUpperCase()} payment failed for ${o.product_name}. Customer: ${customer}.`,
          category: 'orders',
          priority: 'high',
          read: readSet.has(id),
          created_at: o.created_at,
          timeAgo: timeAgo(o.created_at),
          action: `/orders?search=${encodeURIComponent(o.id)}`,
        });
      }
    } else if (o.status === 'refunded') {
      const id = `order-refunded-${o.id}`;
      if (!dismissedSet.has(id)) {
        notifs.push({
          id,
          title: 'Order Refunded',
          message: `Order #${o.id.slice(0, 8).toUpperCase()} (${amount}) has been refunded to ${customer}.`,
          category: 'orders',
          priority: 'medium',
          read: readSet.has(id) || true,
          created_at: o.created_at,
          timeAgo: timeAgo(o.created_at),
          action: `/orders?search=${encodeURIComponent(o.id)}`,
        });
      }
    } else if (o.status === 'completed') {
      const id = `order-complete-${o.id}`;
      if (!dismissedSet.has(id)) {
        notifs.push({
          id,
          title: 'Order Completed',
          message: `Order #${o.id.slice(0, 8).toUpperCase()} — ${o.product_name} (${amount}) fulfilled successfully.`,
          category: 'orders',
          priority: 'low',
          read: readSet.has(id) || true,
          created_at: o.created_at,
          timeAgo: timeAgo(o.created_at),
          action: `/orders?search=${encodeURIComponent(o.id)}`,
        });
      }
    }
  });

  // 2. New user signups in window -> System notifs
  const { data: newUsers } = await supabase
    .from('profiles')
    .select('id, name, email, created_at')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(20);

  (newUsers ?? []).forEach((u: any) => {
    const id = `user-new-${u.id}`;
    if (!dismissedSet.has(id)) {
      notifs.push({
        id,
        title: 'New User Registered',
        message: `${u.name ?? 'Someone'} (${u.email}) created an account.`,
        category: 'system',
        priority: 'low',
        read: readSet.has(id) || true,
        created_at: u.created_at,
        timeAgo: timeAgo(u.created_at),
        action: `/users/${u.id}`,
      });
    }
  });

  // 3. Revenue milestone check: today's completed revenue
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: todayOrders } = await supabase
    .from('orders')
    .select('total_amount, currency')
    .eq('status', 'completed')
    .gte('created_at', todayStart.toISOString());

  if (todayOrders && todayOrders.length > 0) {
    const salesId = `sales-today-${todayStart.toISOString().slice(0, 10)}`;
    if (!dismissedSet.has(salesId)) {
      const todayRevenue = todayOrders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
      const currency = todayOrders[0]?.currency ?? 'PKS';
      notifs.push({
        id: salesId,
        title: "Today's Revenue Summary",
        message: `${todayOrders.length} orders completed today with total revenue of ${currency} ${todayRevenue.toFixed(2)}.`,
        category: 'sales',
        priority: 'medium',
        read: readSet.has(salesId),
        created_at: todayStart.toISOString(),
        timeAgo: 'Today',
        action: '/analytics',
      });
    }
  }

  // 4. Suspended users -> Security notifs
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: suspendedUsers } = await supabase
    .from('profiles')
    .select('id, name, email, updated_at')
    .in('status', ['suspended', 'banned'])
    .gte('updated_at', since7d)
    .order('updated_at', { ascending: false })
    .limit(10);

  (suspendedUsers ?? []).forEach((u: any) => {
    const id = `security-suspended-${u.id}`;
    if (!dismissedSet.has(id)) {
      notifs.push({
        id,
        title: 'Account Restricted',
        message: `User ${u.name ?? u.email} is currently suspended/banned. Review if action is needed.`,
        category: 'security',
        priority: 'high',
        read: readSet.has(id),
        created_at: u.updated_at,
        timeAgo: timeAgo(u.updated_at),
        action: `/users/${u.id}`,
      });
    }
  });

  return notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<NotifCategory>('all');
  const [priorityFilter, setPriorityFilter] = useState<NotifPriority | 'all'>('all');
  const [readFilter, setReadFilter] = useState<NotifReadFilter>('all');
  const [windowFilter, setWindowFilter] = useState<NotifWindow>('48h');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const reduceMotion = useReducedMotion();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLiveNotifications(windowFilter);
      setNotifications(data);
      broadcastUnreadCount(data.filter((n) => !n.read).length);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [windowFilter]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        load();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        load();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  useEffect(() => {
    if (!loading) {
      broadcastUnreadCount(unreadCount);
    }
  }, [unreadCount, loading]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notifications.filter((n) => {
      if (activeCategory !== 'all' && n.category !== activeCategory) return false;
      if (priorityFilter !== 'all' && n.priority !== priorityFilter) return false;
      if (readFilter === 'unread' && n.read) return false;
      if (readFilter === 'read' && !n.read) return false;
      if (q && !`${n.title} ${n.message}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [notifications, activeCategory, priorityFilter, readFilter, search]);

  const markAsRead = (id: string) => {
    const readSet = readIdSet(READ_STORAGE_KEY);
    readSet.add(id);
    writeIdSet(READ_STORAGE_KEY, readSet);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    const readSet = readIdSet(READ_STORAGE_KEY);
    notifications.forEach((n) => readSet.add(n.id));
    writeIdSet(READ_STORAGE_KEY, readSet);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const deleteNotification = (id: string) => {
    const dismissedSet = readIdSet(DISMISSED_STORAGE_KEY);
    dismissedSet.add(id);
    writeIdSet(DISMISSED_STORAGE_KEY, dismissedSet);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    const dismissedSet = readIdSet(DISMISSED_STORAGE_KEY);
    notifications.forEach((n) => dismissedSet.add(n.id));
    writeIdSet(DISMISSED_STORAGE_KEY, dismissedSet);
    setNotifications([]);
    toast.success('Cleared notifications');
  };

  const restoreDismissed = () => {
    writeIdSet(DISMISSED_STORAGE_KEY, new Set());
    writeIdSet(READ_STORAGE_KEY, new Set());
    void load();
    toast.success('Restored dismissed notifications');
  };

  const getCategoryCount = (cat: NotifCategory) => {
    if (cat === 'all') return notifications.filter((n) => !n.read).length;
    return notifications.filter((n) => n.category === cat && !n.read).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        transition={{ duration: DURATION.base, ease: EASE_OUT }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500 tabular-nums">
              {loading ? 'Loading…' : unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
            {(['24h', '48h', '7d', '30d'] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWindowFilter(w)}
                className={clsx(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  windowFilter === w ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                {w}
              </button>
            ))}
          </div>
          <button onClick={load} className="btn btn-outline btn-sm" disabled={loading}>
            <RefreshCw className={clsx('w-4 h-4 mr-1.5', loading && 'animate-spin')} />Refresh
          </button>
          <button onClick={() => setShowFilters(!showFilters)}
            className={clsx('btn btn-outline btn-sm', showFilters && 'bg-primary-50 border-primary-300 text-primary-700')}>
            <Filter className="w-4 h-4 mr-1.5" />Filters
            <ChevronDown className={clsx('w-4 h-4 ml-1 transition-transform', showFilters && 'rotate-180')} />
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="btn btn-outline btn-sm">
              <CheckCheck className="w-4 h-4 mr-1.5" />Mark All Read
            </button>
          )}
          {notifications.length > 0 ? (
            <button onClick={clearAll}
              className="btn btn-outline btn-sm text-red-600 hover:bg-red-50 hover:border-red-300">
              <Trash2 className="w-4 h-4 mr-1.5" />Clear All
            </button>
          ) : (
            <button onClick={restoreDismissed} className="btn btn-outline btn-sm">
              <RotateCcw className="w-4 h-4 mr-1.5" />Restore Dismissed
            </button>
          )}
        </div>
      </motion.div>

      {/* Tabs + list */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        transition={{ delay: 0.06, duration: DURATION.base, ease: EASE_OUT }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pr-4">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const count = getCategoryCount(tab.id);
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveCategory(tab.id)}
                  className={clsx('flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                    activeCategory === tab.id
                      ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50')}>
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {count > 0 && (
                    <motion.span
                      key={count}
                      variants={badgePop}
                      initial="initial"
                      animate="animate"
                      className={clsx('inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold tabular-nums',
                        activeCategory === tab.id ? 'bg-primary-600 text-white' : 'bg-red-100 text-red-700')}>
                      {count}
                    </motion.span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="relative p-2 sm:p-0 w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-5 sm:left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter notifications..."
              className="input pl-9 py-1.5 text-sm w-full"
            />
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div variants={expandCollapse} initial="initial" animate="animate" exit="exit"
              transition={{ duration: DURATION.base, ease: EASE_OUT }}
              className="overflow-hidden border-b border-gray-100">
              <div className="flex flex-wrap gap-4 px-5 py-4 bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Priority:</span>
                  {(['all', 'high', 'medium', 'low'] as const).map((p) => (
                    <button key={p} onClick={() => setPriorityFilter(p)}
                      className={clsx('px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                        priorityFilter === p ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400')}>
                      {p === 'all' ? 'All' : priorityConfig[p].label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Status:</span>
                  {(['all', 'unread', 'read'] as const).map((r) => (
                    <button key={r} onClick={() => setReadFilter(r)}
                      className={clsx('px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize',
                        readFilter === r ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400')}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification List */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 text-gray-300 animate-spin mb-3" />
              <p className="text-sm text-gray-400">Loading live notifications…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No notifications here</p>
              <p className="text-sm text-gray-400 mt-1">
                {notifications.length === 0 ? `No activity in the last ${windowFilter}.` : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            filtered.map((notif, index) => {
              const catCfg = categoryConfig[notif.category];
              const priCfg = priorityConfig[notif.priority];
              const CatIcon = catCfg.icon;
              return (
                <motion.div key={notif.id} initial={{ opacity: 0, x: reduceMotion ? 0 : -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: staggerDelay(index, 0.02, 0.18), duration: DURATION.base, ease: EASE_OUT }}
                  className={clsx('flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group', !notif.read && 'bg-blue-50/30')}>
                  <div className={clsx('mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', catCfg.bg)}>
                    <CatIcon className={clsx('w-5 h-5', catCfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <AnimatePresence initial={false}>
                          {!notif.read && (
                            <motion.span
                              variants={pop}
                              initial="initial"
                              animate="animate"
                              exit="exit"
                              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
                              className="inline-block w-2 h-2 rounded-full bg-primary-600 flex-shrink-0"
                            />
                          )}
                        </AnimatePresence>
                        <h3 className={clsx('text-sm font-semibold', !notif.read ? 'text-gray-900' : 'text-gray-700')}>{notif.title}</h3>
                        <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', priCfg.badge)}>
                          <span className={clsx('w-1.5 h-1.5 rounded-full', priCfg.dot)} />
                          {priCfg.label}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{notif.timeAgo}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">{notif.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={clsx('text-xs font-medium capitalize', catCfg.color)}>{catCfg.label}</span>
                      {notif.action && (
                        <Link
                          to={notif.action}
                          onClick={() => markAsRead(notif.id)}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium hover:underline"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {!notif.read && (
                      <button onClick={() => markAsRead(notif.id)}
                        className="p-1.5 rounded-lg hover:bg-green-100 text-gray-400 hover:text-green-600 transition-colors" title="Mark as read">
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => deleteNotification(notif.id)}
                      className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors" title="Dismiss">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Notifications;
