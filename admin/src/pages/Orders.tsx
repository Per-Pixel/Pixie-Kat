import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, Eye, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled' | 'on_hold';

interface OrderRow {
  id: string;
  user_id: string;
  product_name: string;
  quantity: number;
  total_amount: number | string;
  currency: string;
  status: OrderStatus;
  payment_method?: string | null;
  payment_id?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

const statusStyles: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-gray-100 text-gray-700',
  on_hold: 'bg-orange-100 text-orange-800',
};

const statusOptions: Array<'all' | OrderStatus> = [
  'all',
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'cancelled',
  'on_hold',
];

function formatMoney(value: number | string, currency: string) {
  return `${currency} ${Number(value || 0).toFixed(2)}`;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function downloadCsv(orders: OrderRow[]) {
  const rows = [
    ['Order ID', 'Customer', 'Email', 'Product', 'Quantity', 'Amount', 'Currency', 'Status', 'Payment Method', 'Date'],
    ...orders.map((order) => [
      order.id,
      order.profiles?.name ?? 'Unknown customer',
      order.profiles?.email ?? '',
      order.product_name,
      String(order.quantity),
      String(order.total_amount),
      order.currency,
      order.status,
      order.payment_method ?? '',
      order.created_at,
    ]),
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | OrderStatus>('all');

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    const { data, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        product_name,
        quantity,
        total_amount,
        currency,
        status,
        payment_method,
        payment_id,
        created_at,
        updated_at,
        profiles:user_id (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (ordersError) {
      setError(ordersError.message);
      setOrders([]);
    } else {
      setOrders((data as OrderRow[]) ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = status === 'all' || order.status === status;
      if (!matchesStatus) return false;
      if (!term) return true;

      return [
        order.id,
        order.product_name,
        order.payment_id ?? '',
        order.profiles?.name ?? '',
        order.profiles?.email ?? '',
      ].some((value) => value.toLowerCase().includes(term));
    });
  }, [orders, search, status]);

  const stats = useMemo(() => {
    const completed = orders.filter((order) => order.status === 'completed');
    return {
      total: orders.length,
      pending: orders.filter((order) => order.status === 'pending').length,
      processing: orders.filter((order) => order.status === 'processing').length,
      revenue: completed.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 mt-1">Track live customer orders from Supabase</p>
        </div>
        <div className="mt-4 flex gap-2 sm:mt-0">
          <button onClick={fetchOrders} className="btn btn-outline btn-md" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={() => downloadCsv(filteredOrders)} className="btn btn-outline btn-md" disabled={!filteredOrders.length}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Total Orders</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Pending</p>
          <p className="mt-1 text-xl font-bold text-yellow-700">{stats.pending}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Processing</p>
          <p className="mt-1 text-xl font-bold text-blue-700">{stats.processing}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500">Completed Revenue</p>
          <p className="mt-1 text-xl font-bold text-green-700">PKS {stats.revenue.toFixed(2)}</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search orders, customers, email, payment ID..."
                className="input pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as 'all' | OrderStatus)}
              className="input min-w-40 capitalize"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      >
        {error ? (
          <div className="flex items-center gap-3 p-6 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        ) : loading ? (
          <div className="p-10 text-center text-sm text-gray-400">
            <RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin" />
            Loading orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/users/${order.user_id}`)}
                        className="text-left"
                      >
                        <p className="text-sm font-medium text-primary-700 hover:text-primary-900">
                          {order.profiles?.name ?? 'Unknown customer'}
                        </p>
                        <p className="text-xs text-gray-400">{order.profiles?.email ?? order.user_id}</p>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.product_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatMoney(order.total_amount, order.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(order.created_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => navigate(`/users/${order.user_id}`)}
                        className="text-primary-600 hover:text-primary-900"
                        title="View customer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Orders;
