import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, Download, Eye, RefreshCw, AlertCircle,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import OrderDrawer from '../components/orders/OrderDrawer';
import clsx from 'clsx';

type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled' | 'on_hold';
type SortField = 'created_at' | 'total_amount' | 'status' | 'product_name';
type SortDir = 'asc' | 'desc';

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
  profiles?: { id: string; name: string; email: string } | null;
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
  'all', 'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled', 'on_hold',
];

const PAGE_SIZE = 20;

function formatMoney(value: number | string, currency: string) {
  return `${currency} ${Number(value || 0).toFixed(2)}`;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function downloadCsv(orders: OrderRow[]) {
  const rows = [
    ['Order ID', 'Customer', 'Email', 'Product', 'Quantity', 'Amount', 'Currency', 'Status', 'Payment Method', 'Date'],
    ...orders.map((o) => [
      o.id, o.profiles?.name ?? 'Unknown', o.profiles?.email ?? '',
      o.product_name, String(o.quantity), String(o.total_amount),
      o.currency, o.status, o.payment_method ?? '', o.created_at,
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
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
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    const { data, error: ordersError } = await supabase
      .from('orders')
      .select(`id, user_id, product_name, quantity, total_amount, currency, status, payment_method, payment_id, created_at, updated_at, profiles:user_id (id, name, email)`)
      .order('created_at', { ascending: false })
      .limit(500);
    if (ordersError) { setError(ordersError.message); setOrders([]); }
    else { setOrders((data as OrderRow[]) ?? []); }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = orders.filter((o) => {
      if (status !== 'all' && o.status !== status) return false;
      if (!term) return true;
      return [o.id, o.product_name, o.payment_id ?? '', o.profiles?.name ?? '', o.profiles?.email ?? '']
        .some((v) => v.toLowerCase().includes(term));
    });
    list = [...list].sort((a, b) => {
      let av: any = a[sortField], bv: any = b[sortField];
      if (sortField === 'total_amount') { av = Number(av); bv = Number(bv); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [orders, search, status, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    processing: orders.filter((o) => o.status === 'processing').length,
    revenue: orders.filter((o) => o.status === 'completed').reduce((s, o) => s + Number(o.total_amount || 0), 0),
  }), [orders]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-3.5 h-3.5 text-gray-300 ml-1" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-primary-600 ml-1" />
      : <ChevronDown className="w-3.5 h-3.5 text-primary-600 ml-1" />;
  };

  const openDrawer = (order: OrderRow) => { setSelectedOrder(order); setDrawerOpen(true); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-gray-500 mt-1 text-sm">Track and manage all customer orders</p>
        </div>
        <div className="mt-4 flex gap-2 sm:mt-0">
          <button onClick={fetchOrders} className="btn btn-outline btn-md" disabled={loading}>
            <RefreshCw className={clsx('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
          </button>
          <button onClick={() => downloadCsv(filtered)} className="btn btn-outline btn-md" disabled={!filtered.length}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Orders', value: stats.total, color: 'text-gray-900' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-700' },
          { label: 'Processing', value: stats.processing, color: 'text-blue-700' },
          { label: 'Completed Revenue', value: `PKS ${stats.revenue.toFixed(2)}`, color: 'text-green-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500">{s.label}</p>
            <p className={clsx('mt-1.5 text-xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search orders, customers, email, payment ID..."
              className="input pl-10 w-full" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}
              className="input min-w-40 capitalize">
              {statusOptions.map((o) => (
                <option key={o} value={o}>{o.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {error ? (
          <div className="flex items-center gap-3 p-6 text-red-700">
            <AlertCircle className="w-5 h-5" /><p className="text-sm">{error}</p>
          </div>
        ) : loading ? (
          <div className="p-12 text-center text-gray-400">
            <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />
            <p className="text-sm">Loading orders...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-sm">No orders found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[
                      { label: 'Order ID', field: null },
                      { label: 'Customer', field: null },
                      { label: 'Product', field: 'product_name' as SortField },
                      { label: 'Qty', field: null },
                      { label: 'Amount', field: 'total_amount' as SortField },
                      { label: 'Status', field: 'status' as SortField },
                      { label: 'Date', field: 'created_at' as SortField },
                      { label: 'Actions', field: null },
                    ].map((col) => (
                      <th
                        key={col.label}
                        onClick={() => col.field && handleSort(col.field)}
                        className={clsx(
                          'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider',
                          col.field && 'cursor-pointer hover:text-gray-800 select-none'
                        )}
                      >
                        <div className="flex items-center">
                          {col.label}
                          {col.field && <SortIcon field={col.field} />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginated.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button type="button" onClick={() => navigate(`/users/${order.user_id}`)} className="text-left">
                          <p className="text-sm font-medium text-primary-700 hover:text-primary-900">
                            {order.profiles?.name ?? 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-400">{order.profiles?.email ?? order.user_id}</p>
                        </button>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-900">{order.product_name}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-900 text-center">{order.quantity}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatMoney(order.total_amount, order.currency)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize', statusStyles[order.status] ?? 'bg-gray-100 text-gray-700')}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-500">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium">
                        <button type="button" onClick={() => openDrawer(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} orders
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pg = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <button key={pg} onClick={() => setPage(pg)}
                      className={clsx('w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                        page === pg ? 'bg-primary-600 text-white' : 'hover:bg-gray-200 text-gray-700')}>
                      {pg}
                    </button>
                  );
                })}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Order Drawer */}
      <OrderDrawer
        order={selectedOrder}
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedOrder(null); }}
        onStatusChange={(id, newStatus) => {
          setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: newStatus } : o));
        }}
      />
    </div>
  );
};

export default Orders;
