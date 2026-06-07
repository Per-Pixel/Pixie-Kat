import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardList, Search, Filter, Download, ChevronDown,
  ChevronLeft, ChevronRight, Shield, User, Package,
  ShoppingCart, Settings, Eye, Trash2, Edit, LogIn,
  LogOut, Plus, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';

type LogAction =
  | 'login' | 'logout' | 'create_product' | 'update_product' | 'delete_product'
  | 'update_order' | 'view_order' | 'suspend_user' | 'delete_user' | 'update_settings'
  | 'export_data' | 'create_game' | 'update_game';

interface ActivityLog {
  id: string;
  admin: string;
  adminEmail: string;
  adminRole: 'super_admin' | 'admin' | 'support';
  action: LogAction;
  target: string;
  targetType: 'order' | 'user' | 'product' | 'game' | 'settings' | 'system';
  details: string;
  ip: string;
  timestamp: string;
  timeAgo: string;
  status: 'success' | 'failed';
}

const mockLogs: ActivityLog[] = [
  { id: '1', admin: 'Super Admin', adminEmail: 'admin@pixiekat.com', adminRole: 'super_admin', action: 'update_order', target: '#PK-3841', targetType: 'order', details: 'Status changed from pending to completed', ip: '192.168.1.1', timestamp: '2026-06-07T09:02:00Z', timeAgo: '3m ago', status: 'success' },
  { id: '2', admin: 'Super Admin', adminEmail: 'admin@pixiekat.com', adminRole: 'super_admin', action: 'login', target: 'Admin Panel', targetType: 'system', details: 'Logged in from Chrome on Windows', ip: '192.168.1.1', timestamp: '2026-06-07T09:00:00Z', timeAgo: '5m ago', status: 'success' },
  { id: '3', admin: 'Support Agent', adminEmail: 'support@pixiekat.com', adminRole: 'support', action: 'view_order', target: '#PK-3840', targetType: 'order', details: 'Viewed order details', ip: '10.0.0.22', timestamp: '2026-06-07T08:55:00Z', timeAgo: '10m ago', status: 'success' },
  { id: '4', admin: 'Super Admin', adminEmail: 'admin@pixiekat.com', adminRole: 'super_admin', action: 'suspend_user', target: 'reza@example.com', targetType: 'user', details: 'Account suspended: Suspicious activity detected', ip: '192.168.1.1', timestamp: '2026-06-07T08:40:00Z', timeAgo: '25m ago', status: 'success' },
  { id: '5', admin: 'Super Admin', adminEmail: 'admin@pixiekat.com', adminRole: 'super_admin', action: 'create_game', target: 'Honkai Star Rail', targetType: 'game', details: 'New game created with 12 packages', ip: '192.168.1.1', timestamp: '2026-06-07T08:30:00Z', timeAgo: '35m ago', status: 'success' },
  { id: '6', admin: 'Support Agent', adminEmail: 'support@pixiekat.com', adminRole: 'support', action: 'delete_user', target: 'spam123@mail.com', targetType: 'user', details: 'Failed — insufficient permissions', ip: '10.0.0.22', timestamp: '2026-06-07T08:20:00Z', timeAgo: '45m ago', status: 'failed' },
  { id: '7', admin: 'Super Admin', adminEmail: 'admin@pixiekat.com', adminRole: 'super_admin', action: 'update_settings', target: 'Payment Settings', targetType: 'settings', details: 'PayPal gateway enabled', ip: '192.168.1.1', timestamp: '2026-06-07T07:50:00Z', timeAgo: '1h ago', status: 'success' },
  { id: '8', admin: 'Super Admin', adminEmail: 'admin@pixiekat.com', adminRole: 'super_admin', action: 'export_data', target: 'Orders Export', targetType: 'order', details: 'Exported 500 orders as CSV', ip: '192.168.1.1', timestamp: '2026-06-07T07:30:00Z', timeAgo: '1.5h ago', status: 'success' },
  { id: '9', admin: 'Support Agent', adminEmail: 'support@pixiekat.com', adminRole: 'support', action: 'update_order', target: '#PK-3825', targetType: 'order', details: 'Status changed from processing to completed', ip: '10.0.0.22', timestamp: '2026-06-07T07:10:00Z', timeAgo: '2h ago', status: 'success' },
  { id: '10', admin: 'Super Admin', adminEmail: 'admin@pixiekat.com', adminRole: 'super_admin', action: 'create_product', target: 'PUBG UC 60', targetType: 'product', details: 'New product package created under PUBG Mobile', ip: '192.168.1.1', timestamp: '2026-06-07T06:40:00Z', timeAgo: '2.5h ago', status: 'success' },
  { id: '11', admin: 'Super Admin', adminEmail: 'admin@pixiekat.com', adminRole: 'super_admin', action: 'update_game', target: 'Free Fire', targetType: 'game', details: 'Banner image updated, 3 packages modified', ip: '192.168.1.1', timestamp: '2026-06-07T05:20:00Z', timeAgo: '4h ago', status: 'success' },
  { id: '12', admin: 'Support Agent', adminEmail: 'support@pixiekat.com', adminRole: 'support', action: 'login', target: 'Admin Panel', targetType: 'system', details: 'Logged in from Firefox on Mac', ip: '10.0.0.22', timestamp: '2026-06-07T05:00:00Z', timeAgo: '4h ago', status: 'success' },
  { id: '13', admin: 'Super Admin', adminEmail: 'admin@pixiekat.com', adminRole: 'super_admin', action: 'delete_product', target: 'ML 10 Diamonds (Legacy)', targetType: 'product', details: 'Product removed: discontinued item', ip: '192.168.1.1', timestamp: '2026-06-06T20:00:00Z', timeAgo: '13h ago', status: 'success' },
  { id: '14', admin: 'Super Admin', adminEmail: 'admin@pixiekat.com', adminRole: 'super_admin', action: 'logout', target: 'Admin Panel', targetType: 'system', details: 'Session ended', ip: '192.168.1.1', timestamp: '2026-06-06T18:00:00Z', timeAgo: '15h ago', status: 'success' },
  { id: '15', admin: 'Support Agent', adminEmail: 'support@pixiekat.com', adminRole: 'support', action: 'logout', target: 'Admin Panel', targetType: 'system', details: 'Session ended', ip: '10.0.0.22', timestamp: '2026-06-06T17:30:00Z', timeAgo: '16h ago', status: 'success' },
];

