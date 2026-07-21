import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, Ban, BarChart3, CheckCircle, CircleDollarSign, Clock, DollarSign,
  Package, Percent, RefreshCw, RotateCcw, ShoppingCart, TrendingDown,
  TrendingUp, Users, Wallet, XCircle,
} from 'lucide-react';
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import clsx from 'clsx';
import { AdminAnalytics, AnalyticsPeriod, getAdminAnalytics } from '../../services/adminAnalyticsService';

const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#06b6d4'];
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
  const statusData = report.statuses.map((s) => ({ ...s, color: statusColors[s.status] || '#94a3b8' }));

  const salesMetrics = [
    { title: 'Revenue', value: money(metrics.revenue), icon: DollarSign, tone: 'bg-blue-50 text-blue-600' },
    { title: 'Orders', value: metrics.total_orders.toLocaleString(), icon: ShoppingCart, tone: 'bg-cyan-50 text-cyan-600' },
    { title: 'New Customers', value: customers.new_customers.toLocaleString(), icon: Users, tone: 'bg-purple-50 text-purple-600' },
    { title: 'Units Sold', value: metrics.units_sold.toLocaleString(), icon: Package, tone: 'bg-emerald-50 text-emerald-600' },
  ];

  const trend = report.trend.map((item) => ({
    ...item,
    label: new Date(item.bucket).toLocaleDateString(undefined, {
      month: 'short',
      day: period === '6m' || period === '1y' || period === 'all' ? undefined : 'numeric',
      year: period === '1y' || period === 'all' ? '2-digit' : undefined,
    }),
  }));

  const productPieData = report.products.slice(0, 6).map((p, i) => ({
    name: p.name,
    value: Number(p.revenue),
    color: colors[i % colors.length],
  }));

  const additionalMetrics = [
    { label: 'Known Gross Profit', value: money(metrics.known_profit), icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Known Cost', value: money(metrics.known_cost), icon: CircleDollarSign, tone: 'bg-violet-50 text-violet-600' },
    { label: 'Refunded Value', value: money(metrics.refunds), icon: RotateCcw, tone: 'bg-red-50 text-red-600' },
    { label: 'Avg Order Value', value: money(avgOrder), icon: DollarSign, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Completion Rate', value: `${completionRate.toFixed(1)}%`, icon: CheckCircle, tone: 'bg-green-50 text-green-600' },
    { label: 'Profit Margin', value: `${profitMargin.toFixed(1)}%`, icon: Percent, tone: 'bg-indigo-50 text-indigo-600' },
    { label: 'Wallet Spend', value: money(wallet.wallet_spend), icon: Wallet, tone: 'bg-amber-50 text-amber-600' },
  ];

  const orderMetrics = [
    { label: 'Failed Orders', value: metrics.failed_orders.toLocaleString(), icon: XCircle, tone: 'bg-red-50 text-red-600' },
    { label: 'Pending Orders', value: metrics.pending_orders.toLocaleString(), icon: Clock, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Processing Orders', value: metrics.processing_orders.toLocaleString(), icon: RefreshCw, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Cancelled Orders', value: metrics.cancelled_orders.toLocaleString(), icon: Ban, tone: 'bg-gray-100 text-gray-600' },
    { label: 'Refunded Orders', value: metrics.refunded_orders.toLocaleString(), icon: RotateCcw, tone: 'bg-purple-50 text-purple-600' },
    { label: 'Wallet Refunds', value: money(wallet.wallet_refunds), icon: TrendingDown, tone: 'bg-rose-50 text-rose-600' },
    { label: 'Wallet Credits', value: money(wallet.wallet_credits), icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-600' },
  ];

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
              <h1 className="text-2xl font-bold">Sales Overview</h1>
              <p className="text-sm text-gray-500">Real sales performance and revenue metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <button onClick={() => void refresh()} className="btn btn-outline btn-sm">
              <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {periods.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={clsx('rounded-lg px-3 py-1.5 text-sm', period === value ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
            >
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
      </div>

      {/* Sales Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {salesMetrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{metric.value}</p>
              </div>
              <div className={clsx('w-12 h-12 rounded-lg flex items-center justify-center', metric.tone)}>
                <metric.icon className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Profit warning */}
      {metrics.profit_unknown_orders > 0 && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Profit excludes {metrics.profit_unknown_orders.toLocaleString()} completed historical orders that have no cost snapshot.</span>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue, Profit & Orders Trend</h3>
          {trend.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                <Tooltip formatter={(value, name) => [name === 'orders' ? Number(value).toLocaleString() : money(Number(value)), String(name)]} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#3b82f6" fill="#dbeafe" name="Revenue" />
                <Area yAxisId="left" type="monotone" dataKey="profit" stroke="#10b981" fill="#d1fae5" name="Known Profit" />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Orders" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-20 text-center text-sm text-gray-400">No data in this period.</p>
          )}
        </div>

        {/* Revenue by Product */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Product</h3>
          {productPieData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={productPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {productPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-20 text-center text-sm text-gray-400">No product sales in this period.</p>
          )}
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders by Status</h3>
        {statusData.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={55}
                  outerRadius={95}
                  label={(entry) => `${entry.name}: ${Number(entry.value).toLocaleString()}`}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {statusData.map((s) => (
                <div key={s.status} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 capitalize">{s.status.replace(/_/g, ' ')}</p>
                  <p className="text-lg font-bold" style={{ color: s.color }}>{Number(s.count).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-20 text-center text-sm text-gray-400">No order status data.</p>
        )}
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {additionalMetrics.map(({ label, value, icon: Icon, tone }, index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tone)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="truncate text-xl font-bold text-gray-900">{value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Order Counts & Wallet Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {orderMetrics.map(({ label, value, icon: Icon, tone }, index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tone)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="truncate text-xl font-bold text-gray-900">{value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Product Performance Bar Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary-600" /> Product Performance (Units Sold)</h3>
        {report.products.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report.products.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value, name) => [name === 'revenue' ? money(Number(value)) : Number(value).toLocaleString(), String(name)]} />
              <Bar dataKey="units" fill="#10b981" radius={[0, 4, 4, 0]} name="Units" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-20 text-center text-sm text-gray-400">No completed product sales.</p>
        )}
      </div>

      {/* Top Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Package className="h-4 w-4 text-primary-600" /> Top Selling Products</h3>
        </div>
        <div className="p-6">
          {report.products.length ? (
            <div className="space-y-4">
              {report.products.slice(0, 10).map((product) => (
                <div key={product.product_id ?? product.name} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.units} units sold</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-lg font-semibold text-gray-900">{money(product.revenue)}</span>
                    {product.profit > 0 && (
                      <span className="text-sm font-medium text-emerald-600">+{money(product.profit)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">No product sales in this period.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesOverview;
