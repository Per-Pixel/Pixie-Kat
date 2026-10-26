import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Search, Filter, Download, Eye, RefreshCw, AlertCircle,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, UserCog,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import OrderDrawer from '../components/orders/OrderDrawer';
import clsx from 'clsx';
import { DURATION, EASE_OUT, fadeUp, pop, staggerDelay } from '../lib/motion';

type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled' | 'on_hold';
type SortField = 'created_at' | 'total_amount' | 'status' | 'product_name';
type SortDir = 'asc' | 'desc';
type OrderPeriod = 'today' | '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';

const PERIOD_OPTIONS: Array<{ value: OrderPeriod; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '3 Months' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'Lifetime' },
  { value: 'custom', label: 'Custom' },
];

interface OrderProfile {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

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
  razorpay_order_id?: string | null;
  metadata?: {
    account_fields?: Record<string, string>;
    game_name?: string;
    game_slug?: string;
    verified_username?: string;
    contact?: { email?: string; whatsapp?: string };
  } | null;
  created_at: string;
  updated_at: string;
  profiles?: OrderProfile[] | OrderProfile | null;
}

function getProfile(profiles: OrderRow['profiles']): OrderProfile {
  if (!profiles) return {};
  return Array.isArray(profiles) ? (profiles[0] ?? {}) : profiles;
}

