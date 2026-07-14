import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, UserPlus, Search, Eye, Edit, Trash2, Shield, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { api } from '../../services/api';

interface Client {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: string;
  status: string;
  wallet_balance: number | null;
  created_at: string;
  last_login_at: string | null;
}

const PAGE_SIZE = 20;

const getRoleColor = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-800';
    case 'support':
      return 'bg-orange-100 text-orange-800';
    case 'reseller':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'suspended':
      return 'bg-red-100 text-red-800';
    case 'banned':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
};

const CLIENT_ROLE = 'user';

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ totalClients: 0, activeClients: 0, suspendedClients: 0, totalWallet: 0 });
  const [processing, setProcessing] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, name, email, username, role, status, wallet_balance, created_at, last_login_at', { count: 'exact' })
        .eq('role', CLIENT_ROLE)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter) query = query.eq('status', statusFilter);

      if (search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%,username.ilike.%${search.trim()}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setClients((data ?? []) as Client[]);
      setTotal(count ?? 0);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  const loadStats = useCallback(async () => {
    try {
      const { count: totalClients } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', CLIENT_ROLE);

      const { count: activeClients } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', CLIENT_ROLE)
        .eq('status', 'active');

      const { count: suspendedClients } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', CLIENT_ROLE)
        .in('status', ['suspended', 'banned']);

      const { data: walletData } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('role', CLIENT_ROLE);

      const totalWallet = (walletData ?? []).reduce((s, p) => s + Number(p.wallet_balance ?? 0), 0);

      setStats({
        totalClients: totalClients ?? 0,
        activeClients: activeClients ?? 0,
        suspendedClients: suspendedClients ?? 0,
        totalWallet,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 0) setPage(0);
      else loadClients();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (page === 0) loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const viewClient = (id: string) => navigate(`/users/${id}`);
  const editClient = (id: string) => navigate(`/users/${id}`);

  const suspendClient = async (id: string) => {
    if (!window.confirm('Suspend this client?')) return;
    try {
      setProcessing(id);
      await api.post(`/admin/users/${id}/status`, { status: 'suspended', reason: 'Suspended by admin' });
      toast.success('Client suspended');
      await loadClients();
      await loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to suspend client');
    } finally {
      setProcessing(null);
    }
  };

  const deleteClient = async (id: string) => {
    if (!window.confirm('Permanently delete this client? This cannot be undone.')) return;
    try {
      setProcessing(id);
      await api.delete(`/admin/users/${id}`, { data: { confirmation: 'DELETE' } });
      toast.success('Client deleted');
      await loadClients();
      await loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete client');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-primary-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
              <p className="text-gray-600">Customer accounts — role: user only. Staff and admins are managed separately.</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Client
          </button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalClients}</p>
            </div>
            <Users className="w-8 h-8 text-primary-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Clients</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.activeClients}</p>
            </div>
            <Shield className="w-8 h-8 text-green-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Suspended / Banned</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.suspendedClients}</p>
            </div>
            <Users className="w-8 h-8 text-red-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Wallet Balance</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {stats.totalWallet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, email, or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>
      </motion.div>

      {/* Clients Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200"
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Client List</h3>
          <span className="text-sm text-gray-500">{total} clients</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wallet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-500 mx-auto" />
                    <p className="mt-2 text-sm text-gray-500">Loading clients…</p>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                    No clients found.
                  </td>
                </tr>
              ) : (
                clients.map((client, index) => (
                  <motion.tr
                    key={client.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + index * 0.03 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{client.name || 'Unnamed'}</div>
                        <div className="text-sm text-gray-500">{client.email}</div>
                        {client.username && (
                          <div className="text-xs text-gray-400">@{client.username}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(client.role)}`}>
                        {client.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(client.status)}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Number(client.wallet_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(client.last_login_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => viewClient(client.id)}
                          disabled={processing === client.id}
                          title="View"
                          className="text-primary-600 hover:text-primary-900 disabled:opacity-50"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => editClient(client.id)}
                          disabled={processing === client.id}
                          title="Edit"
                          className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => suspendClient(client.id)}
                          disabled={processing === client.id || client.status === 'suspended'}
                          title="Suspend"
                          className="text-amber-600 hover:text-amber-900 disabled:opacity-50"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteClient(client.id)}
                          disabled={processing === client.id}
                          title="Delete"
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loading}
                className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Clients;
