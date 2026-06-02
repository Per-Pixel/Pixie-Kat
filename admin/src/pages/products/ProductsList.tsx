import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Edit } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { listProducts, Product, ProductStatus } from '../../services/catalogService';

interface ProductsListProps {
  statusFilter?: ProductStatus;
  title?: string;
}

type Row = Product & { game?: { name: string; slug: string } };

const statusBadge = (status: ProductStatus) => {
  const map: Record<ProductStatus, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    draft: 'bg-yellow-100 text-yellow-800',
  };
  return map[status];
};

const ProductsList: React.FC<ProductsListProps> = ({ statusFilter, title = 'All Products' }) => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProducts({ status: statusFilter, search: search || undefined });
      setRows(data);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1">Top-up packages across all games</p>
        </div>
      </motion.div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search packages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading products…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No products found.</p>
            <button onClick={() => navigate('/products/games')} className="btn btn-outline btn-sm mt-4">
              Manage games to add packages
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Game</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{p.name}</div>
                      {p.amount && <div className="text-xs text-gray-500">{p.amount}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.game?.name ?? '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {p.currency} {Number(p.price).toFixed(2)}
                      {p.compare_price ? <span className="ml-2 text-xs text-gray-400 line-through">{Number(p.compare_price).toFixed(2)}</span> : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {p.game ? (
                        <button
                          onClick={() => navigate(`/products/games/${p.game_id}`)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit in game"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsList;
