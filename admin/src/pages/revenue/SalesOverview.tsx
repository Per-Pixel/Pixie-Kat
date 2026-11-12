import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, Ban, BarChart3, CheckCircle, Clock,   DollarSign,
  Download, Package, RefreshCw, RotateCcw, Scale, ShoppingCart, TrendingUp,
  UserCog, Wallet, XCircle,
} from 'lucide-react';
import {
  Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import clsx from 'clsx';
import type { AnalyticsPeriod } from '../../services/adminAnalyticsService';
import { useAdminReport } from '../../hooks/useAdminReport';
import { matchesAdminPeriod, type AdminPeriod } from '../../utils/dateRange';
import {
  computeProductPerformance,
  rollupOrderMetrics,
} from '../../utils/dashboardMetrics';
import { buildRevenueProfitTrend } from '../../utils/trendSeries';
import { useAdminCurrency } from '../../lib/currency';
import { exportToCsv } from '../../utils/dateRange';

const statusColors: Record<string, string> = {
  completed: '#10b981',
  pending: '#f59e0b',
  processing: '#3b82f6',
  failed: '#ef4444',
  cancelled: '#64748b',
  refunded: '#8b5cf6',
  on_hold: '#f97316',
};

const periods: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: 'today', label: 'Today' }, { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' }, { value: '6m', label: '6 months' },
  { value: '1y', label: '1 year' }, { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
];

function KpiCard({ label, value, sub, icon: Icon, tone }: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="truncate text-lg font-bold text-gray-900 tabular-nums">{value}</p>
        {sub}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, hint }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
        <Icon className="h-4 w-4 text-primary-600" />
        {title}
      </h2>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

const SalesOverview: React.FC = () => {
  const { formatMoney } = useAdminCurrency();
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [walletOnly, setWalletOnly] = useState(false);
  const [includeInternal, setIncludeInternal] = useState(true);
  const { data: reportData, loading, error, refresh } = useAdminReport();

  const adminIds = useMemo(
    () => new Set(reportData?.profiles.filter((p) => p.role === 'admin').map((p) => p.id) ?? []),
    [reportData],
  );

  const filteredOrders = useMemo(() => {
    if (!reportData) return [];
    return reportData.orders.filter(
      (o) =>
        (includeInternal || !adminIds.has(o.user_id)) &&
        (!walletOnly || o.payment_method === 'wallet') &&
        matchesAdminPeriod(o.created_at, period as AdminPeriod, customStart, customEnd),
    );
  }, [reportData, adminIds, includeInternal, walletOnly, period, customStart, customEnd]);

  const metrics = useMemo(() => {
    if (!reportData) return null;
    return rollupOrderMetrics(filteredOrders, reportData.products);
  }, [reportData, filteredOrders]);

  const productRows = useMemo(() => {
    if (!reportData) return [];
    return computeProductPerformance(filteredOrders, reportData.products);
  }, [reportData, filteredOrders]);

  const trend = useMemo(() => {
    if (!reportData) return [];
    return buildRevenueProfitTrend(
      filteredOrders,
      reportData.products,
      period as AdminPeriod,
      customStart,
      customEnd,
    );
  }, [reportData, filteredOrders, period, customStart, customEnd]);

  const statusRows = useMemo(() => {
    const counts = new Map<string, number>();
    filteredOrders.forEach((o) => counts.set(o.status, (counts.get(o.status) ?? 0) + 1));
    return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
  }, [filteredOrders]);

  const walletPeriod = useMemo(() => {
    if (!reportData) return { wallet_spend: 0, wallet_credits: 0, wallet_refunds: 0 };
    let wallet_spend = 0;
    let wallet_credits = 0;
    let wallet_refunds = 0;
    reportData.walletTransactions.forEach((tx) => {
      if (!includeInternal && adminIds.has(tx.user_id)) return;
      if (!matchesAdminPeriod(tx.created_at, period as AdminPeriod, customStart, customEnd)) return;
      const amount = Number(tx.amount || 0);
      if (tx.type === 'purchase') wallet_spend += Math.abs(amount);
      if (tx.type === 'credit') wallet_credits += amount;
      if (tx.type === 'refund') wallet_refunds += amount;
    });
    return { wallet_spend, wallet_credits, wallet_refunds };
  }, [reportData, adminIds, includeInternal, period, customStart, customEnd]);

  const customerSummary = useMemo(() => {
    if (!reportData) return null;
    const rows = reportData.profiles.filter(
      (p) => p.role !== 'admin' && (includeInternal || !adminIds.has(p.id)),
    );
    const newCustomers = rows.filter((p) =>
      matchesAdminPeriod(p.created_at, period as AdminPeriod, customStart, customEnd),
    ).length;
    const orderCounts = new Map<string, number>();
    filteredOrders.forEach((o) => orderCounts.set(o.user_id, (orderCounts.get(o.user_id) ?? 0) + 1));
    const returning = Array.from(orderCounts.values()).filter((c) => c > 1).length;
    return {
      total_customers: rows.length,
      new_customers: newCustomers,
      returning,
      customer_wallet_balance: rows.reduce((sum, p) => sum + Number(p.wallet_balance || 0), 0),
    };
  }, [reportData, adminIds, includeInternal, period, customStart, customEnd, filteredOrders]);

  if (loading && !reportData) {
    return (
      <div className="py-24 text-center text-gray-400">
        <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3" />
        Loading sales data...
      </div>
    );
  }

  if (error || !reportData || !metrics || !customerSummary) {
    return (
      <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700">
        <AlertCircle className="w-5 h-5 mb-2" />
        {error ?? 'Could not load order data'}
        <button onClick={() => void refresh()} className="btn btn-outline btn-sm ml-4">Retry</button>
      </div>
    );
  }

  const completionRate = metrics.total_orders ? (metrics.completed_orders / metrics.total_orders) * 100 : 0;
  const avgOrder = metrics.completed_orders ? metrics.revenue / metrics.completed_orders : 0;
  const knownRevenue = metrics.grossProfit + metrics.cogs;
  const profitMargin = knownRevenue > 0 ? (metrics.grossProfit / knownRevenue) * 100 : 0;
  const totalStatus = statusRows.reduce((sum, s) => sum + s.count, 0);

  const wallet = walletPeriod;
  const customers = customerSummary;
  const topProducts = productRows.slice(0, 6);
  const topProductRevenue = topProducts[0]?.revenue ?? 0;

  const handleExport = () => {
    exportToCsv(
      `sales-overview-${period}`,
      ['Product', 'Units', 'Revenue', 'Profit', 'Margin %'],
      productRows.map((p) => [
        p.name,
        p.units,
        p.revenue.toFixed(2),
        p.profit.toFixed(2),
        p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0.0',
      ]),
    );
  };

  const kpis = [
    { label: 'Revenue', value: formatMoney(metrics.revenue), icon: DollarSign, tone: 'bg-blue-50 text-blue-600' },
    {
      label: 'Known Gross Profit',
      value: formatMoney(metrics.grossProfit),
      icon: TrendingUp,
      tone: 'bg-emerald-50 text-emerald-600',
      sub: <p className="text-xs text-gray-400">{profitMargin.toFixed(1)}% margin</p>,
    },
    { label: 'Refunded Value', value: formatMoney(metrics.refunds), icon: RotateCcw, tone: 'bg-red-50 text-red-600' },
    {
      label: 'Orders',
      value: metrics.total_orders.toLocaleString(),
      icon: ShoppingCart,
      tone: 'bg-cyan-50 text-cyan-600',
      sub: <p className="text-xs text-gray-400">{completionRate.toFixed(1)}% completed</p>,
    },
    { label: 'Avg Order Value', value: formatMoney(avgOrder), icon: BarChart3, tone: 'bg-indigo-50 text-indigo-600' },
    { label: 'Units Sold', value: metrics.units_sold.toLocaleString(), icon: Package, tone: 'bg-amber-50 text-amber-600' },
  ];

  const attention = [
    { label: 'Pending', value: metrics.pending_orders, icon: Clock, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Processing', value: metrics.processing_orders, icon: RefreshCw, tone: 'text-blue-600 bg-blue-50' },
    { label: 'Failed', value: metrics.failed_orders, icon: XCircle, tone: 'text-red-600 bg-red-50' },
    { label: 'Cancelled', value: metrics.cancelled_orders, icon: Ban, tone: 'text-gray-600 bg-gray-100' },
    { label: 'Refunded', value: metrics.refunded_orders, icon: RotateCcw, tone: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <BarChart3 className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Sales Overview</h1>
            <p className="mt-0.5 text-sm text-gray-500">Same completed-sale revenue as Revenue → Orders</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/revenue/profit-loss" className="btn btn-outline btn-sm flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Profit &amp; Loss
          </Link>
          <button
            onClick={() => setIncludeInternal((v) => !v)}
            className={clsx('btn btn-sm flex items-center gap-2', includeInternal ? 'btn-primary' : 'btn-outline')}
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
          <button onClick={handleExport} disabled={!productRows.length} className="btn btn-outline btn-sm flex items-center gap-1.5">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button onClick={() => void refresh()} className="btn btn-outline btn-sm">
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {periods.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={clsx('rounded-lg px-3 py-1.5 text-sm', period === value ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
            >
              {label}
            </button>
          ))}
          <span className="ml-1 text-xs text-gray-400">Match period + Internal with Orders for the same completed revenue</span>
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
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      {metrics.profitUnknownOrders > 0 && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Profit excludes {metrics.profitUnknownOrders.toLocaleString()} completed historical orders that have no cost snapshot.</span>
        </div>
      )}

      {/* Trend + status breakdown */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
          <SectionHeader icon={TrendingUp} title="Revenue, Profit & Orders Trend" hint={periods.find((p) => p.value === period)?.label} />
          <div className="mt-4">
            {trend.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={64} />
                  <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                  <Tooltip formatter={(value, name) => [name === 'orders' ? Number(value).toLocaleString() : formatMoney(Number(value)), String(name)]} />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#dbeafe" name="Revenue" />
                  <Area yAxisId="left" type="monotone" dataKey="profit" stroke="#10b981" fill="#d1fae5" name="Known Profit" />
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Orders" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-20 text-center text-sm text-gray-400">No data in this period.</p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Revenue</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Known Profit</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" /> Orders</span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader icon={CheckCircle} title="Orders by Status" hint={`${totalStatus.toLocaleString()} total`} />
          {statusRows.length ? (
            <div className="mt-4 space-y-3">
              {statusRows.map((s) => (
                <div key={s.status}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex min-w-0 items-center gap-2 capitalize text-gray-700">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: statusColors[s.status] || '#94a3b8' }} />
                      <span className="truncate">{s.status.replace(/_/g, ' ')}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-gray-900 tabular-nums">{Number(s.count).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${totalStatus ? (s.count / totalStatus) * 100 : 0}%`, background: statusColors[s.status] || '#94a3b8' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-gray-400">No order status data.</p>
          )}
        </div>
      </div>

      {/* Product performance table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <SectionHeader icon={Package} title="Product Performance" hint="Completed orders in period" />
        </div>
        {productRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50">
                <tr>
                  {['Product', 'Units', 'Revenue', 'Profit', 'Margin'].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productRows.slice(0, 10).map((product) => {
                  const margin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
                  return (
                    <tr key={product.id} className="transition-colors hover:bg-gray-50">
                      <td className="max-w-[16rem] px-5 py-3.5">
                        <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 tabular-nums">{product.units.toLocaleString()}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-sm font-semibold text-gray-900 tabular-nums">{formatMoney(product.revenue)}</td>
                      <td className={clsx('whitespace-nowrap px-5 py-3.5 text-sm font-semibold tabular-nums', product.profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                        {product.profit >= 0 ? '+' : '-'}{formatMoney(Math.abs(product.profit))}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 tabular-nums">{margin.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-12 text-center text-sm text-gray-400">No completed product sales in this period.</p>
        )}
      </div>

      {/* Revenue mix + wallet + attention */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader icon={BarChart3} title="Revenue Share" hint="Top products" />
          {topProducts.length ? (
            <div className="mt-4 space-y-3">
              {topProducts.map((p) => (
                <div key={p.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-gray-700">{p.name}</span>
                    <span className="shrink-0 font-semibold text-gray-900 tabular-nums">{formatMoney(p.revenue)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: `${topProductRevenue ? (p.revenue / topProductRevenue) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-gray-400">No product sales in this period.</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader icon={Wallet} title="Wallet Activity" />
          <div className="mt-4 space-y-1">
            {[
              { label: 'Wallet spend', value: wallet.wallet_spend, tone: 'text-amber-600' },
              { label: 'Wallet refunds', value: wallet.wallet_refunds, tone: 'text-rose-600' },
              { label: 'Wallet credits', value: wallet.wallet_credits, tone: 'text-emerald-600' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between border-b border-gray-50 py-2.5 text-sm last:border-0">
                <span className="text-gray-600">{row.label}</span>
                <span className={clsx('font-semibold tabular-nums', row.tone)}>{formatMoney(row.value)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Customer wallets hold {formatMoney(customers.customer_wallet_balance)} across {customers.total_customers.toLocaleString()} customers.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <SectionHeader icon={AlertCircle} title="Needs Attention" />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            {attention.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs text-gray-500">{label}</p>
                  <p className="text-base font-bold text-gray-900 tabular-nums">{value.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            {customers.new_customers.toLocaleString()} new · {customers.returning.toLocaleString()} returning customers in period · {metrics.ordering_customers.toLocaleString()} ordered
          </p>
        </div>
      </div>
    </div>
  );
};

export default SalesOverview;
