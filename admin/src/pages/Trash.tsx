import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Search,
  RefreshCw,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import pageService from '../services/pageService';
import type { TrashItem } from '../types/cms';

const Trash: React.FC = () => {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  useEffect(() => {
    loadTrash();
  }, []);

  const loadTrash = async () => {
    try {
      setLoading(true);
      const response = await pageService.getTrash();
      setTrashItems(response.items);
    } catch (error) {
      toast.error('Failed to load trash');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await pageService.restorePage(id);
      toast.success('Page restored successfully');
      loadTrash();
    } catch (error) {
      toast.error('Failed to restore page');
      console.error(error);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('Are you sure? This action cannot be undone.')) {
      return;
    }

    try {
      await pageService.permanentlyDeletePage(id);
      toast.success('Page permanently deleted');
      loadTrash();
    } catch (error) {
      toast.error('Failed to delete page');
      console.error(error);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;

    try {
      await pageService.bulkRestore(selectedIds);
      toast.success(`${selectedIds.length} page(s) restored`);
      setSelectedIds([]);
      loadTrash();
    } catch (error) {
      toast.error('Failed to restore pages');
      console.error(error);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await pageService.emptyTrash();
      toast.success('Trash emptied successfully');
      setShowEmptyConfirm(false);
      loadTrash();
    } catch (error) {
      toast.error('Failed to empty trash');
      console.error(error);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((item) => item.page.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const filteredItems = trashItems.filter((item) =>
    item.page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trash...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trash2 className="w-6 h-6" />
            Trash
          </h1>
          <p className="text-gray-600 mt-1">
            {trashItems.length} page(s) in trash
          </p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <button
            onClick={loadTrash}
            className="btn btn-outline btn-md"
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          {trashItems.length > 0 && (
            <button
              onClick={() => setShowEmptyConfirm(true)}
              className="btn btn-danger btn-md"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Empty Trash
            </button>
          )}
        </div>
      </motion.div>

      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-center justify-between"
        >
          <span className="text-sm font-medium text-primary-900">
            {selectedIds.length} page(s) selected
          </span>
          <div className="flex gap-2">
            <button onClick={handleBulkRestore} className="btn btn-primary btn-sm">
              <RotateCcw className="w-4 h-4 mr-2" />
              Restore Selected
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="btn btn-outline btn-sm"
            >
              Clear Selection
            </button>
          </div>
        </motion.div>
      )}

      {trashItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search trash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </motion.div>
      )}

      {filteredItems.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center"
        >
          <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No results found' : 'Trash is empty'}
          </h3>
          <p className="text-gray-600">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Deleted pages will appear here'}
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredItems.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deleted By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deleted On
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Left
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.page.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.page.id)}
                        onChange={() => toggleSelect(item.page.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.page.title}
                      </div>
                      <div className="text-sm text-gray-500">{item.page.slug}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.page.metadata.trashedBy || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.page.metadata.trashedAt
                        ? new Date(item.page.metadata.trashedAt).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium ${
                          item.daysRemaining <= 7
                            ? 'text-red-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {item.daysRemaining} days
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRestore(item.page.id)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Restore"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(item.page.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Permanently"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {showEmptyConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Empty Trash?
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  This will permanently delete all {trashItems.length} page(s) in
                  trash. This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowEmptyConfirm(false)}
                    className="btn btn-outline btn-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEmptyTrash}
                    className="btn btn-danger btn-md"
                  >
                    Empty Trash
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Trash;
