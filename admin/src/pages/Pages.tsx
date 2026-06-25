import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import pageService from '../services/pageService';
import StatusBadge from '../components/cms/StatusBadge';
import { PageStatus } from '../types/cms';
import type { Page } from '../types/cms';

const Pages: React.FC = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PageStatus[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    loadPages();
  }, [statusFilter]);

  const loadPages = async () => {
    try {
      setLoading(true);
      const response = await pageService.getPages(
        {
          status: statusFilter.length > 0 ? statusFilter : undefined,
          search: searchQuery || undefined,
        },
        { field: 'updatedAt', order: 'desc' }
      );
      setPages(response.pages);
    } catch (error) {
      toast.error('Failed to load pages');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadPages();
  };

  const handleStatusChange = async (id: string, status: PageStatus) => {
    try {
      await pageService.updatePageStatus(id, status);
      toast.success('Page status updated');
      loadPages();
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Move this page to trash?')) return;

    try {
      await pageService.deletePage(id);
      toast.success('Page moved to trash');
      loadPages();
    } catch (error) {
      toast.error('Failed to delete page');
      console.error(error);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const page = pages.find((p) => p.id === id);
      await pageService.duplicatePage(id, `${page?.title} (Copy)`);
      toast.success('Page duplicated');
      loadPages();
    } catch (error) {
      toast.error('Failed to duplicate page');
      console.error(error);
    }
  };

  const handleBulkStatusChange = async (status: PageStatus) => {
    if (selectedIds.length === 0) return;

    try {
      await pageService.bulkUpdateStatus(selectedIds, status);
      toast.success(`${selectedIds.length} page(s) updated`);
      setSelectedIds([]);
      loadPages();
    } catch (error) {
      toast.error('Failed to update pages');
      console.error(error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Move ${selectedIds.length} page(s) to trash?`)) return;

    try {
      await pageService.bulkDelete(selectedIds);
      toast.success(`${selectedIds.length} page(s) moved to trash`);
      setSelectedIds([]);
      loadPages();
    } catch (error) {
      toast.error('Failed to delete pages');
      console.error(error);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pages.map((p) => p.id));
    }
  };

  const toggleStatusFilter = (status: PageStatus) => {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <p className="text-gray-600 mt-1">Manage website content and pages</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <button
            onClick={() => navigate('/pages/builder/new')}
            className="btn btn-primary btn-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Page
          </button>
          <button
            onClick={() => navigate('/trash')}
            className="btn btn-outline btn-md"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Trash
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="input pl-10"
              />
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="btn btn-outline btn-md"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
              {statusFilter.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                  {statusFilter.length}
                </span>
              )}
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                    Status
                  </p>
                  {Object.values(PageStatus).map((status) => (
                    <label
                      key={status}
                      className="flex items-center gap-2 py-2 cursor-pointer hover:bg-gray-50 rounded px-2"
                    >
                      <input
                        type="checkbox"
                        checked={statusFilter.includes(status)}
                        onChange={() => toggleStatusFilter(status)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <StatusBadge status={status} showIcon={false} />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
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
            <button
              onClick={() => handleBulkStatusChange(PageStatus.PUBLISHED)}
              className="btn btn-sm btn-outline"
            >
              <Eye className="w-4 h-4 mr-2" />
              Publish
            </button>
            <button
              onClick={() => handleBulkStatusChange(PageStatus.HIDDEN)}
              className="btn btn-sm btn-outline"
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Hide
            </button>
            <button onClick={handleBulkDelete} className="btn btn-sm btn-danger">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="btn btn-sm btn-outline"
            >
              Clear
            </button>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading pages...</p>
            </div>
          </div>
        ) : pages.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No pages found
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || statusFilter.length > 0
                ? 'Try adjusting your filters'
                : 'Get started by creating your first page'}
            </p>
            {!searchQuery && statusFilter.length === 0 && (
              <button
                onClick={() => navigate('/pages/builder/new')}
                className="btn btn-primary btn-md"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Page
              </button>
            )}
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === pages.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Modified</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(page.id)}
                      onChange={() => toggleSelect(page.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {page.title}
                        </div>
                        {!page.visibility.showInNav && (
                          <span className="text-xs text-gray-500">
                            Hidden from nav
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {page.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={page.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {page.metadata.author}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(page.metadata.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {page.status === PageStatus.PUBLISHED ? (
                        <button
                          onClick={() => handleStatusChange(page.id, PageStatus.HIDDEN)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Hide page"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(page.id, PageStatus.PUBLISHED)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Publish page"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/pages/builder/${page.id}`)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Edit page"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(page.id)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Duplicate page"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(page.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete page"
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
      </motion.div>
    </div>
  );
};

export default Pages;
