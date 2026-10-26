import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ADMIN_PERIOD_OPTIONS, AdminPeriod, exportToCsv, matchesAdminPeriod } from '../utils/dateRange';
import { DURATION, EASE_OUT, expandCollapse, fadeUp, pop, staggerDelay } from '../lib/motion';

const getApiErrorMessage = (err: unknown, fallback: string) => {
  const apiErr = err as { response?: { data?: { message?: string } } };
  return apiErr.response?.data?.message || fallback;
};

type KycStatus = 'pending' | 'approved' | 'rejected' | 'unverified';
type SortField = 'name' | 'role' | 'status' | 'joinedAt';

interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  joinedAt: string;
  updatedAt?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'banned';
  role?: 'user' | 'admin' | 'reseller' | 'support';
  kycStatus: KycStatus;
}

interface ManageUsersProps {
  defaultRoleFilter?: string;
  title?: string;
  subtitle?: string;
}

const PAGE_SIZE = 25;

function deriveKycStatus(row?: {
  tier?: string | null;
  identity_status?: string | null;
  address_status?: string | null;
  phone_status?: string | null;
}): KycStatus {
  if (!row) return 'unverified';
  const statuses = [row.identity_status, row.address_status, row.phone_status];
  if (statuses.includes('pending')) return 'pending';
  if (statuses.includes('rejected')) return 'rejected';
  if (row.tier === 'verified' || row.tier === 'premium' || statuses.includes('approved')) return 'approved';
  return 'unverified';
}

