import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, Ban, BarChart3, CheckCircle, Clock, DollarSign,
  Package, RefreshCw, RotateCcw, Scale, ShoppingCart, TrendingUp,
  Wallet, XCircle,
} from 'lucide-react';
import {
  Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import clsx from 'clsx';
import { AdminAnalytics, AnalyticsPeriod, getAdminAnalytics } from '../../services/adminAnalyticsService';

const statusColors: Record<string, string> = {
  completed: '#10b981',
  pending: '#f59e0b',
  processing: '#3b82f6',
  failed: '#ef4444',
  cancelled: '#64748b',
  refunded: '#8b5cf6',
  on_hold: '#f97316',
};

const money = (value: number) => `INR ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

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
        <p className="truncate text-lg font-bold text-gray-900">{value}</p>
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
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [report, setReport] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletOnly, setWalletOnly] = useState(false);

  const refresh = useCallback(async () => {
    if (period === 'custom' && (!customStart || !customEnd)) return;
    setLoading(true);
    setError(null);
    try {
      setReport(await getAdminAnalytics(period, customStart, customEnd, walletOnly ? 'wallet' : null));
    } catch (err) {
      setError((err as Error).message || 'Failed to load sales data');
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd, walletOnly]);

  useEffect(() => { void refresh(); }, [refresh]);

  if (loading && !report) {
    return (
      <div className="py-24 text-center text-gray-400">
        <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3" />
        Loading sales data...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700">
        <AlertCircle className="w-5 h-5 mb-2" />
        {error}
        <button onClick={() => void refresh()} className="btn btn-outline btn-sm ml-4">Retry</button>
      </div>
    );
  }

  const { metrics, customers, wallet } = report;
  const completionRate = metrics.total_orders ? (metrics.completed_orders / metrics.total_orders) * 100 : 0;
  const avgOrder = metrics.completed_orders ? metrics.revenue / metrics.completed_orders : 0;
  const profitMargin = metrics.revenue ? (metrics.known_profit / metrics.revenue) * 100 : 0;
  const totalStatus = report.statuses.reduce((sum, s) => sum + s.count, 0);

  const trend = report.trend.map((item) => ({
    ...item,
    label: new Date(item.bucket).toLocaleDateString(undefined, {
      month: 'short',
      day: period === '6m' || period === '1y' || period === 'all' ? undefined : 'numeric',
      year: period === '1y' || period === 'all' ? '2-digit' : undefined,
    }),
  }));

  const topProducts = report.products.slice(0, 6);
  const topProductRevenue = topProducts[0] ? Number(topProducts[0].revenue) : 0;

  const kpis = [
    { label: 'Revenue', value: money(metrics.revenue), icon: DollarSign, tone: 'bg-blue-50 text-blue-600' },
    {
      label: 'Known Gross Profit',
      value: money(metrics.known_profit),
      icon: TrendingUp,
      tone: 'bg-emerald-50 text-emerald-600',
      sub: <p className="text-xs text-gray-400">{profitMargin.toFixed(1)}% margin</p>,
    },
    { label: 'Refunded Value', value: money(metrics.refunds), icon: RotateCcw, tone: 'bg-red-50 text-red-600' },
    {
      label: 'Orders',
      value: metrics.total_orders.toLocaleString(),
      icon: ShoppingCart,
      tone: 'bg-cyan-50 text-cyan-600',
      sub: <p className="text-xs text-gray-400">{completionRate.toFixed(1)}% completed</p>,
    },
    { label: 'Avg Order Value', value: money(avgOrder), icon: BarChart3, tone: 'bg-indigo-50 text-indigo-600' },
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
            <p className="mt-0.5 text-sm text-gray-500">Real sales performance and revenue metrics</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/revenue/profit-loss" className="btn btn-outline btn-sm flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Profit &amp; Loss
          </Link>
          <button
            onClick={() => setWalletOnly((v: boolean) => !v)}
            className={clsx('btn btn-sm flex items-center gap-2', walletOnly ? 'btn-primary' : 'btn-outline')}
          >
            <Wallet className="h-4 w-4" />
            {walletOnly ? 'Wallet Only' : 'Wallet Only: Off'}
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
          <span className="ml-1 text-xs text-gray-400">Internal (admin-account) orders are excluded · see Profit &amp; Loss</span>
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

      {metrics.profit_unknown_orders > 0 && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Profit excludes {metrics.profit_unknown_orders.toLocaleString()} completed historical orders that have no cost snapshot.</span>
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
                  <Tooltip formatter={(value, name) => [name === 'orders' ? Number(value).toLocaleString() : money(Number(value)), String(name)]} />
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
          {report.statuses.length ? (
            <div className="mt-4 space-y-3">
              {report.statuses.map((s) => (
                <div key={s.status}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex min-w-0 items-center gap-2 capitalize text-gray-700">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: statusColors[s.status] || '#94a3b8' }} />
                      <span className="truncate">{s.status.replace(/_/g, ' ')}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-gray-900">{Number(s.count).toLocaleString()}</span>
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
        {report.products.length ? (
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
                {report.products.slice(0, 10).map((product) => {
                  const revenue = Number(product.revenue);
                  const profit = Number(product.profit);
                  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
                  return (
                    <tr key={product.product_id ?? product.name} className="transition-colors hover:bg-gray-50">
                      <td className="max-w-[16rem] px-5 py-3.5">
                        <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{product.units.toLocaleString()}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-sm font-semibold text-gray-900">{money(revenue)}</td>
                      <td className={clsx('whitespace-nowrap px-5 py-3.5 text-sm font-semibold', profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                        {profit >= 0 ? '+' : '-'}{money(Math.abs(profit))}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{margin.toFixed(1)}%</td>
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
                <div key={p.product_id ?? p.name}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-gray-700">{p.name}</span>
                    <span className="shrink-0 font-semibold text-gray-900">{money(Number(p.revenue))}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: `${topProductRevenue ? (Number(p.revenue) / topProductRevenue) * 100 : 0}%` }}
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
                <span className={clsx('font-semibold', row.tone)}>{money(row.value)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Customer wallets hold {money(customers.customer_wallet_balance)} across {customers.total_customers.toLocaleString()} customers.
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
                  <p className="text-base font-bold text-gray-900">{value.toLocaleString()}</p>
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
