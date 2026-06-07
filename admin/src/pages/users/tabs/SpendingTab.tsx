import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, ShoppingBag, DollarSign, Award,
  BarChart3, Calendar, RefreshCw,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import clsx from 'clsx';
import type { UserDetailData } from '../useUserDetail';

interface Props { data: UserDetailData; refetch: () => void; }

interface OrderRecord {
  id: string;
  product_name: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMoney(amount: number, currency = 'PKS') {
  return `${currency} ${amount.toFixed(2)}`;
}

export default function SpendingTab({ data }: Props) {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const { data: rows } = await supabase
        .from('orders')
        .select('id, product_name, total_amount, currency, status, created_at')
        .eq('user_id', data.profile.id)
        .order('created_at', { ascending: false })
        .limit(100);
      setOrders((rows as OrderRecord[]) ?? []);
      setLoading(false);
    };
    fetchOrders();
  }, [data.profile.id]);

  // Compute analytics
  const completed = orders.filter((o) => o.status === 'completed');
  const failed = orders.filter((o) => o.status === 'failed' || o.status === 'cancelled');
  const totalSpent = completed.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const avgOrder = completed.length > 0 ? totalSpent / completed.length : 0;
  const currency = completed[0]?.currency || 'PKS';

  // Highest spend order
  const topOrder = [...completed].sort((a, b) => Number(b.total_amount) - Number(a.total_amount))[0];

  // Monthly chart data (last 6 months)
  const monthlyData = (() => {
    const map: Record<string, number> = {};
    completed.forEach((o) => {
      const month = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      map[month] = (map[month] || 0) + Number(o.total_amount || 0);
    });
    return Object.entries(map).slice(-6).map(([label, revenue]) => ({ label, revenue }));
  })();

  // Top products
  const productMap: Record<string, number> = {};
  completed.forEach((o) => {
    productMap[o.product_name] = (productMap[o.product_name] || 0) + 1;
  });
  const topProducts = Object.entries(productMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const statCards = [
    {
      label: 'Total Spent',
      value: formatMoney(totalSpent, currency),
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Completed Orders',
      value: `${completed.length} orders`,
      icon: ShoppingBag,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Avg. Order Value',
      value: formatMoney(avgOrder, currency),
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Failed / Cancelled',
      value: `${failed.length} orders`,
      icon: BarChart3,
      color: 'text-red-500',
      bg: 'bg-red-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <RefreshCw className="w-6 h-6 animate-spin mb-2" />
        <p className="text-sm">Loading spending analytics…</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
        <ShoppingBag className="w-10 h-10 mb-3 text-gray-200" />
        <p className="font-medium text-gray-500">No orders found</p>
        <p className="text-sm text-gray-400 mt-1">This customer hasn't placed any orders yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
                <Icon className={clsx('w-5 h-5', s.color)} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-base font-bold text-gray-900">{s.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Top Order Badge */}
      {topOrder && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-0.5">Highest Single Purchase</p>
            <p className="text-sm font-bold text-gray-900">{topOrder.product_name}</p>
            <p className="text-xs text-amber-700">{formatMoney(Number(topOrder.total_amount), topOrder.currency)} — {formatDate(topOrder.created_at)}</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spend Chart */}
        {monthlyData.length > 0 && (
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-600" />
              <h3 className="font-semibold text-sm text-gray-900">Monthly Spend</h3>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => [`${currency} ${Number(value).toFixed(2)}`, 'Spent']} />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#spendGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Top Products */}
        {topProducts.length > 0 && (
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-sm text-gray-900">Favourite Products</h3>
            </div>
            <div className="p-4 space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(p.count / topProducts[0].count) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">{p.count}x</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Recent Orders Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-sm text-gray-900">Order History ({orders.length} orders)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Product', 'Amount', 'Status', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.slice(0, 20).map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium max-w-xs truncate">{o.product_name}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {o.currency} {Number(o.total_amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize', {
                      'bg-green-100 text-green-800': o.status === 'completed',
                      'bg-yellow-100 text-yellow-800': o.status === 'pending',
                      'bg-blue-100 text-blue-800': o.status === 'processing',
                      'bg-red-100 text-red-800': o.status === 'failed',
                      'bg-gray-100 text-gray-700': o.status === 'cancelled',
                      'bg-purple-100 text-purple-800': o.status === 'refunded',
                    })}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