const ManageUsers: React.FC<ManageUsersProps> = ({
  defaultRoleFilter = 'all',
  title,
  subtitle,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialKyc = (searchParams.get('kyc') as KycStatus | null) || 'all';

  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>(defaultRoleFilter);
  const [kycFilter, setKycFilter] = useState<string>(initialKyc);
  const [period, setPeriod] = useState<AdminPeriod>('all');
  const [sortField, setSortField] = useState<SortField>('joinedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(initialKyc !== 'all');
  const isDedicatedRole = Boolean(defaultRoleFilter && defaultRoleFilter !== 'all');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const rowsIntroduced = useRef(false);

  useEffect(() => {
    const qKyc = searchParams.get('kyc');
    if (qKyc) {
      setKycFilter(qKyc);
      setShowFilters(true);
      setPage(1);
    }
  }, [searchParams]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profilesRes, kycRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, name, phone, role, status, created_at, updated_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('user_kyc')
          .select('user_id, tier, identity_status, address_status, phone_status'),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const kycByUser = new Map<string, any>();
      (kycRes.data ?? []).forEach((k: any) => {
        kycByUser.set(k.user_id, k);
      });

      const enrichedUsers: RegisteredUser[] = (profilesRes.data ?? []).map((u: {
        id: string;
        email: string;
        name?: string | null;
        phone?: string | null;
        role?: string | null;
        status?: string | null;
        created_at: string;
        updated_at?: string | null;
      }) => ({
        id: u.id,
        name: u.name ?? 'Unknown',
        email: u.email,
        phone: u.phone ?? undefined,
        role: (u.role || 'user') as RegisteredUser['role'],
        status: (u.status || 'active') as RegisteredUser['status'],
        joinedAt: u.created_at,
        updatedAt: u.updated_at ?? undefined,
        kycStatus: deriveKycStatus(kycByUser.get(u.id)),
      }));
      setUsers(enrichedUsers);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = users.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (kycFilter !== 'all' && u.kycStatus !== kycFilter) return false;
      if (!matchesAdminPeriod(u.joinedAt, period)) return false;
      if (q) {
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.phone ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortField === 'joinedAt') {
        const diff = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
        return sortDir === 'asc' ? diff : -diff;
      }
      const av = String(a[sortField] ?? '').toLowerCase();
      const bv = String(b[sortField] ?? '').toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, search, statusFilter, roleFilter, kycFilter, period, sortField, sortDir]);

  useEffect(() => {
    if (!loading && filteredUsers.length > 0) rowsIntroduced.current = true;
  }, [loading, filteredUsers.length]);

  const pendingKycCount = useMemo(
    () => users.filter((u) => u.kycStatus === 'pending').length,
    [users]
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

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
    if (selected) next.add(userId); else next.delete(userId);
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
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update user'));
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
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to delete user'));
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
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, `Failed to ${action} users`));
    } finally {
      setProcessingAction(null);
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
    setActionMenuOpen(null);
    const targetUser = users.find((u) => u.id === userId);
    switch (action) {
      case 'view':
      case 'edit':
        navigate(`/users/${userId}`);
        break;
      case 'email':
        if (targetUser?.email) {
          window.location.href = `mailto:${targetUser.email}?subject=PixieKat%20Account%20Update`;
        } else {
          navigate('/messages/compose');
        }
        break;
      case 'suspend':
        await updateUserStatus(userId, 'suspended', 'User suspended', 'Suspended by admin');
        break;
      case 'delete':
        await deleteUser(userId);
        break;
    }
  };

  const handleExport = () => {
    exportToCsv(
      'users',
      ['ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'KYC Status', 'Joined'],
      filteredUsers.map((u) => [
        u.id,
        u.name,
        u.email,
        u.phone ?? '',
        u.role ?? 'user',
        u.status ?? 'active',
        u.kycStatus,
        u.joinedAt,
      ])
    );
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

  const getKycBadge = (kyc: KycStatus) => {
    switch (kyc) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-700';
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        variants={fadeUp}
        initial="initial"
        animate="animate"
        transition={{ duration: DURATION.base, ease: EASE_OUT }}
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
            <h1 className="text-2xl font-bold text-gray-900">{title || 'Manage Users'}</h1>
            <p className="text-gray-600 mt-1">
              {subtitle || 'View, edit, and manage all registered users'}
              {!loading && !error && (
                <span className="ml-2 text-primary-600 font-medium tabular-nums">
                  ({filteredUsers.length} shown)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
          {pendingKycCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setKycFilter(kycFilter === 'pending' ? 'all' : 'pending');
                setPage(1);
              }}
              className={clsx(
                'btn btn-sm flex items-center gap-1.5',
                kycFilter === 'pending' ? 'btn-primary' : 'btn-outline text-amber-700 border-amber-300 bg-amber-50'
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              Pending KYC ({pendingKycCount})
            </button>
          )}
          <button onClick={handleExport} disabled={!filteredUsers.length} className="btn btn-outline btn-md">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button onClick={fetchUsers} disabled={loading} className="btn btn-primary btn-md">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        variants={fadeUp}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.08, duration: DURATION.base, ease: EASE_OUT }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                className="input pl-10"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
              variants={expandCollapse}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: DURATION.base, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 mt-4 border-t border-gray-200">
                <div>
                  <label className="label mb-1.5 block">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="input"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
                <div>
                  <label className="label mb-1.5 block">Role</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                    className="input"
                    disabled={isDedicatedRole}
                  >
                    <option value="all">All Roles</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="reseller">Reseller</option>
                    <option value="support">Support</option>
                  </select>
                </div>
                <div>
                  <label className="label mb-1.5 block">KYC Status</label>
                  <select
                    value={kycFilter}
                    onChange={(e) => { setKycFilter(e.target.value); setPage(1); }}
                    className="input"
                  >
                    <option value="all">All KYC States</option>
                    <option value="pending">Pending Review</option>
                    <option value="approved">Approved / Verified</option>
                    <option value="rejected">Rejected</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>
                <div>
                  <label className="label mb-1.5 block">Joined Period</label>
                  <select
                    value={period}
                    onChange={(e) => { setPeriod(e.target.value as AdminPeriod); setPage(1); }}
                    className="input"
                  >
                    {ADMIN_PERIOD_OPTIONS.filter((p) => p.value !== 'custom').map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setRoleFilter(defaultRoleFilter);
                      setKycFilter('all');
                      setPeriod('all');
                      setSearch('');
                      setPage(1);
                    }}
                    className="btn btn-outline btn-md w-full"
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
      <AnimatePresence initial={false}>
        {selectedUsers.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
            transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-sm text-blue-700 font-medium tabular-nums">
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
        variants={fadeUp}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.14, duration: DURATION.base, ease: EASE_OUT }}
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
            {search || statusFilter !== 'all' || roleFilter !== 'all' || kycFilter !== 'all' || period !== 'all'
              ? 'No users match your filters.'
              : 'No registered users yet.'}
          </div>
        ) : (
          <>
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
                    {([
                      { label: 'User', field: 'name' as SortField },
                      { label: 'Role', field: 'role' as SortField },
                      { label: 'Status', field: 'status' as SortField },
                      { label: 'KYC', field: null },
                      { label: 'Joined', field: 'joinedAt' as SortField },
                      { label: 'Actions', field: null },
                    ]).map((col) => (
                      <th
                        key={col.label}
                        onClick={() => col.field && handleSort(col.field)}
                        className={clsx(
                          'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
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
                <tbody className="bg-white divide-y divide-gray-200">
                  {pageUsers.map((user, i) => (
                    <motion.tr
                      key={user.id}
                      initial={rowsIntroduced.current ? false : { opacity: 0, y: reduceMotion ? 0 : 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: staggerDelay(i, 0.028, 0.2), duration: DURATION.base, ease: EASE_OUT }}
                      className="hover:bg-gray-50 transition-colors"
                    >
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
                        <motion.span
                          key={user.role ?? 'user'}
                          variants={pop}
                          initial="initial"
                          animate="animate"
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(
                            user.role
                          )}`}
                        >
                          {user.role || 'user'}
                        </motion.span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <motion.span
                          key={user.status ?? 'active'}
                          variants={pop}
                          initial="initial"
                          animate="animate"
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                            user.status
                          )}`}
                        >
                          {user.status || 'active'}
                        </motion.span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/users/${user.id}`)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getKycBadge(
                            user.kycStatus
                          )}`}
                          title="Open user KYC details"
                        >
                          {user.kycStatus}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 tabular-nums">{formatDate(user.joinedAt)}</div>
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
                                  variants={pop}
                                  initial="initial"
                                  animate="animate"
                                  exit="exit"
                                  transition={{ duration: DURATION.fast, ease: EASE_OUT }}
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
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-500">
                <span className="tabular-nums">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length} users
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="p-1.5 rounded border bg-white disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="tabular-nums">Page {safePage} / {totalPages}</span>
                  <button
                    type="button"
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
      </motion.div>
    </div>
  );
};

export default ManageUsers;