const actionConfig: Record<LogAction, { label: string; icon: React.ComponentType<any>; color: string; bg: string }> = {
  login: { label: 'Login', icon: LogIn, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  logout: { label: 'Logout', icon: LogOut, color: 'text-gray-600', bg: 'bg-gray-50' },
  create_product: { label: 'Create Product', icon: Plus, color: 'text-blue-700', bg: 'bg-blue-50' },
  update_product: { label: 'Update Product', icon: Edit, color: 'text-blue-700', bg: 'bg-blue-50' },
  delete_product: { label: 'Delete Product', icon: Trash2, color: 'text-red-700', bg: 'bg-red-50' },
  update_order: { label: 'Update Order', icon: ShoppingCart, color: 'text-amber-700', bg: 'bg-amber-50' },
  view_order: { label: 'View Order', icon: Eye, color: 'text-gray-600', bg: 'bg-gray-50' },
  suspend_user: { label: 'Suspend User', icon: Shield, color: 'text-orange-700', bg: 'bg-orange-50' },
  delete_user: { label: 'Delete User', icon: Trash2, color: 'text-red-700', bg: 'bg-red-50' },
  update_settings: { label: 'Update Settings', icon: Settings, color: 'text-purple-700', bg: 'bg-purple-50' },
  export_data: { label: 'Export Data', icon: Download, color: 'text-indigo-700', bg: 'bg-indigo-50' },
  create_game: { label: 'Create Game', icon: Plus, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  update_game: { label: 'Update Game', icon: Edit, color: 'text-blue-700', bg: 'bg-blue-50' },
};

const roleConfig: Record<ActivityLog['adminRole'], { label: string; badge: string }> = {
  super_admin: { label: 'Super Admin', badge: 'bg-purple-100 text-purple-800' },
  admin: { label: 'Admin', badge: 'bg-blue-100 text-blue-800' },
  support: { label: 'Support', badge: 'bg-gray-100 text-gray-700' },
};

const PAGE_SIZE = 10;

function downloadCsv(logs: ActivityLog[]) {
  const rows = [
    ['Timestamp', 'Admin', 'Email', 'Role', 'Action', 'Target', 'Details', 'IP', 'Status'],
    ...logs.map((l) => [l.timestamp, l.admin, l.adminEmail, l.adminRole, l.action, l.target, l.details, l.ip, l.status]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
  URL.revokeObjectURL(url);
}

const ActivityLogs: React.FC = () => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | LogAction>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | ActivityLog['adminRole']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return mockLogs.filter((l) => {
      if (actionFilter !== 'all' && l.action !== actionFilter) return false;
      if (roleFilter !== 'all' && l.adminRole !== roleFilter) return false;
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (term && ![l.admin, l.adminEmail, l.action, l.target, l.details, l.ip].some((v) => v.toLowerCase().includes(term))) return false;
      return true;
    });
  }, [search, actionFilter, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const formatTs = (ts: string) =>
    new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
            <p className="text-sm text-gray-500">Full admin audit trail — {mockLogs.length} events tracked</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx('btn btn-outline btn-sm', showFilters && 'bg-primary-50 border-primary-300 text-primary-700')}
          >
            <Filter className="w-4 h-4 mr-1.5" />Filters
            <ChevronDown className={clsx('w-4 h-4 ml-1 transition-transform', showFilters && 'rotate-180')} />
          </button>
          <button onClick={() => downloadCsv(filtered)} className="btn btn-outline btn-sm" disabled={!filtered.length}>
            <Download className="w-4 h-4 mr-1.5" />Export
          </button>
        </div>
      </motion.div>

      {/* Search & Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search admin, email, action, target, IP..." className="input pl-10 w-full" />
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100">
            <div>
              <label className="label mb-1.5 block text-xs">Action Type</label>
              <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value as any); setPage(1); }} className="input capitalize">
                <option value="all">All Actions</option>
                {(Object.keys(actionConfig) as LogAction[]).map((a) => (
                  <option key={a} value={a}>{actionConfig[a].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label mb-1.5 block text-xs">Admin Role</label>
              <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as any); setPage(1); }} className="input">
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="support">Support</option>
              </select>
            </div>
            <div>
              <label className="label mb-1.5 block text-xs">Status</label>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }} className="input">
                <option value="all">All</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        )}
      </motion.div>

      {/* Logs Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm">No log entries match your filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Time', 'Admin', 'Action', 'Target', 'Details', 'IP Address', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((log, i) => {
                    const actionCfg = actionConfig[log.action];
                    const roleCfg = roleConfig[log.adminRole];
                    const ActionIcon = actionCfg.icon;
                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="text-xs font-medium text-gray-900">{formatTs(log.timestamp)}</p>
                          <p className="text-xs text-gray-400">{log.timeAgo}</p>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                              <User className="w-3.5 h-3.5 text-primary-600" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-900">{log.admin}</p>
                              <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-medium', roleCfg.badge)}>{roleCfg.label}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium', actionCfg.bg, actionCfg.color)}>
                            <ActionIcon className="w-3.5 h-3.5" />
                            {actionCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700 font-medium">{log.target}</td>
                        <td className="px-4 py-3.5 max-w-xs">
                          <p className="text-xs text-gray-500 truncate">{log.details}</p>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <code className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{log.ip}</code>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                            {log.status}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} events
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors">
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
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ActivityLogs;
