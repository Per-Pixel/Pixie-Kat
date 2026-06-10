import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, BarChart3, DollarSign, Percent, RefreshCw,
  ShoppingCart, TrendingUp, Users,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useAdminReport } from '../hooks/useAdminReport';
import clsx from 'clsx';

type Period = 7 | 30 | 90;
const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
const money = (value: number, currency = 'PKS') => `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const Analytics: React.FC = () => {
  const [period, setPeriod] = useState<Period>(30);
  const { data, loading, error, refresh } = useAdminReport();

  const report = useMemo(() => {
    if (!data) return null;
    const start = new Date();
    start.setDate(start.getDate() - (period - 1));
    start.setHours(0, 0, 0, 0);
    const orders = data.orders.filter((order) => new Date(order.created_at) >= start);
    const completed = orders.filter((order) => order.status === 'completed');
    const revenue = completed.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const customers = new Set(orders.map((order) => order.user_id)).size;
    const conversion = data.profiles.length ? (customers / data.profiles.length) * 100 : 0;

    const buckets = new Map<string, { label: string; revenue: number; orders: number }>();
    orders.forEach((order) => {
      const created = new Date(order.created_at);
      const key = period === 7
        ? created.toISOString().slice(0, 10)
        : `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      const label = period === 7
        ? created.toLocaleDateString('en-US', { weekday: 'short' })
        : created.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const item = buckets.get(key) ?? { label, revenue: 0, orders: 0 };
      item.orders += 1;
      if (order.status === 'completed') item.revenue += Number(order.total_amount || 0);
      buckets.set(key, item);
    });

    const productMap = new Map<string, { name: string; revenue: number; orders: number }>();
    completed.forEach((order) => {
      const current = productMap.get(order.product_name) ?? { name: order.product_name, revenue: 0, orders: 0 };
      current.revenue += Number(order.total_amount || 0);
      current.orders += order.quantity || 1;
      productMap.set(order.product_name, current);
    });
    const products = [...productMap.values()].sort((a, b) => b.revenue - a.revenue);

    const paymentMap = new Map<string, number>();
    completed.forEach((order) => {
      const method = order.payment_method || 'Unspecified';
      paymentMap.set(method, (paymentMap.get(method) ?? 0) + 1);
    });

    return {
      orders,
      revenue,
      customers,
      conversion,
      averageOrder: completed.length ? revenue / completed.length : 0,
      trend: [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value),
      products,
      payments: [...paymentMap].map(([name, value], index) => ({ name, value, color: colors[index % colors.length] })),
    };
  }, [data, period]);

  if (loading && !report) return <div className="py-24 text-center text-gray-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3" />Loading analytics...</div>;
  if (error || !report) return <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700"><AlertCircle className="w-5 h-5 mb-2" />{error}<button onClick={refresh} className="btn btn-outline btn-sm ml-4">Retry</button></div>;

  const stats = [
    { label: 'Revenue', value: money(report.revenue), icon: DollarSign, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Orders', value: report.orders.length.toLocaleString(), icon: ShoppingCart, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Ordering Customers', value: report.customers.toLocaleString(), icon: Users, tone: 'bg-purple-50 text-purple-600' },
    { label: 'Customer Conversion', value: `${report.conversion.toFixed(1)}%`, icon: Percent, tone: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3"><div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center"><BarChart3 className="w-5 h-5 text-primary-600" /></div><div><h1 className="text-2xl font-bold">Analytics</h1><p className="text-sm text-gray-500">Live order and customer performance</p></div></div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-xl p-1">{([7, 30, 90] as Period[]).map((value) => <button key={value} onClick={() => setPeriod(value)} className={clsx('px-3 py-1.5 rounded-lg text-sm', period === value ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500')}>{value} days</button>)}</div>
          <button onClick={refresh} className="btn btn-outline btn-sm"><RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{stats.map(({ label, value, icon: Icon, tone }) => <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border rounded-xl p-5 flex items-center gap-4"><div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center', tone)}><Icon className="w-5 h-5" /></div><div><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-bold">{value}</p></div></motion.div>)}</div>

      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold mb-4">Revenue and Orders</h2>
        {report.trend.length ? <ResponsiveContainer width="100%" height={300}><AreaChart data={report.trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(value, name) => [name === 'revenue' ? money(Number(value)) : value, name]} /><Area dataKey="revenue" stroke="#3b82f6" fill="#dbeafe" /><Area dataKey="orders" stroke="#10b981" fill="#d1fae5" /></AreaChart></ResponsiveContainer> : <p className="py-20 text-center text-sm text-gray-400">No orders in this period.</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Product Performance</h2>
          {report.products.length ? <ResponsiveContainer width="100%" height={280}><BarChart data={report.products.slice(0, 8)} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => money(Number(value))} /><Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer> : <p className="py-20 text-center text-sm text-gray-400">No completed product sales yet.</p>}
        </div>
        <div className="bg-white border rounded-xl p-5">
          <h2 className="font-semibold mb-1">Payment Methods</h2><p className="text-xs text-gray-500 mb-4">Completed orders by payment method</p>
          {report.payments.length ? <ResponsiveContainer width="100%" height={280}><PieChart><Pie data={report.payments} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} label>{report.payments.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <p className="py-20 text-center text-sm text-gray-400">No payment data yet.</p>}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5 flex flex-wrap gap-8">
        <div><p className="text-xs text-gray-500">Average Order Value</p><p className="text-xl font-bold">{money(report.averageOrder)}</p></div>
        <div><p className="text-xs text-gray-500">Completed Orders</p><p className="text-xl font-bold">{report.orders.filter((order) => order.status === 'completed').length}</p></div>
        <div><p className="text-xs text-gray-500">Completion Rate</p><p className="text-xl font-bold flex items-center gap-1"><TrendingUp className="w-5 h-5 text-emerald-600" />{report.orders.length ? ((report.orders.filter((order) => order.status === 'completed').length / report.orders.length) * 100).toFixed(1) : '0.0'}%</p></div>
      </div>
    </div>
  );
};

export default Analytics;
