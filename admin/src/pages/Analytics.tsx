import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign,
  ShoppingCart, Users, Percent, Crown, Target, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useState as useModalState } from 'react';
import ComingSoonModal from '../components/common/ComingSoonModal';
import clsx from 'clsx';

type Period = '7d' | '30d' | '90d';

const revenueData: Record<Period, Array<{ label: string; revenue: number; orders: number }>> = {
  '7d': [
    { label: 'Mon', revenue: 1820, orders: 47 },
    { label: 'Tue', revenue: 2340, orders: 61 },
    { label: 'Wed', revenue: 1990, orders: 52 },
    { label: 'Thu', revenue: 2780, orders: 73 },
    { label: 'Fri', revenue: 3210, orders: 84 },
    { label: 'Sat', revenue: 3870, orders: 101 },
    { label: 'Sun', revenue: 3540, orders: 92 },
  ],
  '30d': [
    { label: 'W1', revenue: 12400, orders: 324 },
    { label: 'W2', revenue: 15800, orders: 412 },
    { label: 'W3', revenue: 13900, orders: 361 },
    { label: 'W4', revenue: 18200, orders: 476 },
  ],
  '90d': [
    { label: 'Jan', revenue: 42000, orders: 1098 },
    { label: 'Feb', revenue: 38500, orders: 1002 },
    { label: 'Mar', revenue: 51000, orders: 1334 },
  ],
};

const topGames = [
  { name: 'PUBG Mobile UC', revenue: 12840, orders: 334, growth: 18.2, color: '#3b82f6' },
  { name: 'Free Fire Diamonds', revenue: 9210, orders: 241, growth: 12.4, color: '#10b981' },
  { name: 'Mobile Legends', revenue: 8490, orders: 221, growth: 7.8, color: '#f59e0b' },
  { name: 'Genshin Impact', revenue: 7320, orders: 189, growth: -3.2, color: '#8b5cf6' },
  { name: 'Valorant Points', revenue: 5610, orders: 147, growth: 22.1, color: '#ef4444' },
  { name: 'Honkai Star Rail', revenue: 4280, orders: 112, growth: 31.4, color: '#06b6d4' },
];

const gameShareData = topGames.map((g) => ({ name: g.name.split(' ')[0] + ' ' + (g.name.split(' ')[1] || ''), value: g.orders, color: g.color }));

const conversionData = [
  { step: 'Store Visits', users: 18400 },
  { step: 'Game Page', users: 12200 },
  { step: 'Product Select', users: 7800 },
  { step: 'Checkout Start', users: 4100 },
  { step: 'Payment Done', users: 2940 },
];