function matchesOrderPeriod(ts: string, period: OrderPeriod, customStart: string, customEnd: string): boolean {
  if (period === 'all') return true;
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return date >= start;
  }
  if (period === '7d') return date >= new Date(now.getTime() - 7 * 86_400_000);
  if (period === '30d') return date >= new Date(now.getTime() - 30 * 86_400_000);
  if (period === '90d') return date >= new Date(now.getTime() - 90 * 86_400_000);
  if (period === '1y') return date >= new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  if (period === 'custom') {
    if (customStart && date < new Date(`${customStart}T00:00:00`)) return false;
    if (customEnd && date > new Date(`${customEnd}T23:59:59.999`)) return false;
    return true;
  }
  return true;
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
    ['Order ID', 'Customer', 'Email', 'Product', 'Quantity', 'Amount', 'Currency', 'Status', 'Payment Method', 'Payment ID', 'Razorpay Order ID', 'Date'],
    ...orders.map((o) => {
      const prof = getProfile(o.profiles);
      return [
        o.id, prof.name ?? 'Unknown', prof.email ?? '',
        o.product_name, String(o.quantity), String(o.total_amount),
        o.currency, o.status, o.payment_method ?? '', o.payment_id ?? '', o.razorpay_order_id ?? '', o.created_at,
      ];
    }),
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | OrderStatus>('all');
  const [period, setPeriod] = useState<OrderPeriod>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [includeInternal, setIncludeInternal] = useState(true);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  // Row entrance stagger runs once — page/sort changes afterwards swap instantly.
  const rowsIntroduced = useRef(false);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    // Page through the full table — a plain .limit() silently drops the
    // oldest orders once the store passes the cap.
    const PAGE = 1000;
    const all: OrderRow[] = [];
    let failed: string | null = null;
    for (let from = 0; from < 50000; from += PAGE) {
      const { data, error: ordersError } = await supabase
        .from('orders')
        .select(`id, user_id, product_name, quantity, total_amount, currency, status, payment_method, payment_id, razorpay_order_id, metadata, created_at, updated_at, profiles:user_id (id, name, email, role)`)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE - 1);
      if (ordersError) { failed = ordersError.message; break; }
      all.push(...((data as unknown as OrderRow[]) ?? []));
      if (!data || data.length < PAGE) break;
    }
    if (failed) { setError(failed); setOrders([]); }
    else { setOrders(all); }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const paymentMethods = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.payment_method) set.add(o.payment_method);
    });
    return Array.from(set).sort();
  }, [orders]);

  const internalCount = useMemo(
    () => orders.filter((o) => getProfile(o.profiles).role === 'admin').length,
    [orders]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = orders.filter((o) => {
      const prof = getProfile(o.profiles);
      if (!includeInternal && prof.role === 'admin') return false;
      if (status !== 'all' && o.status !== status) return false;
      if (paymentFilter !== 'all' && (o.payment_method ?? '') !== paymentFilter) return false;
      if (!matchesOrderPeriod(o.created_at, period, customStart, customEnd)) return false;
      if (!term) return true;
      return [
        o.id,
        o.product_name,
        o.payment_id ?? '',
        o.razorpay_order_id ?? '',
        prof.name ?? '',
        prof.email ?? '',
        o.metadata?.verified_username ?? '',
        ...Object.values(o.metadata?.account_fields ?? {}),
      ].some((v) => String(v).toLowerCase().includes(term));
    });
    list = [...list].sort((a, b) => {
      const avRaw: unknown = a[sortField];
      const bvRaw: unknown = b[sortField];
      const av = sortField === 'total_amount' ? Number(avRaw) : String(avRaw ?? '');
      const bv = sortField === 'total_amount' ? Number(bvRaw) : String(bvRaw ?? '');
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [orders, search, status, paymentFilter, period, customStart, customEnd, includeInternal, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (!loading && paginated.length > 0) rowsIntroduced.current = true;
  }, [loading, paginated.length]);

  const stats = useMemo(() => ({
    total: filtered.length,
    pending: filtered.filter((o) => o.status === 'pending').length,
    processing: filtered.filter((o) => o.status === 'processing').length,
    revenue: filtered.filter((o) => o.status === 'completed').reduce((s, o) => s + Number(o.total_amount || 0), 0),
  }), [filtered]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-3.5 h-3.5 text-gray-300 ml-1" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-primary-600 ml-1" />
      : <ChevronDown className="w-3.5 h-3.5 text-primary-600 ml-1" />;
  };

  const openDrawer = (order: OrderRow) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
    setSearchParams({ order: order.id }, { replace: true });
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedOrder(null);
    if (searchParams.get('order')) setSearchParams({}, { replace: true });
  };

  // Deep-link support: /revenue/orders?order=<id> opens the drawer directly
  useEffect(() => {
    const orderId = searchParams.get('order');
    if (!orderId || drawerOpen || orders.length === 0) return;
    const match = orders.find((o) => o.id === orderId);
    if (match) { setSelectedOrder(match); setDrawerOpen(true); }
  }, [orders, searchParams, drawerOpen]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        transition={{ duration: DURATION.base, ease: EASE_OUT }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-gray-500 mt-1 text-sm">Track and manage all customer orders</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
          <button
            type="button"
            onClick={() => navigate('/orders/manual')}
            className="btn btn-md text-white border-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #6c49ff 0%, #8b5cf6 100%)' }}
          >
            Manual Orders &amp; AI
          </button>
          <button
            type="button"
            onClick={() => navigate('/orders/history')}
            className="btn btn-outline btn-md"
          >
            Order History
          </button>
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
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 + staggerDelay(i, 0.04, 0.14), duration: DURATION.base, ease: EASE_OUT }}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-medium text-gray-500">{s.label}</p>
            <p className={clsx('mt-1.5 text-xl font-bold tabular-nums', s.color)}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Search & Filter */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        transition={{ delay: 0.1, duration: DURATION.base, ease: EASE_OUT }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {PERIOD_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setPeriod(value); setPage(1); }}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  period === value
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { setIncludeInternal((v) => !v); setPage(1); }}
            className={clsx('btn btn-sm flex items-center gap-1.5 text-xs', includeInternal ? 'btn-primary' : 'btn-outline')}
            title="Toggle orders placed by admin accounts"
          >
            <UserCog className="w-3.5 h-3.5" />
            {includeInternal ? `Internal shown (${internalCount})` : 'Internal hidden'}
          </button>
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-gray-100">
            <label className="text-xs text-gray-500">
              Start date
              <input
                type="date"
                className="input mt-1 h-9 text-xs block"
                value={customStart}
                onChange={(e) => { setCustomStart(e.target.value); setPage(1); }}
              />
            </label>
            <label className="text-xs text-gray-500">
              End date
              <input
                type="date"
                className="input mt-1 h-9 text-xs block"
                value={customEnd}
                onChange={(e) => { setCustomEnd(e.target.value); setPage(1); }}
              />
            </label>
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search orders, customers, email, UID, payment ID..."
              className="input pl-10 w-full" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select value={status} onChange={(e) => { setStatus(e.target.value as 'all' | OrderStatus); setPage(1); }}
              className="input min-w-36 capitalize">
              {statusOptions.map((o) => (
                <option key={o} value={o}>{o === 'all' ? 'All Statuses' : o.replace('_', ' ')}</option>
              ))}
            </select>
            <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
              className="input min-w-36 capitalize">
              <option value="all">All Payments</option>
              {paymentMethods.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp} initial="initial" animate="animate"
        transition={{ delay: 0.16, duration: DURATION.base, ease: EASE_OUT }}
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
                  {paginated.map((order, i) => (
                    <motion.tr
                      key={order.id}
                      initial={rowsIntroduced.current ? false : { opacity: 0, y: reduceMotion ? 0 : 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: staggerDelay(i, 0.028, 0.2), duration: DURATION.base, ease: EASE_OUT }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm font-mono font-medium text-gray-900">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button type="button" onClick={() => navigate(`/users/${order.user_id}`)} className="text-left">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-primary-700 hover:text-primary-900">
                              {getProfile(order.profiles).name || 'Unknown'}
                            </p>
                            {getProfile(order.profiles).role === 'admin' && (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                                Staff
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{getProfile(order.profiles).email || order.user_id}</p>
                        </button>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-900">{order.product_name}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-900 text-center tabular-nums">{order.quantity}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900 tabular-nums">
                        {formatMoney(order.total_amount, order.currency)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <motion.span
                          key={order.status}
                          variants={pop}
                          initial="initial"
                          animate="animate"
                          className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize', statusStyles[order.status] ?? 'bg-gray-100 text-gray-700')}
                        >
                          {order.status.replace('_', ' ')}
                        </motion.span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-500">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium">
                        <button type="button" onClick={() => openDrawer(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 tabular-nums">
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
        onClose={closeDrawer}
        onStatusChange={(id, newStatus) => {
          setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: newStatus } : o));
        }}
      />
    </div>
  );
};

export default Orders;
