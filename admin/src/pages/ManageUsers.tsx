import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Eye,
  Trash2,
  RefreshCw,
  AlertCircle,
  UserCheck,
  UserX,
  Download,
  MoreVertical,
  ArrowLeft,
  Mail,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  joinedAt: string;
  updatedAt?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'banned';
  role?: 'user' | 'admin' | 'reseller' | 'support';
}


const ManageUsers: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<RegisteredUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: sbError } = await supabase
        .from('profiles')
        .select('id, email, name, phone, role, status, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (sbError) throw sbError;

      const enrichedUsers = (rows ?? []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role || 'user',
        status: u.status || 'active',
        joinedAt: u.created_at,
        updatedAt: u.updated_at,
      }));
      setUsers(enrichedUsers);
      setFilteredUsers(enrichedUsers);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;
    const q = search.toLowerCase();

    if (q) {
      filtered = filtered.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((u) => u.status === statusFilter);
    }
    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [search, users, statusFilter, roleFilter]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const handleSelectUser = (userId: string, selected: boolean) => {
    const next = new Set(selectedUsers);
    selected ? next.add(userId) : next.delete(userId);
    setSelectedUsers(next);
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedUsers(selected ? new Set(filteredUsers.map((u) => u.id)) : new Set());
  };

  const updateUserStatus = async (
    userId: string,
    status: 'active' | 'inactive' | 'suspended' | 'banned',
    successMessage: string,
    reason: string = successMessage
  ) => {
    try {
      setProcessingAction(`${userId}:${status}`);
      await api.post(`/admin/users/${userId}/status`, { status, reason });
      toast.success(successMessage);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setProcessingAction(null);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return;

    try {
      setProcessingAction(`${userId}:delete`);
      await api.delete(`/admin/users/${userId}`, { data: { confirmation: 'DELETE' } });
      toast.success('User permanently deleted');
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.size === 0) {
      toast.error('Select at least one user');
      return;
    }
    const count = selectedUsers.size;
    const userIds = Array.from(selectedUsers);

    try {
      setProcessingAction(`bulk:${action}`);

      switch (action) {
        case 'activate': {
          await Promise.all(userIds.map(id => api.post(`/admin/users/${id}/status`, { status: 'active', reason: 'Bulk activated by admin' })));
          toast.success(`Activated ${count} user(s)`);
          break;
        }
        case 'deactivate': {
          await Promise.all(userIds.map(id => api.post(`/admin/users/${id}/status`, { status: 'inactive', reason: 'Bulk deactivated by admin' })));
          toast.success(`Deactivated ${count} user(s)`);
          break;
        }
        case 'delete':
          if (!confirm(`Permanently delete ${count} user(s)? This cannot be undone.`)) return;
          await Promise.all(userIds.map((id) => api.delete(`/admin/users/${id}`, { data: { confirmation: 'DELETE' } })));
          toast.success(`Deleted ${count} user(s)`);
          break;
      }

      setSelectedUsers(new Set());
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Failed to ${action} users`);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
    setActionMenuOpen(null);
    switch (action) {
      case 'view':
      case 'edit':
        navigate(`/users/${userId}`);
        break;
      case 'email':
        toast('Email user coming soon');
        break;
      case 'suspend':
        await updateUserStatus(userId, 'suspended', 'User suspended', 'Suspended by admin');
        break;
      case 'delete':
        await deleteUser(userId);
        break;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-orange-100 text-orange-800';
      case 'banned':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'reseller':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
            <p className="text-gray-600 mt-1">
              View, edit, and manage all registered users
              {!loading && !error && (
                <span className="ml-2 text-primary-600 font-medium">
                  ({users.length} total)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <button className="btn btn-outline btn-md">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button onClick={fetchUsers} disabled={loading} className="btn btn-primary btn-md">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Search & Filters */}
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
                placeholder="Search by name or email..."
                className="input pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-outline btn-md"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            <ChevronDown
              className={`w-4 h-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 mt-4 border-t border-gray-200">
                <div>
                  <label className="label mb-1.5 block">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="label mb-1.5 block">Role</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="input"
                  >
                    <option value="all">All Roles</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="reseller">Reseller</option>
                    <option value="support">Support</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setRoleFilter('all');
                      setSearch('');
                    }}
                    className="btn btn-outline btn-md"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedUsers.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-sm text-blue-700 font-medium">
                {selectedUsers.size} user(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  disabled={processingAction !== null}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Activate
                </button>
                <button
                  onClick={() => handleBulkAction('deactivate')}
                  disabled={processingAction !== null}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700 transition-colors"
                >
                  <UserX className="w-3.5 h-3.5" />
                  Deactivate
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  disabled={processingAction !== null}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      >
        {error ? (
          <div className="flex items-center gap-3 p-6 text-red-700 bg-red-50">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={fetchUsers} className="ml-auto btn btn-outline btn-sm">
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {search || statusFilter !== 'all' || roleFilter !== 'all'
              ? 'No users match your filters.'
              : 'No registered users yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedUsers.size === filteredUsers.length && filteredUsers.length > 0
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={(e) => handleSelectUser(user.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-600 font-medium text-sm">
                            {user.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.phone && <div className="text-sm text-gray-500">{user.phone}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(
                          user.role
                        )}`}
                      >
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                          user.status
                        )}`}
                      >
                        {user.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(user.joinedAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2 relative">
                        <button
                          onClick={() => navigate(`/users/${user.id}`)}
                          className="text-primary-600 hover:text-primary-900 p-1"
                          title="View / Edit"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUserAction(user.id, 'email')}
                          className="text-primary-600 hover:text-primary-900 p-1"
                          title="Email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActionMenuOpen(actionMenuOpen === user.id ? null : user.id)
                            }
                            className="text-gray-400 hover:text-gray-600 p-1"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          <AnimatePresence>
                            {actionMenuOpen === user.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-8 z-10 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                              >
                                <button
                                  onClick={() => handleUserAction(user.id, 'suspend')}
                                  disabled={processingAction !== null}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50"
                                >
                                  <Shield className="w-4 h-4" />
                                  Suspend User
                                </button>
                                <button
                                  onClick={() => handleUserAction(user.id, 'delete')}
                                  disabled={processingAction !== null}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete User
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
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

export default ManageUsers;
