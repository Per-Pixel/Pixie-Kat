import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Crown,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { useAdminReport } from '../hooks/useAdminReport';
import {
  computeDashboardMetrics,
  computeCustomerInsights,
  money,
} from '../utils/dashboardMetrics';

function timeAgo(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function ChangePill({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full',
        positive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      )}
    >
      {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useAdminReport();
  const [walletOnly, setWalletOnly] = useState(false);

  const adminIds = useMemo(
    () => new Set(data?.profiles.filter((p) => p.role === 'admin').map((p) => p.id) ?? []),
    [data]
  );

  const todayReport = useMemo(() => {
    if (!data) return null;
    return computeDashboardMetrics(data, 'today', new Date(), walletOnly ? 'wallet' : undefined);
  }, [data, walletOnly]);

  const sevenDayReport = useMemo(() => {
    if (!data) return null;
    return computeDashboardMetrics(data, '7d', new Date(), walletOnly ? 'wallet' : undefined);
  }, [data, walletOnly]);

  const paymentFilter = useMemo(() => (walletOnly ? (o: any) => o.payment_method === 'wallet' : () => true), [walletOnly]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>
            <RefreshCw className="w-7 h-7 text-white animate-spin" />
          </div>
        </div>
        <p className="text-sm font-medium text-gray-400">Loading dashboard data…</p>
      </div>
    );
  }

  if (error || !todayReport || !sevenDayReport || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <AlertCircle className="w-5 h-5 mb-2" />
        <p className="font-medium">Could not load dashboard data</p>
        <p className="text-sm mt-1">{error}</p>
        <button onClick={refresh} className="btn btn-outline btn-sm mt-4">Retry</button>
      </div>
    );
  }

  const { todayVsYesterday } = todayReport;
  const { financial, trend } = sevenDayReport;

  const totalOrdersAllTime = data.orders.filter((o) => !adminIds.has(o.user_id) && paymentFilter(o)).length;
  const pendingOrdersCount = data.orders.filter((o) => ['pending', 'processing', 'on_hold'].includes(o.status) && !adminIds.has(o.user_id) && paymentFilter(o)).length;
  const pendingKyc = data.pendingKyc;
  const activeProducts = data.products.filter((p) => p.status === 'active').length;
  const totalProducts = data.products.length;
  const recentActivity = data.activities.filter((a) => !adminIds.has(a.user_id)).slice(0, 8);

  const nonAdminCustomerOrders = data.orders.filter((o) => !adminIds.has(o.user_id) && paymentFilter(o));
  const recentCustomers = computeCustomerInsights(nonAdminCustomerOrders, data.profiles).slice(0, 5);

  const ordersToday = data.orders.filter((o) => {
    const d = new Date(o.created_at);
    const today = new Date();
    return !adminIds.has(o.user_id) &&
      paymentFilter(o) &&
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
  });

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 60%, #6d28d9 100%)' }}
      >
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute -right-2 top-0 bottom-0 flex items-center pr-8 text-7xl opacity-10 select-none pointer-events-none">🎮</div>
        <div className="relative px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#4ade80' }}>Live</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Store Overview</h1>
            <p className="text-sm mt-0.5" style={{ color: '#9ca3af' }}>What is happening right now · real-time via Supabase</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2.5 rounded-xl text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)' }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
            >
              Deep Analytics →
            </button>
            <button
              onClick={() => setWalletOnly((v: boolean) => !v)}
              className={clsx(
                'px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors flex items-center gap-2',
                walletOnly ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-white/10 hover:bg-white/20'
              )}
            >
              <Wallet className="w-4 h-4" />
              {walletOnly ? 'Wallet Only' : 'Wallet Only: Off'}
            </button>
          </div>
        </div>
      </div>

      {/* Today KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Today's Revenue", value: money(todayVsYesterday.revenue.today), change: todayVsYesterday.revenue.change, icon: DollarSign, tone: 'bg-violet-50 text-violet-600' },
          { label: "Today's Profit", value: money(todayVsYesterday.profit.today), change: todayVsYesterday.profit.change, icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-600' },
          { label: "Orders Today", value: ordersToday.length.toLocaleString(), icon: ShoppingCart, tone: 'bg-blue-50 text-blue-600' },
          { label: "Active Products", value: `${activeProducts} / ${totalProducts}`, icon: Package, tone: 'bg-amber-50 text-amber-600' },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', card.tone)}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            {'change' in card && (
              <div className="mt-2 flex items-center gap-1.5">
                <ChangePill value={card.change!} />
                <span className="text-xs text-gray-400">vs yesterday</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Order status summary (current live state) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total (All Time)', value: totalOrdersAllTime, icon: ShoppingCart, bg: 'bg-gray-50 border-gray-200', text: 'text-gray-800', sub: 'text-gray-500' },
          { label: 'Completed', value: financial.successfulOrders, icon: CheckCircle2, bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', sub: 'text-emerald-600' },
          { label: 'Pending / Hold', value: financial.pendingOrders, icon: Clock, bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', sub: 'text-amber-600' },
          { label: 'Failed', value: financial.failedOrders, icon: XCircle, bg: 'bg-red-50 border-red-200', text: 'text-red-800', sub: 'text-red-600' },
          { label: 'Refunded', value: financial.refundedOrders, icon: Wallet, bg: 'bg-purple-50 border-purple-200', text: 'text-purple-800', sub: 'text-purple-600' },
        ].map((card) => (
          <button key={card.label} onClick={() => navigate('/orders')} className={clsx('rounded-xl border p-4 text-left hover:opacity-90 transition-opacity', card.bg)}>
            <div className="flex items-center gap-2 mb-1">
              <card.icon className={clsx('w-4 h-4', card.sub)} />
              <p className={clsx('text-xs font-medium', card.text)}>{card.label}</p>
            </div>
            <p className={clsx('text-2xl font-bold', card.text)}>{card.value.toLocaleString()}</p>
            {card.label === 'Total (All Time)' && <p className={clsx('text-xs mt-0.5', card.sub)}>excl. admin orders</p>}
            {card.label === 'Completed' && <p className={clsx('text-xs mt-0.5', card.sub)}>7-day period</p>}
            {card.label === 'Pending / Hold' && <p className={clsx('text-xs mt-0.5', card.sub)}>needs attention</p>}
          </button>
        ))}
      </div>

      {/* 7-day revenue sparkline */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-violet-500" /> 7-Day Revenue & Orders Trend
          </h2>
          <button onClick={() => navigate('/analytics')} className="text-xs text-primary-600 hover:underline">Full analytics →</button>
        </div>
        {trend.some((t) => t.revenue > 0 || t.orders > 0) ? (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value, name) => [name === 'orders' ? Number(value).toLocaleString() : money(Number(value)), String(name)]} />
              <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#dbeafe" name="Revenue" />
              <Area yAxisId="left" type="monotone" dataKey="profit" stroke="#10b981" fill="#d1fae5" name="Profit" />
              <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Orders" />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center text-sm text-gray-400">No orders in the last 7 days.</p>
        )}
      </div>

      {/* Quick KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '7-Day Revenue', value: money(financial.revenue), icon: DollarSign, tone: 'text-blue-600' },
          { label: '7-Day Gross Profit', value: money(financial.grossProfit), icon: TrendingUp, tone: 'text-emerald-600' },
          { label: 'Pending KYC', value: pendingKyc.toLocaleString(), icon: Users, tone: 'text-amber-600' },
          { label: 'Pending Orders', value: pendingOrdersCount.toLocaleString(), icon: Clock, tone: 'text-red-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex items-center gap-3">
            <kpi.icon className={clsx('w-8 h-8 shrink-0', kpi.tone)} />
            <div>
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent customers */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b p-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><Crown className="w-4 h-4 text-amber-500" /><h2 className="font-semibold">Top Customers</h2></div>
            <button onClick={() => navigate('/auth/clients')} className="text-xs text-primary-600 hover:underline">View all →</button>
          </div>
          <div className="divide-y">
            {recentCustomers.length ? recentCustomers.map((c) => (
              <button key={c.id} onClick={() => navigate(`/users/${c.id}`)} className="w-full p-4 flex justify-between text-left hover:bg-gray-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-gray-500 truncate">{c.email}</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-semibold">{money(c.spent)}</p>
                  <p className="text-xs text-gray-500">{c.orders} orders</p>
                </div>
              </button>
            )) : <p className="p-6 text-sm text-gray-400">No customer spending yet.</p>}
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b p-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-600" /><h2 className="font-semibold">Recent Activity</h2></div>
            <button onClick={() => navigate('/activity-logs')} className="text-xs text-primary-600 hover:underline">View all →</button>
          </div>
          <div className="divide-y">
            {recentActivity.length ? recentActivity.map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-start gap-3">
                <div className="w-1.5 h-1.5 mt-2 rounded-full bg-emerald-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium capitalize">{item.action.replace(/_/g, ' ')}</p>
                  {item.description && <p className="text-xs text-gray-500 truncate">{item.description}</p>}
                </div>
                <p className="text-xs text-gray-400 shrink-0">{timeAgo(item.created_at)}</p>
              </div>
            )) : <p className="p-6 text-sm text-gray-400">No activity recorded.</p>}
          </div>
        </div>
      </div>

      {/* Action alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={() => navigate('/orders')} className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between text-amber-800 hover:bg-amber-100 transition-colors">
          <span className="text-sm font-medium">{pendingOrdersCount} orders need attention</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
        <button onClick={() => navigate('/users')} className="rounded-xl border border-purple-200 bg-purple-50 p-4 flex items-center justify-between text-purple-800 hover:bg-purple-100 transition-colors">
          <span className="text-sm font-medium">{pendingKyc} KYC records need review</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