const StatCard: React.FC<{
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}> = ({ title, value, change, changeType, icon: Icon, accent }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4"
  >
    <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', accent)}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-gray-500 mb-0.5">{title}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
    <div className={clsx('flex items-center gap-1 text-sm font-semibold', changeType === 'increase' ? 'text-emerald-600' : 'text-red-600')}>
      {changeType === 'increase' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      {change}
    </div>
  </motion.div>
);

const Analytics: React.FC = () => {
  const [period, setPeriod] = useState<Period>('7d');
  const [comingSoon, setComingSoon] = useState<{ open: boolean; feature: string }>({ open: false, feature: '' });

  const openComingSoon = (feature: string) => setComingSoon({ open: true, feature });

  const stats = [
    { title: 'Total Revenue', value: 'PKS 60,300', change: '+18.4%', changeType: 'increase' as const, icon: DollarSign, accent: 'bg-blue-50 text-blue-600' },
    { title: 'Total Orders', value: '1,572', change: '+15.3%', changeType: 'increase' as const, icon: ShoppingCart, accent: 'bg-emerald-50 text-emerald-600' },
    { title: 'Active Customers', value: '892', change: '+8.2%', changeType: 'increase' as const, icon: Users, accent: 'bg-purple-50 text-purple-600' },
    { title: 'Conversion Rate', value: '15.97%', change: '-1.2%', changeType: 'decrease' as const, icon: Percent, accent: 'bg-amber-50 text-amber-600' },
  ];

  const data = revenueData[period];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500">Store performance & insights</p>
          </div>
        </div>
        {/* Period Selector */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
          {(['7d', '30d', '90d'] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                period === p ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {p === '7d' ? 'Last 7 Days' : p === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      {/* Revenue & Orders Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Revenue Overview</h3>
            <p className="text-xs text-gray-500 mt-0.5">Revenue and order count trend</p>
          </div>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis yAxisId="rev" tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => `PKS${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip formatter={(value, name) => [name === 'revenue' ? `PKS ${value}` : value, name === 'revenue' ? 'Revenue' : 'Orders']} />
              <Legend />
              <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
              <Line yAxisId="ord" type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={false} name="Orders" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Top Games + Sales Share */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Games */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900">Top Selling Games</h3>
          </div>
          <div className="p-5 space-y-3">
            {topGames.map((g, i) => (
              <div key={g.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{g.name}</p>
                    <span className={clsx('text-xs font-semibold', g.growth >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                      {g.growth >= 0 ? '+' : ''}{g.growth}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(g.orders / topGames[0].orders) * 100}%`, background: g.color }} />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">{g.orders} orders</span>
                    <span className="text-xs font-semibold text-gray-700">PKS {g.revenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Game Sales Share Pie */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Sales Distribution by Game</h3>
            <p className="text-xs text-gray-500 mt-0.5">Share of total orders</p>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={gameShareData} cx="50%" cy="50%" outerRadius={90} innerRadius={45} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {gameShareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} orders`, 'Orders']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {gameShareData.map((g) => (
                <div key={g.name} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: g.color }} />
                  <span className="truncate">{g.name}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Conversion Funnel */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Conversion Funnel</h3>
            <p className="text-xs text-gray-500">User journey from visit to payment</p>
          </div>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={conversionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)} />
              <YAxis dataKey="step" type="category" width={120} tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} users`, 'Users']} />
              <Bar dataKey="users" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                {conversionData.map((_, i) => (
                  <Cell key={i} fill={`hsl(${217 - i * 12}, ${90 - i * 8}%, ${55 + i * 5}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-6 mt-3 flex-wrap">
            <div className="text-center">
              <p className="text-xs text-gray-500">Overall Conversion</p>
              <p className="text-lg font-bold text-primary-700">15.97%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Avg. Order Value</p>
              <p className="text-lg font-bold text-gray-900">PKS 38.35</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Cart Abandon Rate</p>
              <p className="text-lg font-bold text-red-600">28.3%</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Product Performance Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Product Performance</h3>
          <p className="text-xs text-gray-500 mt-0.5">Revenue breakdown by game and package</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Game', 'Orders', 'Revenue', 'Avg. Value', 'Growth', 'Share'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topGames.map((g, i) => {
                const totalRev = topGames.reduce((s, x) => s + x.revenue, 0);
                return (
                  <tr key={g.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: g.color }} />
                        <span className="text-sm font-medium text-gray-900">{g.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{g.orders.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">PKS {g.revenue.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">PKS {(g.revenue / g.orders).toFixed(2)}</td>
                    <td className="px-5 py-3.5">
                      <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold', g.growth >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                        {g.growth >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {Math.abs(g.growth)}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(g.revenue / totalRev) * 100}%`, background: g.color }} />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{((g.revenue / totalRev) * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Advanced Analytics Placeholders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Customer Cohort Analysis', desc: 'Retention rates by signup month', icon: Users },
          { title: 'Geographic Revenue Map', desc: 'Revenue breakdown by country/region', icon: Target },
          { title: 'Predictive Revenue', desc: 'AI-powered revenue forecasting', icon: Zap },
        ].map((p) => {
          const Icon = p.icon;
          return (
            <motion.button
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => openComingSoon(p.title)}
              className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-6 text-left hover:border-primary-300 hover:bg-primary-50/30 transition-all group"
            >
              <Icon className="w-8 h-8 text-gray-300 group-hover:text-primary-400 transition-colors mb-3" />
              <p className="font-semibold text-gray-700 mb-1">{p.title}</p>
              <p className="text-xs text-gray-400">{p.desc}</p>
              <span className="inline-block mt-3 text-xs font-medium text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full">Coming Soon</span>
            </motion.button>
          );
        })}
      </div>

      <ComingSoonModal
        isOpen={comingSoon.open}
        onClose={() => setComingSoon({ open: false, feature: '' })}
        featureName={comingSoon.feature}
        description="This advanced analytics feature is being developed to give you deeper insights into your store's performance."
      />
    </div>
  );
};

export default Analytics;
