import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
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
  Download,
  Eye,
  Filter,
  Gamepad2,
  LayoutDashboard,
  MessageSquare,
  Package,
  PackageX,
  Plug,
  RefreshCw,
  Repeat,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Timer,
  TrendingUp,
  UserCog,
} from 'lucide-react';
import {
  Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAdminReport } from '../hooks/useAdminReport';
import { useAdminCurrency } from '../lib/currency';
import { ADMIN_PERIOD_OPTIONS, AdminPeriod, exportToCsv, matchesAdminPeriod } from '../utils/dateRange';
import { fetchSmileOneStatus, SmileOneStatus } from '../services/providerService';
import { yokcash, YcHealthResponse } from '../services/yokcashService';
import OrderDrawer from '../components/orders/OrderDrawer';
import { DURATION, EASE_OUT, springSoft, staggerDelay, staggerItem, staggerParent } from '../lib/motion';
import {
  computeDashboardMetrics,
  computeCustomerInsights,
  toNumber,
} from '../utils/dashboardMetrics';
import type { ReportOrder } from '../services/reportingService';

function timeAgo(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const orderStatusBadge: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  on_hold: 'bg-orange-100 text-orange-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-gray-100 text-gray-700',
};

/** Ease-out count-up driven by rAF — settles in ~550ms, resumes from the last shown value. */
function useCountUp(target: number, duration = 550) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    if (reduceMotion) {
      prevRef.current = target;
      setDisplay(target);
      return;
    }
    const from = prevRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduceMotion]);
  return display;
}

function AnimatedNumber({ value, format }: { value: number; format: (v: number) => string }) {
  const current = useCountUp(value);
  return <span className="tabular-nums">{format(current)}</span>;
}

