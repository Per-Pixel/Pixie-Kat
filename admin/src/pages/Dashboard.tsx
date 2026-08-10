import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity, AlertCircle, ArrowUpRight, Crown, DollarSign,
  Package, RefreshCw, ShoppingCart, Users,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { useAdminReport } from '../hooks/useAdminReport';

const money = (value: number, currency = 'PKS') =>
  `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dayKey = (value: Date) => value.toISOString().slice(0, 10);

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

function timeAgo(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useAdminReport();

  const report = useMemo(() => {
    if (!data) return null;

    const now = new Date();
    const today = dayKey(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const completed = data.orders.filter((order) => order.status === 'completed');
    const thisMonth = completed.filter((order) => new Date(order.created_at) >= monthStart);
    const previousMonth = completed.filter((order) => {
      const created = new Date(order.created_at);
      return created >= previousMonthStart && created < monthStart;
    });
    const sum = (orders: typeof completed) =>
      orders.reduce((total, order) => total + Number(order.total_amount || 0), 0);

    const weekly = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      const key = dayKey(date);
      const orders = data.orders.filter((order) => dayKey(new Date(order.created_at)) === key);
      return {
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        orders: orders.length,
        revenue: sum(orders.filter((order) => order.status === 'completed')),
        signups: data.profiles.filter((profile) => dayKey(new Date(profile.created_at)) === key).length,
      };
    });

    const productStats = new Map<string, { name: string; orders: number; revenue: number }>();
    completed.forEach((order) => {
      const key = order.product_id ?? order.product_name;
      const current = productStats.get(key) ?? { name: order.product_name, orders: 0, revenue: 0 };
      current.orders += order.quantity || 1;
      current.revenue += Number(order.total_amount || 0);
      productStats.set(key, current);
    });

    const customerStats = new Map<string, { id: string; name: string; email: string; orders: number; spent: number }>();
    completed.forEach((order) => {
      const profile = data.profiles.find((item) => item.id === order.user_id);
      const current = customerStats.get(order.user_id) ?? {
        id: order.user_id,
        name: profile?.name || order.profiles?.name || 'Unknown customer',
        email: profile?.email || order.profiles?.email || '',
        orders: 0,
        spent: 0,
      };
      current.orders += 1;
      current.spent += Number(order.total_amount || 0);
      customerStats.set(order.user_id, current);
    });

    return {
      totalRevenue: sum(completed),
      revenueChange: percentChange(sum(thisMonth), sum(previousMonth)),
      orderChange: percentChange(
        data.orders.filter((order) => new Date(order.created_at) >= monthStart).length,
        data.orders.filter((order) => {
          const created = new Date(order.created_at);
          return created >= previousMonthStart && created < monthStart;
        }).length,
      ),
      todayRevenue: sum(completed.filter((order) => dayKey(new Date(order.created_at)) === today)),
      todayOrders: data.orders.filter((order) => dayKey(new Date(order.created_at)) === today).length,
      todaySignups: data.profiles.filter((profile) => dayKey(new Date(profile.created_at)) === today).length,
      todayDeposits: data.walletTransactions
        .filter((tx) => dayKey(new Date(tx.created_at)) === today && Number(tx.amount) > 0)
        .reduce((total, tx) => total + Number(tx.amount), 0),
      weekly,
      topProducts: [...productStats.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      topCustomers: [...customerStats.values()].sort((a, b) => b.spent - a.spent).slice(0, 5),
      recentOrders: data.orders.slice(0, 5),
      recentActivity: data.activities.slice(0, 6),
      pendingOrders: data.orders.filter((order) => ['pending', 'processing', 'on_hold'].includes(order.status)).length,
      pendingKyc: data.pendingKyc,
      activeProducts: data.products.filter((product) => product.status === 'active').length,
    };
  }, [data]);

  if (loading && !report) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#7c3aed,#5b21b6)'}}>
            <RefreshCw className="w-7 h-7 text-white animate-spin" />
          </div>
        </div>
        <p className="text-sm font-medium text-gray-400">Loading dashboard data…</p>
      </div>
    );
  }

  if (error || !report || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <AlertCircle className="w-5 h-5 mb-2" />
        <p className="font-medium">Could not load dashboard data</p>
        <p className="text-sm mt-1">{error}</p>
        <button onClick={refresh} className="btn btn-outline btn-sm mt-4">Retry</button>
      </div>
    );
  }

  const cards = [
    { label: 'Total Revenue', value: money(report.totalRevenue), detail: `${report.revenueChange >= 0 ? '+' : ''}${report.revenueChange.toFixed(1)}% this month`, icon: DollarSign },
    { label: 'Total Orders', value: data.orders.length.toLocaleString(), detail: `${report.orderChange >= 0 ? '+' : ''}${report.orderChange.toFixed(1)}% this month`, icon: ShoppingCart },
    { label: 'Customers', value: data.profiles.filter((p) => p.role === 'user').length.toLocaleString(), detail: `${data.profiles.filter((p) => p.status === 'active').length} active accounts`, icon: Users },
    { label: 'Active Products', value: report.activeProducts.toLocaleString(), detail: `${data.products.length} total products`, icon: Package },
  ];

  const todayCards = [
    { label: "Today's Revenue", value: money(report.todayRevenue), emoji: '💰', grad: 'from-violet-500/15 to-purple-500/5', border: 'border-violet-500/25', text: 'text-violet-600' },
    { label: "Today's Orders",  value: report.todayOrders,          emoji: '📦', grad: 'from-blue-500/15 to-blue-500/5',   border: 'border-blue-500/25',   text: 'text-blue-600' },
    { label: 'New Signups',     value: report.todaySignups,         emoji: '🎮', grad: 'from-emerald-500/15 to-green-500/5', border: 'border-emerald-500/25', text: 'text-emerald-600' },
    { label: 'Wallet Credits',  value: money(report.todayDeposits), emoji: '💎', grad: 'from-amber-500/15 to-orange-500/5', border: 'border-amber-500/25', text: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Gaming hero banner ── */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 60%, #6d28d9 100%)' }}
      >
        <div className="absolute inset-0 opacity-15"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="absolute -right-2 top-0 bottom-0 flex items-center pr-8 text-7xl opacity-10 select-none pointer-events-none">
          🎮
        </div>
        <div className="absolute right-20 bottom-2 text-3xl opacity-10 select-none pointer-events-none">⚡</div>

        <div className="relative px-6 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#4ade80' }}>Live</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Store Dashboard</h1>
            <p className="text-sm mt-0.5" style={{ color: '#9ca3af' }}>Real-time sync via Supabase · updates on every change</p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2.5 rounded-xl text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)' }}
            onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            onMouseOut={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Today's at-a-glance cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {todayCards.map(({ label, value, emoji, grad, border, text }) => (
          <div key={label} className={`rounded-xl border bg-gradient-to-br ${grad} ${border} p-4 shadow-sm`}>
            <span className="text-2xl mb-2 block">{emoji}</span>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-xl font-black mt-1 ${text}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-bold text-gray-900 mt-1">{value}</p></div><Icon className="w-6 h-6 text-primary-600" /></div>
            <p className="text-xs text-gray-500 mt-3">{detail}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={report.weekly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="label" /><YAxis />
              <Tooltip formatter={(value, name) => [name === 'revenue' ? money(Number(value)) : value, name]} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#dbeafe" />
              <Area type="monotone" dataKey="orders" stroke="#10b981" fill="#d1fae5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">Signups</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={report.weekly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="signups" fill="#8b5cf6" radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b p-4 flex items-center gap-2"><Crown className="w-4 h-4 text-amber-500" /><h2 className="font-semibold">Top Products</h2></div>
          <div className="divide-y">{report.topProducts.length ? report.topProducts.map((item) => <div key={item.name} className="p-4 flex justify-between"><div><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-gray-500">{item.orders} sold</p></div><p className="text-sm font-semibold">{money(item.revenue)}</p></div>) : <p className="p-6 text-sm text-gray-400">No completed orders yet.</p>}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b p-4 flex items-center gap-2"><Users className="w-4 h-4 text-primary-600" /><h2 className="font-semibold">Top Customers</h2></div>
          <div className="divide-y">{report.topCustomers.length ? report.topCustomers.map((item) => <button key={item.id} onClick={() => navigate(`/users/${item.id}`)} className="w-full p-4 flex justify-between text-left hover:bg-gray-50"><div><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-gray-500">{item.email}</p></div><div className="text-right"><p className="text-sm font-semibold">{money(item.spent)}</p><p className="text-xs text-gray-500">{item.orders} orders</p></div></button>) : <p className="p-6 text-sm text-gray-400">No customer spending yet.</p>}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b p-4 flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-600" /><h2 className="font-semibold">Recent Activity</h2></div>
          <div className="divide-y">{report.recentActivity.length ? report.recentActivity.map((item) => <div key={item.id} className="p-4"><p className="text-sm font-medium capitalize">{item.action.replace(/_/g, ' ')}</p><p className="text-xs text-gray-500 truncate">{item.description || 'Recorded activity'}</p><p className="text-xs text-gray-400 mt-1">{timeAgo(item.created_at)}</p></div>) : <p className="p-6 text-sm text-gray-400">No activity has been recorded.</p>}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={() => navigate('/orders')} className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between text-amber-800"><span>{report.pendingOrders} orders need attention</span><ArrowUpRight className="w-4 h-4" /></button>
        <button onClick={() => navigate('/users')} className="rounded-xl border border-purple-200 bg-purple-50 p-4 flex items-center justify-between text-purple-800"><span>{report.pendingKyc} KYC records need review</span><ArrowUpRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
};

export default Dashboard;
