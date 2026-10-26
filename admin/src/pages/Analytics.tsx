import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Activity, AlertCircle, BarChart3, CircleDollarSign, CreditCard, DollarSign,
  Download, Gamepad2, Monitor, Package, RefreshCw, RotateCcw, ShoppingCart,
  TrendingDown, TrendingUp, UserCog, Users, Wallet, Zap,
} from 'lucide-react';
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import clsx from 'clsx';
import { AdminAnalytics, AnalyticsPeriod, getAdminAnalytics } from '../services/adminAnalyticsService';
import { useAdminReport } from '../hooks/useAdminReport';
import { useAdminCurrency } from '../lib/currency';
import { AdminPeriod, exportToCsv, matchesAdminPeriod } from '../utils/dateRange';
import { DURATION, EASE_OUT, staggerDelay } from '../lib/motion';
import {
  computeDashboardMetrics,
  computeSupplierPerformance,
  computePaymentMethodBreakdown,
  computePeakSales,
} from '../utils/dashboardMetrics';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#64748b', '#06b6d4', '#ec4899'];
const periods: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: 'today', label: 'Today' }, { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' }, { value: '6m', label: '6 months' },
  { value: '1y', label: '1 year' }, { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
];

const SECTION_TABS = [
  { id: 'financial', label: 'Financial' },
  { id: 'products', label: 'Products' },
  { id: 'customers', label: 'Customers' },
  { id: 'api', label: 'API & Suppliers' },
  { id: 'activity', label: 'Platform & User Activity' },
] as const;
type SectionTab = typeof SECTION_TABS[number]['id'];

const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const { formatMoney } = useAdminCurrency();
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [report, setReport] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionTab>('financial');
  const [walletOnly, setWalletOnly] = useState(false);
  const [includeInternal, setIncludeInternal] = useState(false);
  const reduceMotion = useReducedMotion();

  const { data: reportData, loading: reportLoading } = useAdminReport();

  const refresh = useCallback(async () => {
    if (period === 'custom' && (!customStart || !customEnd)) return;
    setLoading(true);
    setError(null);
    try {
      setReport(await getAdminAnalytics(period, customStart, customEnd, walletOnly ? 'wallet' : null));
    } catch (err) {
      setError((err as Error).message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd, walletOnly]);

  useEffect(() => { void refresh(); }, [refresh]);

  const adminIds = useMemo(
    () => new Set(reportData?.profiles.filter((p) => p.role === 'admin').map((p) => p.id) ?? []),
    [reportData]
  );

  const lifetimeMetrics = useMemo(() => {
    if (!reportData) return null;
    return computeDashboardMetrics(reportData, 'lifetime', new Date(), walletOnly ? 'wallet' : undefined, includeInternal);
  }, [reportData, walletOnly, includeInternal]);

  const filteredOrders = useMemo(() => {
    if (!reportData) return [];
    return reportData.orders.filter(
      (o) =>
        (includeInternal || !adminIds.has(o.user_id)) &&
        (!walletOnly || o.payment_method === 'wallet') &&
        matchesAdminPeriod(o.created_at, period as AdminPeriod, customStart, customEnd)
    );
  }, [reportData, adminIds, includeInternal, walletOnly, period, customStart, customEnd]);

  const periodMetrics = useMemo(() => {
    if (!reportData) return null;
    return computeDashboardMetrics(
      { ...reportData, orders: filteredOrders },
      'lifetime',
      new Date(),
      walletOnly ? 'wallet' : undefined,
      includeInternal
    );
  }, [reportData, filteredOrders, walletOnly, includeInternal]);

  const filteredActivities = useMemo(() => {
    if (!reportData) return [];
    return reportData.activities.filter(
      (a) =>
        (includeInternal || !adminIds.has(a.user_id ?? '')) &&
        matchesAdminPeriod(a.created_at, period as AdminPeriod, customStart, customEnd)
    );
  }, [reportData, adminIds, includeInternal, period, customStart, customEnd]);

  const supplierPerf = useMemo(() => {
    if (!reportData) return [];
    return computeSupplierPerformance(filteredOrders, reportData.products);
  }, [reportData, filteredOrders]);

  const paymentBreakdown = useMemo(() => {
    if (!reportData) return [];
    return computePaymentMethodBreakdown(filteredOrders);
  }, [reportData, filteredOrders]);

  const peakSales = useMemo(() => {
    if (!reportData) return null;
    return computePeakSales(filteredOrders);
  }, [reportData, filteredOrders]);

  const periodLabel = period === 'custom' ? 'Custom range' : (periods.find((p) => p.value === period)?.label ?? period);

  const handleExportSection = () => {
    if (!report) return;
    if (activeSection === 'financial') {
      exportToCsv(
        `analytics-financial-${period}`,
        ['Bucket', 'Orders', 'Revenue', 'Known Profit'],
        report.trend.map((t) => [t.bucket, t.orders, t.revenue, t.profit])
      );
    } else if (activeSection === 'products') {
      const list = periodMetrics?.productPerformance ?? [];
      exportToCsv(
        `analytics-products-${period}`,
        ['Product', 'Game', 'Provider', 'Units', 'Revenue', 'Cost', 'Profit'],
        list.map((p) => [p.name, p.gameName, p.provider, p.units, p.revenue, p.cost, p.profit])
      );
    } else if (activeSection === 'customers') {
      const list = periodMetrics?.customerInsights ?? [];
      exportToCsv(
        `analytics-customers-${period}`,
        ['Customer', 'Email', 'Orders', 'Spent', 'Profit'],
        list.map((c) => [c.name, c.email, c.orders, c.spent, c.profit])
      );
    } else if (activeSection === 'api') {
      exportToCsv(
        `analytics-suppliers-${period}`,
        ['Provider', 'Orders', 'Successful', 'Failed', 'Success Rate %', 'Revenue', 'COGS Spend'],
        supplierPerf.map((s) => [s.label, s.orders, s.successful, s.failed, s.successRate.toFixed(1), s.revenue, s.spend])
      );
    } else {
      exportToCsv(
        `analytics-activity-${period}`,
        ['Timestamp', 'User ID', 'Action', 'Description', 'IP'],
        filteredActivities.map((a) => [a.created_at, a.user_id, a.action, a.description ?? '', a.ip_address ?? ''])
      );
    }
  };

  if (loading && !report) return (
    <div className="py-24 text-center text-gray-400">
      <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3" />
      Loading analytics...
    </div>
  );
  if (error || !report) return (
    <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700">
      <AlertCircle className="w-5 h-5 mb-2" />{error}
      <button onClick={() => void refresh()} className="btn btn-outline btn-sm ml-4">Retry</button>
    </div>
  );

  const { metrics, customers, wallet } = report;
  const completionRate = metrics.total_orders ? (metrics.completed_orders / metrics.total_orders) * 100 : 0;
  const averageOrder = metrics.completed_orders ? metrics.revenue / metrics.completed_orders : 0;
  const statusData = report.statuses.map((item, index) => ({ ...item, count: Number(item.count), color: COLORS[index % COLORS.length] }));
  const trend = report.trend.map((item) => ({
    ...item,
    label: new Date(item.bucket).toLocaleDateString(undefined, {
      month: 'short',
      day: period === '6m' || period === '1y' || period === 'all' ? undefined : 'numeric',
      year: period === '1y' || period === 'all' ? '2-digit' : undefined,
    }),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
              <BarChart3 className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Analytics</h1>
              <p className="text-sm text-gray-500">Business intelligence — why is the store performing this way?</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => navigate('/dashboard')} className="btn btn-outline btn-sm">← Overview</button>
            <button
              onClick={() => setIncludeInternal((v) => !v)}
              className={clsx('btn btn-sm flex items-center gap-1.5', includeInternal ? 'btn-primary' : 'btn-outline')}
              title="Toggle admin test orders in client-side breakdowns"
            >
              <UserCog className="h-4 w-4" />
              {includeInternal ? 'Internal: Included' : 'Internal: Excluded'}
            </button>
            <button
              onClick={() => setWalletOnly((v: boolean) => !v)}
              className={clsx(
                'btn btn-sm flex items-center gap-2',
                walletOnly ? 'btn-primary' : 'btn-outline'
              )}
            >
              <Wallet className="h-4 w-4" />
              {walletOnly ? 'Wallet Only' : 'Wallet Only: Off'}
            </button>
            <button onClick={handleExportSection} className="btn btn-outline btn-sm flex items-center gap-1.5">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button onClick={() => void refresh()} className="btn btn-outline btn-sm">
              <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex flex-wrap gap-2">
          {periods.map(({ value, label }) => (
            <button key={value} onClick={() => setPeriod(value)}
              className={clsx('rounded-lg px-3 py-1.5 text-sm', period === value ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
            <label className="text-xs text-gray-500">Start
              <input type="date" className="input mt-1 block" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </label>
            <label className="text-xs text-gray-500">End
              <input type="date" className="input mt-1 block" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </label>
          </div>
        )}

        {/* Section tabs */}
        <div className="flex gap-1 border-b border-gray-200 -mb-px overflow-x-auto">
          {SECTION_TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveSection(tab.id)}
              className={clsx(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                activeSection === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              )}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── FINANCIAL ─── */}
      <AnimatePresence mode="wait" initial={false}>
      {activeSection === 'financial' && (
        <motion.div
          key="financial"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: DURATION.fast } }}
          transition={{ duration: DURATION.base, ease: EASE_OUT }}
          className="space-y-6"
        >
          {/* KPI grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Revenue', value: formatMoney(metrics.revenue), icon: DollarSign, tone: 'bg-blue-50 text-blue-600' },
              { label: 'Known Gross Profit', value: formatMoney(metrics.known_profit), icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-600' },
              { label: 'Known Cost (COGS)', value: formatMoney(metrics.known_cost), icon: CircleDollarSign, tone: 'bg-violet-50 text-violet-600' },
              { label: 'Refunded Value', value: formatMoney(metrics.refunds), icon: RotateCcw, tone: 'bg-red-50 text-red-600' },
              { label: 'Total Orders', value: metrics.total_orders.toLocaleString(), icon: ShoppingCart, tone: 'bg-cyan-50 text-cyan-600' },
              { label: 'Ordering Customers', value: metrics.ordering_customers.toLocaleString(), icon: Users, tone: 'bg-purple-50 text-purple-600' },
              { label: 'Wallet Spend', value: formatMoney(wallet.wallet_spend), icon: Wallet, tone: 'bg-amber-50 text-amber-600' },
              { label: 'Completion Rate', value: `${completionRate.toFixed(1)}%`, icon: TrendingUp, tone: 'bg-green-50 text-green-600' },
            ].map(({ label, value, icon: Icon, tone }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: staggerDelay(i, 0.04, 0.22), duration: DURATION.base, ease: EASE_OUT }}
                className="flex items-center gap-4 rounded-xl border bg-white p-5"
              >
                <div className={clsx('flex h-11 w-11 items-center justify-center rounded-xl shrink-0', tone)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="truncate text-xl font-bold tabular-nums">{value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {metrics.profit_unknown_orders > 0 && (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>Profit excludes {metrics.profit_unknown_orders.toLocaleString()} completed historical orders with no cost snapshot.</span>
            </div>
          )}

          {/* Revenue / Profit / Orders trend */}
          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 font-semibold">Revenue, Known Profit &amp; Orders — {periodLabel}</h2>
            {trend.length ? (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => [name === 'orders' ? Number(value).toLocaleString() : formatMoney(Number(value)), String(name)]} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#dbeafe" name="Revenue" />
                  <Area yAxisId="left" type="monotone" dataKey="profit" stroke="#10b981" fill="#d1fae5" name="Profit" />
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Orders" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <p className="py-20 text-center text-sm text-gray-400">No orders in this period.</p>}
          </div>

          {/* Order status breakdown */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-1 font-semibold">Orders by Status</h2>
              <p className="mb-4 text-xs text-gray-500">All orders in selected period</p>
              {statusData.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statusData} dataKey="count" nameKey="status" innerRadius={55} outerRadius={95} label>
                      {statusData.map((entry) => <Cell key={entry.status} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="py-20 text-center text-sm text-gray-400">No status data.</p>}
            </div>

            {/* Payment method breakdown */}
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4 text-indigo-500" /> Payment Method Breakdown ({periodLabel})</h2>
              {paymentBreakdown.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={paymentBreakdown} dataKey="revenue" nameKey="method" outerRadius={95} label>
                      {paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatMoney(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="py-20 text-center text-sm text-gray-400">No payment data.</p>}
            </div>
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border bg-white p-5 sm:grid-cols-3 lg:grid-cols-6">
            <div><p className="text-xs text-gray-500">Average Order</p><p className="text-lg font-bold tabular-nums">{formatMoney(averageOrder)}</p></div>
            <div><p className="text-xs text-gray-500">Successful</p><p className="text-lg font-bold text-emerald-600 tabular-nums">{metrics.completed_orders}</p></div>
            <div><p className="text-xs text-gray-500">Failed</p><p className="flex items-center gap-1 text-lg font-bold text-red-600 tabular-nums"><TrendingDown className="h-4 w-4" />{metrics.failed_orders}</p></div>
            <div><p className="text-xs text-gray-500">Pending</p><p className="text-lg font-bold text-amber-600 tabular-nums">{metrics.pending_orders}</p></div>
            <div><p className="text-xs text-gray-500">New Customers</p><p className="text-lg font-bold tabular-nums">{customers.new_customers}</p></div>
            <div><p className="text-xs text-gray-500">Customer Wallets</p><p className="text-lg font-bold tabular-nums">{formatMoney(customers.customer_wallet_balance)}</p></div>
          </div>

          {/* Lifetime comparison */}
          {lifetimeMetrics && (
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 font-semibold">Lifetime Business Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Lifetime Revenue', value: formatMoney(lifetimeMetrics.financial.revenue) },
                  { label: 'Lifetime Gross Profit', value: formatMoney(lifetimeMetrics.financial.grossProfit) },
                  { label: 'Lifetime Net Profit', value: formatMoney(lifetimeMetrics.financial.netProfit) },
                  { label: 'Profit Margin', value: `${lifetimeMetrics.financial.profitMargin.toFixed(1)}%` },
                  { label: 'Total Successful Orders', value: lifetimeMetrics.financial.successfulOrders.toLocaleString() },
                  { label: 'Total Refunds', value: formatMoney(lifetimeMetrics.financial.refunds) },
                  { label: 'Lost Revenue (Failed)', value: formatMoney(lifetimeMetrics.financial.lostRevenue) },
                  { label: 'All-Time AOV', value: formatMoney(lifetimeMetrics.financial.aov) },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-base font-bold text-gray-900 mt-0.5 tabular-nums">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── PRODUCTS ─── */}
      {activeSection === 'products' && (
        <motion.div
          key="products"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: DURATION.fast } }}
          transition={{ duration: DURATION.base, ease: EASE_OUT }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top products by revenue (server-side, filtered by period) */}
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 font-semibold flex items-center gap-2"><Package className="w-4 h-4 text-blue-500" /> Top Products by Revenue ({periodLabel})</h2>
              {report.products.length ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={report.products.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatMoney(Number(value))} />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Revenue" />
                    <Bar dataKey="profit" fill="#10b981" radius={[0, 4, 4, 0]} name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="py-20 text-center text-sm text-gray-400">No completed product sales.</p>}
            </div>

            {/* Best-selling games (period-scoped) */}
            {periodMetrics && (
              <div className="rounded-xl border bg-white p-5">
                <h2 className="mb-4 font-semibold flex items-center gap-2"><Gamepad2 className="w-4 h-4 text-violet-500" /> Best-Selling Games ({periodLabel})</h2>
                {periodMetrics.gamePerformance.length ? (
                  <div className="space-y-3">
                    {periodMetrics.gamePerformance.slice(0, 8).map((game) => (
                      <div key={game.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{game.name}</p>
                          <p className="text-xs text-gray-500">{game.orders} orders · {game.units} units</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums">{formatMoney(game.revenue)}</p>
                          <p className="text-xs text-emerald-600 tabular-nums">+{formatMoney(game.profit)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="py-8 text-center text-sm text-gray-400">No game sales in this period.</p>}
              </div>
            )}
          </div>

          {periodMetrics && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Most profitable products */}
              <div className="rounded-xl border bg-white p-5">
                <h2 className="mb-4 font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> Most Profitable Products ({periodLabel})</h2>
                {periodMetrics.productPerformance.length ? (
                  <div className="space-y-3">
                    {[...periodMetrics.productPerformance].sort((a, b) => b.profit - a.profit).slice(0, 6).map((p) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.units} sold · {p.revenue ? ((p.profit / p.revenue) * 100).toFixed(1) : 0}% margin</p>
                        </div>
                        <p className="text-sm font-semibold text-emerald-600 tabular-nums">+{formatMoney(p.profit)}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="py-8 text-center text-sm text-gray-400">No profit data in this period.</p>}
              </div>

              {/* Loss-making products */}
              <div className="rounded-xl border bg-white p-5">
                <h2 className="mb-4 font-semibold flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-500" /> Loss-Making Products ({periodLabel})</h2>
                {periodMetrics.productPerformance.filter((p) => p.profit < 0).length ? (
                  <div className="space-y-3">
                    {periodMetrics.productPerformance.filter((p) => p.profit < 0).sort((a, b) => a.profit - b.profit).slice(0, 6).map((p) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.units} sold · revenue {formatMoney(p.revenue)}</p>
                        </div>
                        <p className="text-sm font-semibold text-red-600 tabular-nums">{formatMoney(p.profit)}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="py-8 text-center text-sm text-gray-400">No loss-making products in this period.</p>}
              </div>
            </div>
          )}

          {/* Peak sales hours and days */}
          {peakSales && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border bg-white p-5">
                <h2 className="mb-4 font-semibold">Peak Sales Hours ({periodLabel})</h2>
                {peakSales.hourly.some((h) => h.orders > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={peakSales.hourly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="py-8 text-center text-sm text-gray-400">No data in this period.</p>}
              </div>
              <div className="rounded-xl border bg-white p-5">
                <h2 className="mb-4 font-semibold">Peak Sales Days ({periodLabel})</h2>
                {peakSales.daily.some((d) => d.orders > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={peakSales.daily}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="py-8 text-center text-sm text-gray-400">No data in this period.</p>}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── CUSTOMERS ─── */}
      {activeSection === 'customers' && (
        <motion.div
          key="customers"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: DURATION.fast } }}
          transition={{ duration: DURATION.base, ease: EASE_OUT }}
          className="space-y-6"
        >
          {/* Customer summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Customers', value: customers.total_customers.toLocaleString(), icon: Users, tone: 'bg-blue-50 text-blue-600' },
              { label: 'New Customers', value: customers.new_customers.toLocaleString(), icon: Users, tone: 'bg-emerald-50 text-emerald-600' },
              { label: 'Returning Customers', value: customers.returning.toLocaleString(), icon: Users, tone: 'bg-violet-50 text-violet-600' },
              { label: 'Customer Wallet Balance', value: formatMoney(customers.customer_wallet_balance), icon: Wallet, tone: 'bg-amber-50 text-amber-600' },
            ].map(({ label, value, icon: Icon, tone }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: staggerDelay(i, 0.04, 0.14), duration: DURATION.base, ease: EASE_OUT }}
                className="rounded-xl border bg-white p-5 flex items-center gap-3"
              >
                <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', tone)}><Icon className="w-5 h-5" /></div>
                <div><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p></div>
              </motion.div>
            ))}
          </div>

          {/* Top customers by spending in period */}
          {periodMetrics && (
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b p-4 flex items-center justify-between">
                <h2 className="font-semibold">Top Customers by Spend ({periodLabel})</h2>
                <button onClick={() => navigate('/auth/clients')} className="text-xs text-primary-600 hover:underline">View all →</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Customer', 'Email', 'Orders', 'Period Spend', 'Profit'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {periodMetrics.customerInsights.slice(0, 15).map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/users/${c.id}`)}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{c.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">{c.orders}</td>
                        <td className="px-4 py-3 text-sm font-semibold tabular-nums">{formatMoney(c.spent)}</td>
                        <td className="px-4 py-3 text-sm text-emerald-600 tabular-nums">{formatMoney(c.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Repeat purchase rate & wallet usage */}
          {periodMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Repeat Purchase Rate', value: `${periodMetrics.repeatMetrics.repeatPurchaseRate.toFixed(1)}%` },
                { label: 'Returning Customers', value: periodMetrics.repeatMetrics.returningCustomers.toLocaleString() },
                { label: 'New Customers', value: periodMetrics.repeatMetrics.newCustomers.toLocaleString() },
                { label: 'Wallet Credits (Period)', value: formatMoney(wallet.wallet_credits) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1 tabular-nums">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ─── API & SUPPLIERS ─── */}
      {activeSection === 'api' && (
        <motion.div
          key="api"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: DURATION.fast } }}
          transition={{ duration: DURATION.base, ease: EASE_OUT }}
          className="space-y-6"
        >
          {/* Supplier performance */}
          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Supplier / API Performance ({periodLabel})</h2>
            {!reportLoading && supplierPerf.length ? (
              <div className="space-y-4">
                {supplierPerf.map((s) => (
                  <div key={s.provider} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{s.label}</p>
                      <p className="text-xs text-gray-500">{s.orders} total · {s.successful} successful · {s.failed} failed</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{formatMoney(s.spend)} spend</p>
                      <p className={clsx('text-xs font-medium tabular-nums', s.successRate >= 95 ? 'text-emerald-600' : s.successRate >= 80 ? 'text-amber-600' : 'text-red-600')}>
                        {s.successRate.toFixed(1)}% success rate
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="py-8 text-center text-sm text-gray-400">{reportLoading ? 'Loading…' : 'No supplier data in this period.'}</p>}
          </div>

          {/* Supplier bar chart */}
          {supplierPerf.length > 0 && (
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 font-semibold">Supplier Spend vs Revenue ({periodLabel})</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={supplierPerf}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spend" fill="#f59e0b" name="COGS Spend" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Failure reasons */}
          {periodMetrics && periodMetrics.failureReasons.length > 0 && (
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 font-semibold">Top API Failure Reasons ({periodLabel})</h2>
              <div className="space-y-2">
                {periodMetrics.failureReasons.map((f) => (
                  <div key={f.reason} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-red-100 bg-red-50">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 line-clamp-2" title={f.reason}>{f.reason}</p>
                      <p className="text-xs text-gray-500">{f.providers.join(', ')}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-red-600">{f.count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refund reasons */}
          {periodMetrics && periodMetrics.refundReasons.length > 0 && (
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 font-semibold">Refund Reasons ({periodLabel})</h2>
              <div className="space-y-2">
                {periodMetrics.refundReasons.map((r) => (
                  <div key={r.reason} className="flex items-center justify-between p-3 rounded-lg border border-purple-100 bg-purple-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.reason}</p>
                      <p className="text-xs text-gray-500">{r.count} refunds</p>
                    </div>
                    <p className="text-sm font-semibold text-purple-700 tabular-nums">{formatMoney(r.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Processing time */}
          {periodMetrics && periodMetrics.processingTime.samples > 0 && (
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 font-semibold">Order Processing Time ({periodLabel})</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-500">Average</p>
                  <p className="text-lg font-bold">
                    {periodMetrics.processingTime.averageMinutes < 60
                      ? `${Math.round(periodMetrics.processingTime.averageMinutes)}m`
                      : `${(periodMetrics.processingTime.averageMinutes / 60).toFixed(1)}h`}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-500">Median</p>
                  <p className="text-lg font-bold">
                    {periodMetrics.processingTime.medianMinutes < 60
                      ? `${Math.round(periodMetrics.processingTime.medianMinutes)}m`
                      : `${(periodMetrics.processingTime.medianMinutes / 60).toFixed(1)}h`}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-500">Sample size</p>
                  <p className="text-lg font-bold tabular-nums">{periodMetrics.processingTime.samples.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ─── PLATFORM & USER ACTIVITY ─── */}
      {activeSection === 'activity' && (
        <motion.div
          key="activity"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: DURATION.fast } }}
          transition={{ duration: DURATION.base, ease: EASE_OUT }}
          className="space-y-6"
        >
          {reportLoading || !reportData ? (
            <div className="py-12 text-center text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading platform activity…
            </div>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: `Events (${periodLabel})`, value: filteredActivities.length.toLocaleString(), icon: Activity, tone: 'bg-blue-50 text-blue-600' },
                  { label: 'Unique Active Users', value: new Set(filteredActivities.map((a) => a.user_id).filter(Boolean)).size.toLocaleString(), icon: Users, tone: 'bg-purple-50 text-purple-600' },
                  { label: 'Unique IPs', value: new Set(filteredActivities.map((a) => a.ip_address).filter(Boolean)).size.toLocaleString(), icon: Monitor, tone: 'bg-cyan-50 text-cyan-600' },
                  { label: 'Registered Customers', value: reportData.profiles.filter((p) => p.role !== 'admin').length.toLocaleString(), icon: Users, tone: 'bg-emerald-50 text-emerald-600' },
                ].map(({ label, value, icon: Icon, tone }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: staggerDelay(i, 0.04, 0.14), duration: DURATION.base, ease: EASE_OUT }}
                    className="rounded-xl border bg-white p-5 flex items-center gap-3"
                  >
                    <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', tone)}><Icon className="w-5 h-5" /></div>
                    <div><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p></div>
                  </motion.div>
                ))}
              </div>

              {/* Action breakdown */}
              {(() => {
                const actionCounts = Object.entries(
                  filteredActivities.reduce((acc, a) => {
                    const key = a.action.replace(/_/g, ' ');
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                )
                  .map(([action, count]) => ({ action, count }))
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 10);
                return actionCounts.length ? (
                  <div className="rounded-xl border bg-white p-5">
                    <h2 className="mb-4 font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /> Top User Actions ({periodLabel})</h2>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={actionCounts} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="action" type="category" width={130} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="py-12 text-center text-sm text-gray-400">No activity events recorded in this period.</p>;
              })()}

              {/* Recent activity feed */}
              <div className="rounded-xl border bg-white shadow-sm">
                <div className="border-b p-4 flex items-center justify-between">
                  <h2 className="font-semibold flex items-center gap-2"><Monitor className="w-4 h-4 text-emerald-500" /> Recent Web Activity ({periodLabel})</h2>
                  <button onClick={() => navigate('/activity-logs')} className="text-xs text-primary-600 hover:underline">View all →</button>
                </div>
                <div className="divide-y">
                  {filteredActivities.slice(0, 20).map((a) => (
                    <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                      <div className="w-1.5 h-1.5 mt-2 rounded-full bg-emerald-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium capitalize">{a.action.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {a.description || 'No description'} {a.ip_address ? `· ${a.ip_address}` : ''}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 shrink-0">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                  {!filteredActivities.length && <p className="p-6 text-sm text-gray-400 text-center">No recent activity in this period.</p>}
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default Analytics;
