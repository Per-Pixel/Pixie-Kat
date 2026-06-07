import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Package, Edit, Trash2, Star, StarOff,
  RefreshCw, Filter, ChevronDown, Plus, ExternalLink,
  AlertCircle, CheckCircle, Zap, Eye, EyeOff, Download,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  listProducts, updateProduct, deleteProduct,
  Product, ProductStatus,
} from '../../services/catalogService';
import clsx from 'clsx';

interface ProductsListProps {
  statusFilter?: ProductStatus;
  title?: string;
}

type Row = Product & { game?: { name: string; slug: string } };
type SortField = 'name' | 'price' | 'status' | 'created_at';
type SortDir = 'asc' | 'desc';

const statusConfig: Record<ProductStatus, { label: string; badge: string }> = {
  active:   { label: 'Active',   badge: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactive', badge: 'bg-gray-100 text-gray-700' },
  draft:    { label: 'Draft',    badge: 'bg-yellow-100 text-yellow-800' },
};

const providerConfig: Record<string, { label: string; badge: string }> = {
  smile_one: { label: 'Smile One API', badge: 'bg-blue-50 text-blue-700 border border-blue-200' },
  manual:    { label: 'Manual',        badge: 'bg-gray-50 text-gray-600 border border-gray-200' },
  other:     { label: 'Other API',     badge: 'bg-purple-50 text-purple-700 border border-purple-200' },
};

function downloadCsv(rows: Row[]) {
  const headers = ['ID', 'Name', 'Game', 'Amount', 'Price', 'Currency', 'Status', 'SKU', 'Provider ID', 'Popular', 'Created'];
  const data = rows.map((r) => [
    r.id, r.name, r.game?.name ?? '', r.amount ?? '',
    String(r.price), r.currency, r.status, r.sku ?? '',
    r.provider_product_id ?? '', r.is_popular ? 'Yes' : 'No', r.created_at ?? '',
  ]);
  const csv = [headers, ...data].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

const ProductsList: React.FC<ProductsListProps> = ({ statusFilter, title = 'All Products' }) => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [localStatusFilter, setLocalStatusFilter] = useState<ProductStatus | 'all'>(statusFilter ?? 'all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProducts({ status: statusFilter });
      setRows(data);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const gameOptions = useMemo(() => {
    const names = [...new Set(rows.map((r) => r.game?.name).filter(Boolean))];
    return names as string[];
  }, [rows]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (localStatusFilter !== 'all' && r.status !== localStatusFilter) return false;
      if (gameFilter !== 'all' && r.game?.name !== gameFilter) return false;
      if (term) {
        return [r.name, r.sku ?? '', r.provider_product_id ?? '', r.game?.name ?? ''].some((v) => v.toLowerCase().includes(term));
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      let av: any = a[sortField], bv: any = b[sortField];
      if (sortField === 'price') { av = Number(av); bv = Number(bv); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [rows, search, localStatusFilter, gameFilter, sortField, sortDir]);

  const togglePopular = async (product: Row) => {
    setTogglingId(product.id);
    try {
      await updateProduct(product.id, { is_popular: !product.is_popular });
      setRows((prev) => prev.map((r) => r.id === product.id ? { ...r, is_popular: !r.is_popular } : r));
      toast.success(product.is_popular ? 'Removed from popular' : 'Marked as popular');
    } catch {
      toast.error('Failed to update');
    } finally {
      setTogglingId(null);
    }
  };

  const toggleStatus = async (product: Row, newStatus: ProductStatus) => {
    if (product.status === newStatus) return;
    setTogglingId(product.id);
    try {
      await updateProduct(product.id, { status: newStatus });
      setRows((prev) => prev.map((r) => r.id === product.id ? { ...r, status: newStatus } : r));
      toast.success(`Status set to ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeletingId(deleteConfirm.id);
    setDeleteConfirm(null);
    try {
      await deleteProduct(deleteConfirm.id);
      setRows((prev) => prev.filter((r) => r.id !== deleteConfirm.id));
      toast.success(`"${deleteConfirm.name}" deleted`);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-3.5 h-3.5 ml-1 text-gray-300" />;
    return (
      <ChevronDown className={clsx('w-3.5 h-3.5 ml-1 text-primary-600 transition-transform', sortDir === 'asc' && 'rotate-180')} />
    );
  };

  const stats = useMemo(() => ({
    active: rows.filter((r) => r.status === 'active').length,
    draft: rows.filter((r) => r.status === 'draft').length,
    inactive: rows.filter((r) => r.status === 'inactive').length,
    popular: rows.filter((r) => r.is_popular).length,
  }), [rows]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">Top-up packages across all games</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn btn-outline btn-sm" disabled={loading}>
            <RefreshCw className={clsx('w-4 h-4 mr-1.5', loading && 'animate-spin')} />Refresh
          </button>
          <button onClick={() => downloadCsv(filtered)} className="btn btn-outline btn-sm" disabled={!filtered.length}>
            <Download className="w-4 h-4 mr-1.5" />Export
          </button>
          <button onClick={() => navigate('/products/games')} className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4 mr-1.5" />Add Package
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Active', value: stats.active, color: 'text-green-700', bg: 'bg-green-50', icon: CheckCircle },
          { label: 'Draft', value: stats.draft, color: 'text-yellow-700', bg: 'bg-yellow-50', icon: AlertCircle },
          { label: 'Inactive', value: stats.inactive, color: 'text-gray-600', bg: 'bg-gray-50', icon: EyeOff },
          { label: 'Popular', value: stats.popular, color: 'text-amber-600', bg: 'bg-amber-50', icon: Star },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-4 flex items-center gap-3">
              <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', s.bg)}>
                <Icon className={clsx('w-5 h-5', s.color)} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={clsx('text-lg font-bold', s.color)}>{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Filter bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search packages, SKU, provider ID..." className="input pl-10 w-full" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={clsx('btn btn-sm btn-outline flex-shrink-0', showFilters && 'bg-primary-50 border-primary-300 text-primary-700')}>
            <Filter className="w-4 h-4 mr-1.5" />
            Filters
            <ChevronDown className={clsx('w-4 h-4 ml-1 transition-transform', showFilters && 'rotate-180')} />
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div>
                  <label className="label block mb-1.5 text-xs">Status</label>
                  <select value={localStatusFilter} onChange={(e) => setLocalStatusFilter(e.target.value as any)} className="input capitalize">
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="label block mb-1.5 text-xs">Game</label>
                  <select value={gameFilter} onChange={(e) => setGameFilter(e.target.value)} className="input">
                    <option value="all">All Games</option>
                    {gameOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <RefreshCw className="w-6 h-6 mx-auto mb-3 animate-spin" />
            <p className="text-sm">Loading products…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No products found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or add packages from the Games editor.</p>
            <button onClick={() => navigate('/products/games')} className="btn btn-outline btn-sm mt-4">
              <Plus className="w-4 h-4 mr-1.5" /> Add Packages via Game Editor
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[
                      { label: 'Package', field: 'name' as SortField },
                      { label: 'Game', field: null },
                      { label: 'Price', field: 'price' as SortField },
                      { label: 'API Mapping', field: null },
                      { label: 'Status', field: 'status' as SortField },
                      { label: 'Popular', field: null },
                      { label: 'Actions', field: null },
                    ].map((col) => (
                      <th key={col.label}
                        onClick={() => col.field && handleSort(col.field)}
                        className={clsx('px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider',
                          col.field && 'cursor-pointer hover:text-gray-800 select-none')}>
                        <div className="flex items-center">
                          {col.label}
                          {col.field && <SortIcon field={col.field} />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((product) => {
                    const sCfg = statusConfig[product.status];
                    const provKey = product.provider_product_id ? 'smile_one' : 'manual';
                    const pCfg = providerConfig[provKey];
                    const isToggling = togglingId === product.id;
                    const isDeleting = deletingId === product.id;

                    return (
                      <tr key={product.id} className={clsx('hover:bg-gray-50 transition-colors', (isToggling || isDeleting) && 'opacity-60')}>
                        {/* Package */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name}
                                className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-primary-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">{product.name}</p>
                              {product.amount && <p className="text-xs text-gray-400">{product.amount}</p>}
                              {product.sku && <p className="text-xs font-mono text-gray-400">SKU: {product.sku}</p>}
                            </div>
                          </div>
                        </td>

                        {/* Game */}
                        <td className="px-4 py-3.5">
                          {product.game ? (
                            <button
                              onClick={() => navigate(`/products/games/${product.game_id}`)}
                              className="flex items-center gap-1 text-sm text-primary-700 hover:text-primary-900 font-medium group"
                            >
                              {product.game.name}
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="text-sm font-semibold text-gray-900">
                            {product.currency} {Number(product.price).toFixed(2)}
                          </p>
                          {product.compare_price ? (
                            <p className="text-xs text-gray-400 line-through">
                              {product.currency} {Number(product.compare_price).toFixed(2)}
                            </p>
                          ) : null}
                          {product.compare_price && product.compare_price > product.price ? (
                            <span className="text-xs font-medium text-emerald-600">
                              -{Math.round(100 - (product.price / product.compare_price) * 100)}% off
                            </span>
                          ) : null}
                        </td>

                        {/* API Mapping */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-1">
                            <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', pCfg.badge)}>
                              {provKey === 'smile_one' ? <Zap className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                              {pCfg.label}
                            </span>
                            {product.provider_product_id && (
                              <p className="text-xs font-mono text-gray-400 truncate max-w-[120px]" title={product.provider_product_id}>
                                {product.provider_product_id}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <div className="relative group">
                            <span className={clsx('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer', sCfg.badge)}>
                              {sCfg.label}
                            </span>
                            {/* Status dropdown on hover */}
                            <div className="absolute left-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 hidden group-hover:block">
                              {Object.entries(statusConfig).map(([s, cfg]) => (
                                <button key={s} onClick={() => toggleStatus(product, s as ProductStatus)} disabled={isToggling}
                                  className={clsx('w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors',
                                    product.status === s ? 'font-semibold text-primary-600' : 'text-gray-700')}>
                                  {cfg.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </td>

                        {/* Popular toggle */}
                        <td className="px-4 py-3.5">
                          <button onClick={() => togglePopular(product)} disabled={isToggling}
                            className={clsx('p-1.5 rounded-lg transition-all',
                              product.is_popular
                                ? 'bg-amber-50 text-amber-500 hover:bg-amber-100'
                                : 'text-gray-300 hover:text-amber-400 hover:bg-amber-50'
                            )}
                            title={product.is_popular ? 'Remove from popular' : 'Mark as popular'}
                          >
                            {isToggling ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : product.is_popular ? (
                              <Star className="w-4 h-4 fill-current" />
                            ) : (
                              <StarOff className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => navigate(`/products/games/${product.game_id}`)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                              title="Edit in Game Editor"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(product)}
                              disabled={isDeleting}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete product"
                            >
                              {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-500">Showing {filtered.length} of {rows.length} products</p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                <span>{stats.popular} marked as popular</span>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Product?</h3>
                <p className="text-sm text-gray-500 text-center mb-1">
                  You're about to delete <strong className="text-gray-800">"{deleteConfirm.name}"</strong>.
                </p>
                <p className="text-xs text-red-600 text-center mb-6">This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteConfirm(null)} className="btn btn-outline btn-md flex-1">Cancel</button>
                  <button onClick={confirmDelete} className="btn btn-md flex-1 bg-red-600 text-white hover:bg-red-700 border-0">Delete</button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductsList;
