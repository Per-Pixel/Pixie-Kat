import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, ChevronDown, ChevronLeft, ChevronRight, DollarSign,
  Download, Package, RefreshCw, Search, ShoppingCart, TrendingUp, UserCog, Wallet,
} from 'lucide-react';
import clsx from 'clsx';
import { useAdminReport } from '../../hooks/useAdminReport';
import { useAdminCurrency } from '../../lib/currency';
import { ADMIN_PERIOD_OPTIONS, AdminPeriod, exportToCsv, matchesAdminPeriod } from '../../utils/dateRange';

type SortField = 'name' | 'price' | 'orders' | 'units' | 'revenue' | 'profit' | 'margin';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 25;

const RevenueProducts: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useAdminReport();
  const { formatMoney } = useAdminCurrency();

  const [period, setPeriod] = useState<AdminPeriod>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');
  const [gameFilter, setGameFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [includeInternal, setIncludeInternal] = useState(false);
  const [walletOnly, setWalletOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  const adminIds = useMemo(
    () => new Set(data?.profiles.filter((p) => p.role === 'admin').map((p) => p.id) ?? []),
    [data]
  );

  const games = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.products.map((p) => p.game?.name).filter(Boolean) as string[])].sort();
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();

    const list = data.products
      .filter((product) => {
        if (gameFilter !== 'all' && (product.game?.name || 'Unknown') !== gameFilter) return false;
        if (statusFilter !== 'all' && product.status !== statusFilter) return false;
        if (term) {
          const hit = [product.name, product.game?.name ?? '', product.id].some((v) =>
            v.toLowerCase().includes(term)
          );
          if (!hit) return false;
        }
        return true;
      })
      .map((product) => {
        const orders = data.orders.filter(
          (order) =>
            order.status === 'completed' &&
            (includeInternal || !adminIds.has(order.user_id)) &&
            (!walletOnly || order.payment_method === 'wallet') &&
            matchesAdminPeriod(order.created_at, period, customStart, customEnd) &&
            (order.product_id === product.id || (!order.product_id && order.product_name === product.name))
        );
        const units = orders.reduce((sum, order) => sum + Number(order.quantity || 1), 0);
        const revenue = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
        const cost = orders.reduce((sum, order) => {
          const unitCost =
            order.unit_cost_price != null && Number(order.unit_cost_price) > 0
              ? Number(order.unit_cost_price)
              : Number(product.cost_price || 0);
          return sum + unitCost * Number(order.quantity || 1);
        }, 0);
        const profit = revenue - cost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

        return {
          ...product,
          units,
          revenue,
          cost,
          profit,
          margin,
          orders: orders.length,
        };
      });

    return list.sort((a, b) => {
      const av = sortField === 'name' ? a.name.toLowerCase() : Number(a[sortField] ?? 0);
      const bv = sortField === 'name' ? b.name.toLowerCase() : Number(b[sortField] ?? 0);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, search, gameFilter, statusFilter, includeInternal, walletOnly, period, customStart, customEnd, adminIds, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  if (loading && !data) {
    return (
      <div className="py-24 text-center text-gray-400">
        <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3" />
        Loading product revenue...
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700">
        <AlertCircle className="w-5 h-5 mb-2" />
        {error}
        <button onClick={refresh} className="btn btn-outline btn-sm ml-4">Retry</button>
      </div>
    );
  }

  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalProfit = rows.reduce((sum, row) => sum + row.profit, 0);
  const totalUnits = rows.reduce((sum, row) => sum + row.units, 0);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleExport = () => {
    exportToCsv(
      `product-revenue-${period}`,
      ['Product', 'Game', 'Status', 'Price', 'Orders', 'Units', 'Revenue', 'COGS', 'Profit', 'Margin %'],
      rows.map((r) => [
        r.name,
        r.game?.name || 'Unknown',
        r.status,
        Number(r.price).toFixed(2),
        r.orders,
        r.units,
        r.revenue.toFixed(2),
        r.cost.toFixed(2),
        r.profit.toFixed(2),
        r.margin.toFixed(1),
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Product Revenue</h1>
          <p className="text-sm text-gray-500 mt-1">Completed-order revenue, COGS, and margin by catalog product</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setIncludeInternal((v) => !v); setPage(1); }}
            className={clsx('btn btn-sm flex items-center gap-1.5', includeInternal ? 'btn-primary' : 'btn-outline')}
          >
            <UserCog className="w-4 h-4" />
            {includeInternal ? 'Internal: On' : 'Internal: Off'}
          </button>
          <button
            onClick={() => { setWalletOnly((v) => !v); setPage(1); }}
            className={clsx('btn btn-sm flex items-center gap-1.5', walletOnly ? 'btn-primary' : 'btn-outline')}
          >
            <Wallet className="w-4 h-4" />
            {walletOnly ? 'Wallet Only' : 'All Payments'}
          </button>
          <button onClick={handleExport} disabled={!rows.length} className="btn btn-outline btn-sm">
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </button>
          <button onClick={() => navigate('/products')} className="btn btn-primary btn-sm">
            <Package className="w-4 h-4 mr-1.5" />
            Manage Products
          </button>
        </div>
      </div>

      {/* Period pills */}
      <div className="flex flex-wrap items-center gap-2">
        {ADMIN_PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setPeriod(opt.value); setPage(1); }}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              period === opt.value ? 'bg-primary-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
          <label className="text-xs text-gray-500">Start
            <input type="date" className="input mt-1 block" value={customStart} onChange={(e) => { setCustomStart(e.target.value); setPage(1); }} />
          </label>
          <label className="text-xs text-gray-500">End
            <input type="date" className="input mt-1 block" value={customEnd} onChange={(e) => { setCustomEnd(e.target.value); setPage(1); }} />
          </label>
        </div>
      )}

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Matching Products', value: rows.length.toLocaleString(), icon: Package },
          { label: 'Completed Revenue', value: formatMoney(totalRevenue), icon: DollarSign },
          { label: 'Known Gross Profit', value: formatMoney(totalProfit), icon: TrendingUp },
          { label: 'Units Sold', value: totalUnits.toLocaleString(), icon: ShoppingCart },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white border rounded-xl p-5">
            <Icon className="w-5 h-5 text-primary-600 mb-3" />
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white border rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products or games..."
            className="input pl-10 w-full"
          />
        </div>
        <select
          value={gameFilter}
          onChange={(e) => { setGameFilter(e.target.value); setPage(1); }}
          className="input sm:w-52"
        >
          <option value="all">All Games</option>
          {games.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input sm:w-44"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-12 text-center text-sm text-gray-400">No products match the selected filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      { label: 'Product', field: 'name' as SortField },
                      { label: 'Game', field: null },
                      { label: 'Price', field: 'price' as SortField },
                      { label: 'Orders', field: 'orders' as SortField },
                      { label: 'Units', field: 'units' as SortField },
                      { label: 'Revenue', field: 'revenue' as SortField },
                      { label: 'Profit', field: 'profit' as SortField },
                      { label: 'Margin', field: 'margin' as SortField },
                      { label: 'Status', field: null },
                    ].map((col) => (
                      <th
                        key={col.label}
                        onClick={() => col.field && handleSort(col.field)}
                        className={clsx(
                          'px-5 py-3 text-left text-xs uppercase text-gray-500',
                          col.field && 'cursor-pointer hover:text-gray-900 select-none'
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {col.field && sortField === col.field && (
                            <ChevronDown className={clsx('w-3.5 h-3.5 text-primary-600 transition-transform', sortDir === 'asc' && 'rotate-180')} />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pageRows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 text-sm font-medium">{row.name}</td>
                      <td className="px-5 py-4 text-sm text-gray-500">{row.game?.name || 'Unknown'}</td>
                      <td className="px-5 py-4 text-sm tabular-nums">{formatMoney(Number(row.price))}</td>
                      <td className="px-5 py-4 text-sm tabular-nums">{row.orders}</td>
                      <td className="px-5 py-4 text-sm tabular-nums">{row.units}</td>
                      <td className="px-5 py-4 text-sm font-semibold tabular-nums">{formatMoney(row.revenue)}</td>
                      <td className={clsx('px-5 py-4 text-sm font-semibold tabular-nums', row.profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                        {row.profit >= 0 ? '+' : '-'}{formatMoney(Math.abs(row.profit))}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 tabular-nums">{row.margin.toFixed(1)}%</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs capitalize ${row.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-500">
                <span>
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, rows.length)} of {rows.length} products
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="p-1.5 rounded border bg-white disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="tabular-nums">Page {safePage} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="p-1.5 rounded border bg-white disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RevenueProducts;
