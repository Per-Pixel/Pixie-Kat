import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, ShoppingCart, TrendingUp, Shield, Settings,
  Check, X, AlertTriangle, Info, ChevronDown, Filter,
  CheckCheck, Trash2, RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

type NotifCategory = 'all' | 'orders' | 'sales' | 'security' | 'system';
type NotifPriority = 'high' | 'medium' | 'low';
type NotifReadFilter = 'all' | 'unread' | 'read';

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

const categoryConfig: Record<Exclude<NotifCategory, 'all'>, { label: string; icon: React.ComponentType<any>; color: string; bg: string }> = {
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

const tabs: Array<{ id: NotifCategory; label: string; icon: React.ComponentType<any> }> = [
  { id: 'all',      label: 'All',      icon: Bell },
  { id: 'orders',   label: 'Orders',   icon: ShoppingCart },
  { id: 'sales',    label: 'Sales',    icon: TrendingUp },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'system',   label: 'System',   icon: Settings },
];

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** Derive notifications from real Supabase tables */
async function fetchLiveNotifications(): Promise<Notification[]> {
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const notifs: Notification[] = [];

  // 1. Orders: new + failed + refund-requested in last 48h
  const { data: orders } = await supabase
    .from('orders')
    .select('id, product_name, total_amount, currency, status, user_id, created_at, profiles:user_id(name, email)')
    .gte('created_at', since48h)
    .order('created_at', { ascending: false })
    .limit(30);

  (orders ?? []).forEach((o: any) => {
    const customer = o.profiles?.name ?? o.profiles?.email ?? 'a customer';
    const amount = `${o.currency} ${Number(o.total_amount).toFixed(2)}`;

    if (o.status === 'pending' || o.status === 'processing') {
      notifs.push({
        id: `order-new-${o.id}`,
        title: 'New Order Received',
        message: `Order #${o.id.slice(0, 8).toUpperCase()} — ${o.product_name} from ${customer} (${amount})`,
        category: 'orders',
        priority: 'high',
        read: false,
        created_at: o.created_at,
        timeAgo: timeAgo(o.created_at),
        action: '/orders',
      });
    } else if (o.status === 'failed') {
      notifs.push({
        id: `order-failed-${o.id}`,
        title: 'Order Payment Failed',
        message: `Order #${o.id.slice(0, 8).toUpperCase()} payment failed for ${o.product_name}. Customer: ${customer}.`,
        category: 'orders',
        priority: 'high',
        read: false,
        created_at: o.created_at,
        timeAgo: timeAgo(o.created_at),
        action: '/orders',
      });
    } else if (o.status === 'refunded') {
      notifs.push({
        id: `order-refunded-${o.id}`,
        title: 'Order Refunded',
        message: `Order #${o.id.slice(0, 8).toUpperCase()} (${amount}) has been refunded to ${customer}.`,
        category: 'orders',
        priority: 'medium',
        read: true,
        created_at: o.created_at,
        timeAgo: timeAgo(o.created_at),
        action: '/orders',
      });
    } else if (o.status === 'completed') {
      notifs.push({
        id: `order-complete-${o.id}`,
        title: 'Order Completed',
        message: `Order #${o.id.slice(0, 8).toUpperCase()} — ${o.product_name} (${amount}) fulfilled successfully.`,
        category: 'orders',
        priority: 'low',
        read: true,
        created_at: o.created_at,
        timeAgo: timeAgo(o.created_at),
        action: '/orders',
      });
    }
  });

  // 2. New user signups in last 48h → System notifs
  const { data: newUsers } = await supabase
    .from('profiles')
    .select('id, name, email, created_at')
    .gte('created_at', since48h)
    .order('created_at', { ascending: false })
    .limit(10);

  (newUsers ?? []).forEach((u: any) => {
    notifs.push({
      id: `user-new-${u.id}`,
      title: 'New User Registered',
      message: `${u.name ?? 'Someone'} (${u.email}) created an account.`,
      category: 'system',
      priority: 'low',
      read: true,
      created_at: u.created_at,
      timeAgo: timeAgo(u.created_at),
      action: `/users/${u.id}`,
    });
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
    const todayRevenue = todayOrders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
    const currency = todayOrders[0]?.currency ?? 'PKS';
    notifs.push({
      id: 'sales-today',
      title: "Today's Revenue Summary",
      message: `${todayOrders.length} orders completed today with total revenue of ${currency} ${todayRevenue.toFixed(2)}.`,
      category: 'sales',
      priority: 'medium',
      read: false,
      created_at: todayStart.toISOString(),
      timeAgo: 'Today',
      action: '/analytics',
    });
  }

  // 4. Suspended users → Security notifs
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: suspendedUsers } = await supabase
    .from('profiles')
    .select('id, name, email, updated_at')
    .eq('status', 'suspended')
    .gte('updated_at', since7d)
    .order('updated_at', { ascending: false })
    .limit(5);

  (suspendedUsers ?? []).forEach((u: any) => {
    notifs.push({
      id: `security-suspended-${u.id}`,
      title: 'Account Suspended',
      message: `User ${u.name ?? u.email} has been suspended. Review if action is needed.`,
      category: 'security',
      priority: 'high',
      read: false,
      created_at: u.updated_at,
      timeAgo: timeAgo(u.updated_at),
      action: `/users/${u.id}`,
    });
  });

  // Sort all by created_at desc
  return notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<NotifCategory>('all');
  const [priorityFilter, setPriorityFilter] = useState<NotifPriority | 'all'>('all');
  const [readFilter, setReadFilter] = useState<NotifReadFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLiveNotifications();
      setNotifications(data);
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Real-time subscription: new orders → refresh notifications
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter((n) => {
    if (activeCategory !== 'all' && n.category !== activeCategory) return false;
    if (priorityFilter !== 'all' && n.priority !== priorityFilter) return false;
    if (readFilter === 'unread' && n.read) return false;
    if (readFilter === 'read' && !n.read) return false;
    return true;
  });

  const markAsRead = (id: string) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const markAllAsRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const deleteNotification = (id: string) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  const getCategoryCount = (cat: NotifCategory) => {
    if (cat === 'all') return notifications.filter((n) => !n.read).length;
    return notifications.filter((n) => n.category === cat && !n.read).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500">
              {loading ? 'Loading…' : unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          {notifications.length > 0 && (
            <button onClick={() => setNotifications([])}
              className="btn btn-outline btn-sm text-red-600 hover:bg-red-50 hover:border-red-300">
              <Trash2 className="w-4 h-4 mr-1.5" />Clear All
            </button>
          )}
        </div>
      </motion.div>

      {/* Tabs + list */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200">
          {tabs.map((tab) => {
            const count = getCategoryCount(tab.id);
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveCategory(tab.id)}
                className={clsx('flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all',
                  activeCategory === tab.id
                    ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50')}>
                <Icon className="w-4 h-4" />
                {tab.label}
                {count > 0 && (
                  <span className={clsx('inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold',
                    activeCategory === tab.id ? 'bg-primary-600 text-white' : 'bg-red-100 text-red-700')}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-gray-100">
              <div className="flex flex-wrap gap-4 px-5 py-4 bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Priority:</span>
                  {(['all', 'high', 'medium', 'low'] as const).map((p) => (
                    <button key={p} onClick={() => setPriorityFilter(p)}
                      className={clsx('px-3 py-1 rounded-full text-xs font-medium border transition-all',
                        priorityFilter === p ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400')}>
                      {p === 'all' ? 'All' : priorityConfig[p].label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Status:</span>
                  {(['all', 'unread', 'read'] as const).map((r) => (
                    <button key={r} onClick={() => setReadFilter(r)}
                      className={clsx('px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize',
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
                {notifications.length === 0 ? 'No recent activity in the last 48 hours.' : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
            filtered.map((notif, index) => {
              const catCfg = categoryConfig[notif.category];
              const priCfg = priorityConfig[notif.priority];
              const CatIcon = catCfg.icon;
              return (
                <motion.div key={notif.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={clsx('flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group', !notif.read && 'bg-blue-50/30')}>
                  <div className={clsx('mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', catCfg.bg)}>
                    <CatIcon className={clsx('w-5 h-5', catCfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!notif.read && <span className="inline-block w-2 h-2 rounded-full bg-primary-600 flex-shrink-0" />}
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
                        <a href={notif.action} className="text-xs text-primary-600 hover:text-primary-700 font-medium hover:underline">View →</a>
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
                      className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {filtered.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {filtered.length} notification{filtered.length !== 1 ? 's' : ''} · Live data from last 48h
            </span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Real-time
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Notifications;
