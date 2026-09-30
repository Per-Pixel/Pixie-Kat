import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  CreditCard,
  Crown,
  DollarSign,
  Gamepad2,
  LayoutDashboard,
  Package,
  PackageX,
  RefreshCw,
  Repeat,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Timer,
  TrendingUp,
  UserCog,
  Wallet,
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
import type { ReportOrder } from '../services/reportingService';

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
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
        positive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      )}
    >
      {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon, tone }: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-gray-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {sub && <div className="mt-2">{sub}</div>}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, hint, action }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
        <Icon className="h-4 w-4 text-primary-600" />
        {title}
      </h2>
      {action ?? (hint && <p className="text-xs text-gray-400">{hint}</p>)}
    </div>
  );
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useAdminReport();
  const [walletOnly, setWalletOnly] = useState(false);
  const [includeInternal, setIncludeInternal] = useState(false);

  const adminIds = useMemo(
    () => new Set(data?.profiles.filter((p) => p.role === 'admin').map((p) => p.id) ?? []),
    [data]
  );

  const scopedOrder = useMemo(
    () => (o: ReportOrder) => (includeInternal || !adminIds.has(o.user_id)) && (!walletOnly || o.payment_method === 'wallet'),
    [adminIds, includeInternal, walletOnly]
  );

  const todayReport = useMemo(() => {
    if (!data) return null;
    return computeDashboardMetrics(data, 'today', new Date(), walletOnly ? 'wallet' : undefined, includeInternal);
  }, [data, walletOnly, includeInternal]);

  const sevenDayReport = useMemo(() => {
    if (!data) return null;
    return computeDashboardMetrics(data, '7d', new Date(), walletOnly ? 'wallet' : undefined, includeInternal);
  }, [data, walletOnly, includeInternal]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>
          <RefreshCw className="h-7 w-7 animate-spin text-white" />
        </div>
        <p className="text-sm font-medium text-gray-400">Loading dashboard data…</p>
      </div>
    );
  }

  if (error || !todayReport || !sevenDayReport || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <AlertCircle className="h-5 w-5 mb-2" />
        <p className="font-medium">Could not load dashboard data</p>
        <p className="mt-1 text-sm">{error}</p>
        <button onClick={refresh} className="btn btn-outline btn-sm mt-4">Retry</button>
      </div>
    );
  }

  const { todayVsYesterday } = todayReport;
  const { financial, trend, productPerformance, gamePerformance, paymentMethods, supplierPerformance, repeatMetrics, processingTime } = sevenDayReport;

  const scopedOrders = data.orders.filter(scopedOrder);
  const totalOrdersAllTime = scopedOrders.length;
  const pendingOrdersCount = scopedOrders.filter((o) => ['pending', 'processing', 'on_hold'].includes(o.status)).length;
  const today = new Date();
  const ordersToday = scopedOrders.filter((o) => {
    const d = new Date(o.created_at);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  });
  const failedToday = ordersToday.filter((o) => o.status === 'failed').length;
  const pendingKyc = data.pendingKyc;
  const activeProducts = data.products.filter((p) => p.status === 'active');
  const outOfStock = activeProducts.filter((p) => Number(p.stock ?? 0) <= 0).length;
  const recentActivity = data.activities.filter((a) => includeInternal || !adminIds.has(a.user_id ?? '')).slice(0, 8);
  const recentCustomers = computeCustomerInsights(scopedOrders, data.profiles).slice(0, 5);
  const topProductRevenue = productPerformance[0]?.revenue ?? 0;

  const kpis = [
    {
      label: "Today's Revenue",
      value: money(todayVsYesterday.revenue.today),
      icon: DollarSign,
      tone: 'bg-blue-50 text-blue-600',
      sub: <div className="flex items-center gap-1.5"><ChangePill value={todayVsYesterday.revenue.change} /><span className="text-xs text-gray-400">vs yesterday</span></div>,
    },
    {
      label: "Today's Profit",
      value: money(todayVsYesterday.profit.today),
      icon: TrendingUp,
      tone: 'bg-emerald-50 text-emerald-600',
      sub: <div className="flex items-center gap-1.5"><ChangePill value={todayVsYesterday.profit.change} /><span className="text-xs text-gray-400">vs yesterday</span></div>,
    },
    { label: 'Orders Today', value: ordersToday.length.toLocaleString(), icon: ShoppingCart, tone: 'bg-cyan-50 text-cyan-600' },
    {
      label: '7-Day Revenue',
      value: money(financial.revenue),
      icon: BarChart3,
      tone: 'bg-violet-50 text-violet-600',
      sub: <p className="text-xs text-gray-400">{money(financial.grossProfit)} gross profit</p>,
    },
  ];

  const quickStats = [
    { label: 'Avg order value (7d)', value: money(financial.aov), icon: BarChart3 },
    { label: 'Profit margin (7d)', value: `${financial.profitMargin.toFixed(1)}%`, icon: TrendingUp },
    { label: 'Repeat purchase rate', value: `${repeatMetrics.repeatPurchaseRate.toFixed(1)}%`, icon: Repeat },
    {
      label: 'Avg processing time',
      value: processingTime.samples ? `${processingTime.averageMinutes.toFixed(0)} min` : '—',
      icon: Timer,
    },
    { label: 'Active products', value: `${activeProducts.length} / ${data.products.length}`, icon: Package },
    { label: 'Pending KYC', value: pendingKyc.toLocaleString(), icon: ShieldCheck },
  ];

  const attention = [
    { label: 'Orders to fulfil', value: pendingOrdersCount, icon: ShoppingCart, tone: 'text-amber-700 bg-amber-50 border-amber-200', to: '/revenue/orders' },
    { label: 'Failed today', value: failedToday, icon: AlertCircle, tone: 'text-red-700 bg-red-50 border-red-200', to: '/revenue/orders' },
    { label: 'KYC reviews', value: pendingKyc, icon: ShieldCheck, tone: 'text-purple-700 bg-purple-50 border-purple-200', to: '/users' },
    { label: 'Out of stock', value: outOfStock, icon: PackageX, tone: 'text-slate-700 bg-slate-100 border-slate-200', to: '/products' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <LayoutDashboard className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              Store Overview
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Real-time store health{includeInternal ? ' · including internal (admin) orders' : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIncludeInternal((v: boolean) => !v)}
            className={clsx('btn btn-sm flex items-center gap-2', includeInternal ? 'btn-primary' : 'btn-outline')}
            title="Orders placed by admin accounts, normally excluded from dashboards"
          >
            <UserCog className="h-4 w-4" />
            {includeInternal ? 'Internal: On' : 'Internal: Off'}
          </button>
          <button
            onClick={() => setWalletOnly((v: boolean) => !v)}
            className={clsx('btn btn-sm flex items-center gap-2', walletOnly ? 'btn-primary' : 'btn-outline')}
          >
            <Wallet className="h-4 w-4" />
            {walletOnly ? 'Wallet Only' : 'Wallet Only: Off'}
          </button>
          <button onClick={refresh} disabled={loading} className="btn btn-outline btn-sm">
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
          <Link to="/analytics" className="btn btn-outline btn-sm">
            Deep Analytics
          </Link>
        </div>
      </div>

      {/* Today KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      {/* QuickStats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {quickStats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Icon className="h-3.5 w-3.5" />
              <p className="truncate text-xs">{label}</p>
            </div>
            <p className="mt-1.5 truncate text-lg font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Trend + attention rail */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
          <SectionHeader
            icon={TrendingUp}
            title="7-Day Revenue, Profit & Orders"
            hint={`${totalOrdersAllTime.toLocaleString()} orders all time`}
          />
          <div className="mt-4">
            {trend.some((t) => t.revenue > 0 || t.orders > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={64} />
                  <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                  <Tooltip formatter={(value, name) => [name === 'orders' ? Number(value).toLocaleString() : money(Number(value)), String(name)]} />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#dbeafe" name="Revenue" />
                  <Area yAxisId="left" type="monotone" dataKey="profit" stroke="#10b981" fill="#d1fae5" name="Profit" />
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Orders" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-16 text-center text-sm text-gray-400">No orders in the last 7 days.</p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Revenue</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Profit</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" /> Orders</span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader icon={AlertCircle} title="Needs Attention" />
          <div className="mt-4 space-y-2.5">
            {attention.map(({ label, value, icon: Icon, tone, to }) => (
              <button
                key={label}
                onClick={() => navigate(to)}
                className={clsx('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:opacity-90', tone)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
                <span className="shrink-0 text-lg font-bold">{value.toLocaleString()}</span>
                <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
              </button>
            ))}
          </div>
          {supplierPerformance.length > 0 && (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="mb-2 text-xs font-medium text-gray-500">Fulfilment success (7d)</p>
              <div className="space-y-1.5">
                {supplierPerformance.slice(0, 3).map((s) => (
                  <div key={s.provider} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{s.label}</span>
                    <span className={clsx('font-semibold', s.successRate >= 95 ? 'text-emerald-600' : s.successRate >= 80 ? 'text-amber-600' : 'text-red-600')}>
                      {s.successRate.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Products / Games / Payments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader icon={Package} title="Top Products" action={<Link to="/revenue/products" className="text-xs text-primary-600 hover:underline">All →</Link>} />
          <div className="mt-4 space-y-3">
            {productPerformance.length ? productPerformance.slice(0, 5).map((p) => (
              <div key={p.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-gray-700">{p.name}</span>
                  <span className="shrink-0 font-semibold text-gray-900">{money(p.revenue)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${topProductRevenue ? (p.revenue / topProductRevenue) * 100 : 0}%` }} />
                  </div>
                  <span className={clsx('shrink-0 text-xs font-medium', p.profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                    {p.profit >= 0 ? '+' : '-'}{money(Math.abs(p.profit))}
                  </span>
                </div>
              </div>
            )) : <p className="py-10 text-center text-sm text-gray-400">No completed sales in the last 7 days.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader icon={Gamepad2} title="Top Games" />
          <div className="mt-4 divide-y divide-gray-50">
            {gamePerformance.length ? gamePerformance.slice(0, 5).map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{g.name}</p>
                  <p className="text-xs text-gray-400">{g.orders} orders · {g.units} units</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-gray-900">{money(g.revenue)}</p>
              </div>
            )) : <p className="py-10 text-center text-sm text-gray-400">No game sales in the last 7 days.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader icon={CreditCard} title="Payment Methods" />
          <div className="mt-4 divide-y divide-gray-50">
            {paymentMethods.length ? paymentMethods.map((m) => (
              <div key={m.method} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium capitalize text-gray-900">{m.method}</p>
                  <p className="text-xs text-gray-400">{m.orders} orders</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-gray-900">{money(m.revenue)}</p>
              </div>
            )) : <p className="py-10 text-center text-sm text-gray-400">No payments in the last 7 days.</p>}
          </div>
        </div>
      </div>

      {/* Customers / Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4">
            <SectionHeader icon={Crown} title="Top Customers" action={<button onClick={() => navigate('/auth/clients')} className="text-xs text-primary-600 hover:underline">View all →</button>} />
          </div>
          <div className="divide-y divide-gray-50">
            {recentCustomers.length ? recentCustomers.map((c) => (
              <button key={c.id} onClick={() => navigate(`/users/${c.id}`)} className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-gray-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-xs text-gray-500">{c.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold">{money(c.spent)}</p>
                  <p className="text-xs text-gray-500">{c.orders} orders</p>
                </div>
              </button>
            )) : <p className="p-6 text-sm text-gray-400">No customer spending yet.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-gray-100 p-4">
            <SectionHeader icon={Activity} title="Recent Activity" action={<button onClick={() => navigate('/activity-logs')} className="text-xs text-primary-600 hover:underline">View all →</button>} />
          </div>
          <div className="divide-y divide-gray-50">
            {recentActivity.length ? recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium capitalize">{item.action.replace(/_/g, ' ')}</p>
                  {item.description && <p className="truncate text-xs text-gray-500">{item.description}</p>}
                </div>
                <p className="shrink-0 text-xs text-gray-400">{timeAgo(item.created_at)}</p>
              </div>
            )) : <p className="p-6 text-sm text-gray-400">No activity recorded.</p>}
          </div>
        </div>
      </div>

      {/* Refund / failure insight */}
      {(sevenDayReport.refundReasons.length > 0 || sevenDayReport.failureReasons.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {sevenDayReport.refundReasons.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <SectionHeader icon={RotateCcw} title="Refund Reasons" hint="7 days" />
              <div className="mt-4 divide-y divide-gray-50">
                {sevenDayReport.refundReasons.slice(0, 4).map((r) => (
                  <div key={r.reason} className="flex items-center justify-between gap-3 py-2.5">
                    <p className="min-w-0 truncate text-sm text-gray-700">{r.reason}</p>
                    <p className="shrink-0 text-sm font-semibold text-gray-900">{r.count} × {money(r.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {sevenDayReport.failureReasons.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <SectionHeader icon={AlertCircle} title="Failure Reasons" hint="7 days" />
              <div className="mt-4 divide-y divide-gray-50">
                {sevenDayReport.failureReasons.slice(0, 4).map((f) => (
                  <div key={f.reason} className="flex items-center justify-between gap-3 py-2.5">
                    <p className="min-w-0 truncate text-sm text-gray-700">{f.reason}</p>
                    <p className="shrink-0 text-sm font-semibold text-gray-900">{f.count} orders</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Revenue and profit exclude orders placed by admin accounts unless Internal is enabled above. Per-order P&amp;L lives under <Link to="/revenue/profit-loss" className="text-primary-600 hover:underline">Revenue → Profit &amp; Loss</Link>.
      </p>
    </div>
  );
};

export default Dashboard;