function ChangePill({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums',
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
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <motion.div variants={staggerItem} transition={{ duration: DURATION.base, ease: EASE_OUT }} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-gray-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold text-gray-900 tabular-nums">{value}</p>
        </div>
        <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {sub && <div className="mt-2">{sub}</div>}
    </motion.div>
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

function buildPeriodTrend(orders: ReportOrder[], period: AdminPeriod) {
  const useMonthly = period === '90d' || period === '1y' || period === 'all';
  if (!useMonthly) {
    const days = period === 'today' ? 1 : period === '30d' ? 30 : 7;
    const now = new Date();
    const map = new Map<string, { date: string; label: string; revenue: number; profit: number; orders: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, {
        date: key,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: 0,
        profit: 0,
        orders: 0,
      });
    }
    orders.forEach((o) => {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      const bucket = map.get(key);
      if (!bucket) return;
      bucket.orders += 1;
      if (o.status === 'completed') {
        const rev = toNumber(o.total_amount);
        const cost = toNumber(o.unit_cost_price) * (o.quantity || 1);
        bucket.revenue += rev;
        bucket.profit += rev - cost;
      }
    });
    return Array.from(map.values());
  }

  const bucketMap = new Map<string, { date: string; label: string; revenue: number; profit: number; orders: number }>();
  const sorted = [...orders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  sorted.forEach((o) => {
    const d = new Date(o.created_at);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const existing = bucketMap.get(key) ?? {
      date: key,
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      revenue: 0,
      profit: 0,
      orders: 0,
    };
    existing.orders += 1;
    if (o.status === 'completed') {
      const rev = toNumber(o.total_amount);
      const cost = toNumber(o.unit_cost_price) * (o.quantity || 1);
      existing.revenue += rev;
      existing.profit += rev - cost;
    }
    bucketMap.set(key, existing);
  });
  return Array.from(bucketMap.values());
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useAdminReport();
  const { formatMoney: money } = useAdminCurrency();

  const [period, setPeriod] = useState<AdminPeriod>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [includeInternal, setIncludeInternal] = useState(false);

  // Live supplier health & open support tickets
  const [smileStatus, setSmileStatus] = useState<SmileOneStatus | null>(null);
  const [yokStatus, setYokStatus] = useState<YcHealthResponse | null>(null);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);

  // Order drawer preview
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadOperationalExtras = useCallback(async () => {
    setSuppliersLoading(true);
    const [smileRes, yokRes, ticketsRes] = await Promise.allSettled([
      fetchSmileOneStatus(),
      yokcash.health(),
      supabase
        .from('support_requests')
        .select('id', { count: 'exact', head: true })
        .in('status', ['new', 'open']),
    ]);

    if (smileRes.status === 'fulfilled') setSmileStatus(smileRes.value);
    else setSmileStatus({ configured: false, connected: false, message: 'Offline' });

    if (yokRes.status === 'fulfilled') setYokStatus(yokRes.value);
    else setYokStatus({ configured: false, connected: false, message: 'Offline' });

    if (ticketsRes.status === 'fulfilled' && !ticketsRes.value.error) {
      setOpenTicketsCount(ticketsRes.value.count ?? 0);
    }
    setSuppliersLoading(false);
  }, []);

  useEffect(() => {
    void loadOperationalExtras();
  }, [loadOperationalExtras]);

  const handleRefreshAll = () => {
    void refresh();
    void loadOperationalExtras();
  };

  const adminIds = useMemo(
    () => new Set(data?.profiles.filter((p) => p.role === 'admin').map((p) => p.id) ?? []),
    [data]
  );

  const paymentMethodsList = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.orders.forEach((o) => {
      if (o.payment_method) set.add(o.payment_method);
    });
    return Array.from(set).sort();
  }, [data]);

  const baseScopedOrders = useMemo(() => {
    if (!data) return [];
    return data.orders.filter(
      (o) =>
        (includeInternal || !adminIds.has(o.user_id)) &&
        (paymentFilter === 'all' || (o.payment_method ?? '') === paymentFilter)
    );
  }, [data, adminIds, includeInternal, paymentFilter]);

  const periodScopedOrders = useMemo(
    () => baseScopedOrders.filter((o) => matchesAdminPeriod(o.created_at, period, customStart, customEnd)),
    [baseScopedOrders, period, customStart, customEnd]
  );

  const todayReport = useMemo(() => {
    if (!data) return null;
    return computeDashboardMetrics(
      { ...data, orders: baseScopedOrders },
      'today',
      new Date(),
      undefined,
      includeInternal
    );
  }, [data, baseScopedOrders, includeInternal]);

  const periodReport = useMemo(() => {
    if (!data) return null;
    return computeDashboardMetrics(
      { ...data, orders: periodScopedOrders },
      'lifetime',
      new Date(),
      undefined,
      includeInternal
    );
  }, [data, periodScopedOrders, includeInternal]);

  const trend = useMemo(
    () => buildPeriodTrend(periodScopedOrders, period),
    [periodScopedOrders, period]
  );

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

  if (error || !todayReport || !periodReport || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <AlertCircle className="h-5 w-5 mb-2" />
        <p className="font-medium">Could not load dashboard data</p>
        <p className="mt-1 text-sm">{error}</p>
        <button onClick={handleRefreshAll} className="btn btn-outline btn-sm mt-4">Retry</button>
      </div>
    );
  }

  const periodLabel =
    period === 'custom'
      ? 'Custom'
      : ADMIN_PERIOD_OPTIONS.find((opt) => opt.value === period)?.label ?? '7 Days';

  const { todayVsYesterday } = todayReport;
  const {
    financial,
    productPerformance,
    gamePerformance,
    paymentMethods,
    supplierPerformance,
    repeatMetrics,
    processingTime,
  } = periodReport;

  const totalOrdersAllTime = baseScopedOrders.length;
  const pendingOrdersCount = baseScopedOrders.filter((o) => ['pending', 'processing', 'on_hold'].includes(o.status)).length;
  const today = new Date();
  const ordersToday = baseScopedOrders.filter((o) => {
    const d = new Date(o.created_at);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  });
  const failedToday = ordersToday.filter((o) => o.status === 'failed').length;
  const pendingKyc = data.pendingKyc;
  const activeProducts = data.products.filter((p) => p.status === 'active');
  const outOfStock = activeProducts.filter((p) => Number(p.stock ?? 0) <= 0).length;
  const recentActivity = data.activities
    .filter((a) => (includeInternal || !adminIds.has(a.user_id ?? '')) && matchesAdminPeriod(a.created_at, period, customStart, customEnd))
    .slice(0, 8);
  const topCustomersInPeriod = computeCustomerInsights(periodScopedOrders, data.profiles).slice(0, 5);
  const recentOrders = periodScopedOrders.slice(0, 8);
  const topProductRevenue = productPerformance[0]?.revenue ?? 0;

  const handleExportOverview = () => {
    exportToCsv(
      `dashboard-orders-${period}`,
      ['Order ID', 'Date', 'Customer', 'Email', 'Product', 'Quantity', 'Amount', 'Currency', 'Payment Method', 'Status'],
      periodScopedOrders.map((o) => [
        o.id,
        o.created_at,
        o.profiles?.name ?? 'Unknown',
        o.profiles?.email ?? '',
        o.product_name,
        o.quantity,
        Number(o.total_amount || 0).toFixed(2),
        o.currency,
        o.payment_method ?? '',
        o.status,
      ])
    );
  };

  const kpis = [
    {
      label: "Today's Revenue",
      value: <AnimatedNumber value={todayVsYesterday.revenue.today} format={money} />,
      icon: DollarSign,
      tone: 'bg-blue-50 text-blue-600',
      sub: <div className="flex items-center gap-1.5"><ChangePill value={todayVsYesterday.revenue.change} /><span className="text-xs text-gray-400">vs yesterday</span></div>,
    },
    {
      label: "Today's Profit",
      value: <AnimatedNumber value={todayVsYesterday.profit.today} format={money} />,
      icon: TrendingUp,
      tone: 'bg-emerald-50 text-emerald-600',
      sub: <div className="flex items-center gap-1.5"><ChangePill value={todayVsYesterday.profit.change} /><span className="text-xs text-gray-400">vs yesterday</span></div>,
    },
    {
      label: 'Orders Today',
      value: <AnimatedNumber value={ordersToday.length} format={(v) => Math.round(v).toLocaleString()} />,
      icon: ShoppingCart,
      tone: 'bg-cyan-50 text-cyan-600',
      sub: <p className="text-xs text-gray-400 tabular-nums">{periodScopedOrders.length.toLocaleString()} in {periodLabel}</p>,
    },
    {
      label: `${periodLabel} Revenue`,
      value: <AnimatedNumber value={financial.revenue} format={money} />,
      icon: BarChart3,
      tone: 'bg-violet-50 text-violet-600',
      sub: <p className="text-xs text-gray-400 tabular-nums">{money(financial.grossProfit)} gross profit</p>,
    },
  ];

  const quickStats = [
    { label: `Avg order value (${periodLabel})`, value: <AnimatedNumber value={financial.aov} format={money} />, icon: BarChart3 },
    { label: `Profit margin (${periodLabel})`, value: <AnimatedNumber value={financial.profitMargin} format={(v) => `${v.toFixed(1)}%`} />, icon: TrendingUp },
    { label: 'Repeat purchase rate', value: <AnimatedNumber value={repeatMetrics.repeatPurchaseRate} format={(v) => `${v.toFixed(1)}%`} />, icon: Repeat },
    {
      label: 'Avg processing time',
      value: processingTime.samples ? <AnimatedNumber value={processingTime.averageMinutes} format={(v) => `${v.toFixed(0)} min`} /> : '—',
      icon: Timer,
    },
    { label: 'Active products', value: `${activeProducts.length} / ${data.products.length}`, icon: Package },
    { label: 'Pending KYC', value: <AnimatedNumber value={pendingKyc} format={(v) => Math.round(v).toLocaleString()} />, icon: ShieldCheck },
  ];

  const attention = [
    { label: 'Orders to fulfil', value: pendingOrdersCount, icon: ShoppingCart, tone: 'text-amber-700 bg-amber-50 border-amber-200', to: '/orders/manual' },
    { label: 'Failed today', value: failedToday, icon: AlertCircle, tone: 'text-red-700 bg-red-50 border-red-200', to: '/revenue/orders' },
    { label: 'Open support tickets', value: openTicketsCount, icon: MessageSquare, tone: 'text-blue-700 bg-blue-50 border-blue-200', to: '/messages' },
    { label: 'KYC reviews', value: pendingKyc, icon: ShieldCheck, tone: 'text-purple-700 bg-purple-50 border-purple-200', to: '/users?kyc=pending' },
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
              Real-time store health · Showing {periodLabel.toLowerCase()} metrics{includeInternal ? ' (including internal admin orders)' : ''}
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
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-gray-400 hidden sm:inline" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="input h-8 py-1 text-xs !w-auto capitalize"
            >
              <option value="all">All Payments</option>
              {paymentMethodsList.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleExportOverview}
            disabled={!periodScopedOrders.length}
            className="btn btn-outline btn-sm flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button onClick={handleRefreshAll} disabled={loading} className="btn btn-outline btn-sm">
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
          <Link to="/analytics" className="btn btn-primary btn-sm">
            Deep Analytics
          </Link>
        </div>
      </div>

      {/* Period Filter Bar + Supplier Live Status Strip */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {ADMIN_PERIOD_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                period === value
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Supplier Live Health Strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-400 flex items-center gap-1 font-medium">
            <Plug className="w-3.5 h-3.5 text-primary-600" /> Suppliers:
          </span>
          <button
            type="button"
            onClick={() => navigate('/providers/smile-one')}
            className={clsx(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-medium transition-colors',
              suppliersLoading
                ? 'bg-gray-50 text-gray-500 border-gray-200'
                : smileStatus?.connected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            )}
          >
            <span className={clsx('w-2 h-2 rounded-full', smileStatus?.connected ? 'bg-emerald-500' : 'bg-amber-500')} />
            <span>Smile.One</span>
            {smileStatus?.usd_balance != null && (
              <span className="font-bold tabular-nums">${Number(smileStatus.usd_balance).toFixed(2)}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/providers/yokcash')}
            className={clsx(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-medium transition-colors',
              suppliersLoading
                ? 'bg-gray-50 text-gray-500 border-gray-200'
                : yokStatus?.connected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            )}
          >
            <span className={clsx('w-2 h-2 rounded-full', yokStatus?.connected ? 'bg-emerald-500' : 'bg-amber-500')} />
            <span>Yokcash</span>
            {yokStatus?.saldo != null && (
              <span className="font-bold tabular-nums">IDR {Number(yokStatus.saldo).toLocaleString()}</span>
            )}
          </button>
        </div>
      </div>

      {period === 'custom' && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <label className="text-xs text-gray-500">
            Start date
            <input
              type="date"
              className="input mt-1 h-9 text-xs block"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
          </label>
          <label className="text-xs text-gray-500">
            End date
            <input
              type="date"
              className="input mt-1 h-9 text-xs block"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </label>
        </div>
      )}

      {/* Today KPI row */}
      <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </motion.div>

      {/* QuickStats strip */}
      <motion.div variants={staggerParent} initial="initial" animate="animate" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {quickStats.map(({ label, value, icon: Icon }) => (
          <motion.div key={label} variants={staggerItem} transition={{ duration: DURATION.base, ease: EASE_OUT }} className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Icon className="h-3.5 w-3.5" />
              <p className="truncate text-xs">{label}</p>
            </div>
            <p className="mt-1.5 truncate text-lg font-bold text-gray-900 tabular-nums">{value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Trend + attention rail */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: DURATION.base, ease: EASE_OUT }}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2"
        >
          <SectionHeader
            icon={TrendingUp}
            title={`Revenue, Profit & Orders (${periodLabel})`}
            hint={`${periodScopedOrders.length.toLocaleString()} orders in period · ${totalOrdersAllTime.toLocaleString()} all time`}
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
              <p className="py-16 text-center text-sm text-gray-400">No orders in the selected period.</p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Revenue</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Profit</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" /> Orders</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: DURATION.base, ease: EASE_OUT }}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <SectionHeader icon={AlertCircle} title="Needs Attention" />
          <div className="mt-4 space-y-2">
            {attention.map(({ label, value, icon: Icon, tone, to }, i) => (
              <motion.button
                key={label}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + staggerDelay(i, 0.05, 0.15), duration: DURATION.base, ease: EASE_OUT }}
                onClick={() => navigate(to)}
                className={clsx('flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition hover:opacity-90', tone)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
                <span className="shrink-0 text-base font-bold tabular-nums">{value.toLocaleString()}</span>
                <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
              </motion.button>
            ))}
          </div>
          {supplierPerformance.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs font-medium text-gray-500">Fulfilment success ({periodLabel})</p>
              <div className="space-y-1.5">
                {supplierPerformance.slice(0, 3).map((s) => (
                  <div key={s.provider} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{s.label}</span>
                    <span className={clsx('font-semibold tabular-nums', s.successRate >= 95 ? 'text-emerald-600' : s.successRate >= 80 ? 'text-amber-600' : 'text-red-600')}>
                      {s.successRate.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Live Recent Orders Feed */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: DURATION.base, ease: EASE_OUT }}
        className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="border-b border-gray-100 px-5 py-4 flex flex-wrap items-center justify-between gap-2">
          <SectionHeader
            icon={ShoppingCart}
            title={`Recent Orders (${periodLabel})`}
            hint="Click View to inspect or update fulfillment status"
          />
          <div className="flex items-center gap-3 text-xs">
            <Link to="/orders/manual" className="font-medium text-violet-600 hover:underline">
              Manual Queue ({pendingOrdersCount}) →
            </Link>
            <Link to="/orders" className="font-medium text-primary-600 hover:underline">
              All Orders →
            </Link>
          </div>
        </div>
        {recentOrders.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">No orders in the selected period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Order', 'Customer', 'Product', 'Amount', 'Payment', 'Status', 'When', ''].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono font-semibold text-gray-900 whitespace-nowrap">
                      #{o.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/users/${o.user_id}`)}
                        className="text-left hover:underline"
                      >
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[140px]">
                          {o.profiles?.name || 'Customer'}
                        </p>
                        <p className="text-xs text-gray-400 truncate max-w-[140px]">
                          {o.profiles?.email || o.user_id.slice(0, 8)}
                        </p>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 max-w-[200px] truncate">
                      {o.product_name}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap tabular-nums">
                      {money(toNumber(o.total_amount))}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize text-gray-500 whitespace-nowrap">
                      {o.payment_method || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={clsx(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                          orderStatusBadge[o.status] ?? 'bg-gray-100 text-gray-700'
                        )}
                      >
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap tabular-nums">
                      {timeAgo(o.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrder(o);
                          setDrawerOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Products / Games / Payments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: DURATION.base, ease: EASE_OUT }}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <SectionHeader icon={Package} title={`Top Products (${periodLabel})`} action={<Link to="/revenue/products" className="text-xs text-primary-600 hover:underline">All →</Link>} />
          <div className="mt-4 space-y-3">
            {productPerformance.length ? productPerformance.slice(0, 5).map((p) => (
              <div key={p.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-gray-700">{p.name}</span>
                  <span className="shrink-0 font-semibold text-gray-900 tabular-nums">{money(p.revenue)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <motion.div
                      initial={false}
                      animate={{ width: `${topProductRevenue ? (p.revenue / topProductRevenue) * 100 : 0}%` }}
                      transition={springSoft}
                      className="h-full rounded-full bg-primary-500"
                    />
                  </div>
                  <span className={clsx('shrink-0 text-xs font-medium tabular-nums', p.profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                    {p.profit >= 0 ? '+' : '-'}{money(Math.abs(p.profit))}
                  </span>
                </div>
              </div>
            )) : <p className="py-10 text-center text-sm text-gray-400">No completed sales in this period.</p>}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: DURATION.base, ease: EASE_OUT }}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <SectionHeader icon={Gamepad2} title={`Top Games (${periodLabel})`} />
          <div className="mt-4 divide-y divide-gray-50">
            {gamePerformance.length ? gamePerformance.slice(0, 5).map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{g.name}</p>
                  <p className="text-xs text-gray-400 tabular-nums">{g.orders} orders · {g.units} units</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-gray-900 tabular-nums">{money(g.revenue)}</p>
              </div>
            )) : <p className="py-10 text-center text-sm text-gray-400">No game sales in this period.</p>}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, duration: DURATION.base, ease: EASE_OUT }}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <SectionHeader icon={CreditCard} title={`Payment Methods (${periodLabel})`} />
          <div className="mt-4 divide-y divide-gray-50">
            {paymentMethods.length ? paymentMethods.map((m) => (
              <div key={m.method} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium capitalize text-gray-900">{m.method}</p>
                  <p className="text-xs text-gray-400 tabular-nums">{m.orders} orders</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-gray-900 tabular-nums">{money(m.revenue)}</p>
              </div>
            )) : <p className="py-10 text-center text-sm text-gray-400">No payments in this period.</p>}
          </div>
        </motion.div>
      </div>

      {/* Customers / Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: DURATION.base, ease: EASE_OUT }}
          className="rounded-xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="border-b border-gray-100 p-4">
            <SectionHeader icon={Crown} title={`Top Customers (${periodLabel})`} action={<button onClick={() => navigate('/auth/clients')} className="text-xs text-primary-600 hover:underline">View all →</button>} />
          </div>
          <div className="divide-y divide-gray-50">
            {topCustomersInPeriod.length ? topCustomersInPeriod.map((c) => (
              <button key={c.id} onClick={() => navigate(`/users/${c.id}`)} className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-gray-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-xs text-gray-500">{c.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">{money(c.spent)}</p>
                  <p className="text-xs text-gray-500 tabular-nums">{c.orders} orders</p>
                </div>
              </button>
            )) : <p className="p-6 text-sm text-gray-400">No customer spending in this period.</p>}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46, duration: DURATION.base, ease: EASE_OUT }}
          className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2"
        >
          <div className="border-b border-gray-100 p-4">
            <SectionHeader icon={Activity} title={`Recent Activity (${periodLabel})`} action={<button onClick={() => navigate('/activity-logs')} className="text-xs text-primary-600 hover:underline">View all →</button>} />
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
            )) : <p className="p-6 text-sm text-gray-400">No activity recorded in this period.</p>}
          </div>
        </motion.div>
      </div>

      {/* Refund / failure insight */}
      {(periodReport.refundReasons.length > 0 || periodReport.failureReasons.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {periodReport.refundReasons.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <SectionHeader icon={RotateCcw} title="Refund Reasons" hint={periodLabel} />
              <div className="mt-4 divide-y divide-gray-50">
                {periodReport.refundReasons.slice(0, 4).map((r) => (
                  <div key={r.reason} className="flex items-center justify-between gap-3 py-2.5">
                    <p className="min-w-0 truncate text-sm text-gray-700">{r.reason}</p>
                    <p className="shrink-0 text-sm font-semibold text-gray-900 tabular-nums">{r.count} × {money(r.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {periodReport.failureReasons.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <SectionHeader icon={AlertCircle} title="Failure Reasons" hint={periodLabel} />
              <div className="mt-4 divide-y divide-gray-50">
                {periodReport.failureReasons.slice(0, 4).map((f) => (
                  <div key={f.reason} className="flex items-center justify-between gap-3 py-2.5">
                    <p className="min-w-0 truncate text-sm text-gray-700">{f.reason}</p>
                    <p className="shrink-0 text-sm font-semibold text-gray-900 tabular-nums">{f.count} orders</p>
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

      <OrderDrawer
        order={selectedOrder}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedOrder(null);
        }}
        onStatusChange={() => {
          void refresh();
        }}
      />
    </div>
  );
};

export default Dashboard;
