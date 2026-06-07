import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  listPromoItems,
  deletePromoItem,
  updatePromoItem,
  reorderPromoItems,
  PromoItem,
  PromoSection,
} from '../../services/catalogService';

interface PromoListProps {
  section: PromoSection;
  title: string;
  description: string;
  basePath?: string;
}

const PromoList: React.FC<PromoListProps> = ({ section, title, description, basePath }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<PromoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);

  const sectionPath = basePath ?? `/content/${section.replace('_', '-')}`;
  const editPath = (id: string) => `${sectionPath}/${id}`;
  const newPath = () => `${sectionPath}/new`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listPromoItems(section));
    } catch (err) {
      toast.error((err as Error).message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (item: PromoItem) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      await deletePromoItem(item.id);
      toast.success('Deleted');
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      toast.error((err as Error).message || 'Delete failed');
    }
  };

  const handleToggleActive = async (item: PromoItem) => {
    try {
      const updated = await updatePromoItem(item.id, { is_active: !item.is_active });
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err) {
      toast.error((err as Error).message || 'Update failed');
    }
  };

  const moveItem = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    const withOrder = reordered.map((item, i) => ({ ...item, sort_order: i + 1 }));
    setItems(withOrder);
    try {
      await reorderPromoItems(withOrder.map(({ id, sort_order }) => ({ id, sort_order })));
    } catch (err) {
      toast.error('Reorder failed');
      load();
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>
        <button onClick={() => navigate(newPath())} className="mt-4 sm:mt-0 btn btn-primary btn-md">
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </button>
      </motion.div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No items yet.</p>
            <button onClick={() => navigate(newPath())} className="btn btn-outline btn-sm mt-4">
              Create your first item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-10">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  {section === 'trending' && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 ${dragging === item.id ? 'opacity-50' : ''}`}
                    draggable
                    onDragStart={() => setDragging(item.id)}
                    onDragEnd={() => setDragging(null)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-gray-400">
                        <GripVertical className="w-4 h-4 cursor-grab" />
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveItem(idx, -1)}
                            disabled={idx === 0}
                            className="text-xs leading-none disabled:opacity-30 hover:text-gray-700"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveItem(idx, 1)}
                            disabled={idx === items.length - 1}
                            className="text-xs leading-none disabled:opacity-30 hover:text-gray-700"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-10 rounded overflow-hidden bg-gray-100 shrink-0">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-200" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.title}</p>
                          {item.flag && <span className="text-base">{item.flag}</span>}
                        </div>
                      </div>
                    </td>
                    {section === 'trending' && (
                      <>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.price != null ? `₹${item.price}` : '—'}
                          {item.compare_price != null ? (
                            <span className="ml-2 text-xs text-gray-400 line-through">₹{item.compare_price}</span>
                          ) : null}
                          {item.discount_pct != null ? (
                            <span className="ml-2 inline-block bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded">
                              {item.discount_pct}%
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.rating != null ? `${item.rating}/100` : '—'}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {item.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className="text-gray-500 hover:text-gray-900"
                          title={item.is_active ? 'Hide' : 'Show'}
                        >
                          {item.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => navigate(editPath(item.id))}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

export default PromoList;
