import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Activity, AlertCircle, ChevronLeft, ChevronRight, Download, RefreshCw, Search, X } from 'lucide-react';
import clsx from 'clsx';
import { useAdminReport } from '../hooks/useAdminReport';
import { ADMIN_PERIOD_OPTIONS, AdminPeriod, exportToCsv, matchesAdminPeriod } from '../utils/dateRange';
import { DURATION, EASE_OUT, pop, staggerDelay } from '../lib/motion';

const PAGE_SIZE = 25;

const ActivityLogs: React.FC = () => {
  const { data, loading, error, refresh } = useAdminReport();
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user' | 'reseller' | 'system'>('all');
  const [period, setPeriod] = useState<AdminPeriod>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [page, setPage] = useState(1);
  const reduceMotion = useReducedMotion();
  // Row entrance stagger runs once — filter/search changes afterwards swap instantly.
  const rowsIntroduced = useRef(false);

  useEffect(() => {
    if (data && data.activities.length > 0) rowsIntroduced.current = true;
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    const profiles = new Map(data.profiles.map((profile) => [profile.id, profile]));
    const term = search.trim().toLowerCase();
    return data.activities
      .map((item) => {
        const actor = item.actor_id ? profiles.get(item.actor_id) : undefined;
        const user = profiles.get(item.user_id);
        return { ...item, actor, user };
      })
      .filter((item) => {
        if (action !== 'all' && item.action !== action) return false;
        if (!matchesAdminPeriod(item.created_at, period, customStart, customEnd)) return false;
        if (roleFilter === 'system' && item.actor_id) return false;
        if (roleFilter !== 'all' && roleFilter !== 'system') {
          const effectiveRole = item.actor?.role || item.user?.role || 'user';
          if (effectiveRole !== roleFilter) return false;
        }
        return (
          !term ||
          [
            item.action,
            item.description || '',
            item.ip_address || '',
            item.actor?.name || '',
            item.actor?.email || '',
            item.user?.name || '',
            item.user?.email || '',
          ].some((value) => value.toLowerCase().includes(term))
        );
      });
  }, [action, roleFilter, period, customStart, customEnd, data, search]);

  if (loading && !data) {
    return (
      <div className="py-24 text-center text-gray-400">
        <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3" />
        Loading activity...
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

  const actions = [...new Set(data.activities.map((item) => item.action))].sort();
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasActiveFilters = search !== '' || action !== 'all' || roleFilter !== 'all' || period !== 'all';

  const handleExport = () => {
    exportToCsv(
      `activity-${period}`,
      ['Timestamp', 'Actor', 'Actor Role', 'Customer', 'Action', 'Description', 'IP'],
      rows.map((item) => [
        item.created_at,
        item.actor?.email || 'System',
        item.actor?.role || (item.actor_id ? 'user' : 'system'),
        item.user?.email || item.user_id,
        item.action,
        item.description || '',
        item.ip_address || '',
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className="w-7 h-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold">Activity Logs</h1>
            <p className="text-sm text-gray-500 tabular-nums">
              {rows.length} matching of {data.activities.length} real events from user_activity_log
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="btn btn-outline btn-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleExport} disabled={!rows.length} className="btn btn-outline btn-sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Period Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {ADMIN_PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { setPeriod(opt.value); setPage(1); }}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              period === opt.value
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
          <label className="text-xs text-gray-500">
            Start
            <input
              type="date"
              className="input mt-1 block"
              value={customStart}
              onChange={(e) => { setCustomStart(e.target.value); setPage(1); }}
            />
          </label>
          <label className="text-xs text-gray-500">
            End
            <input
              type="date"
              className="input mt-1 block"
              value={customEnd}
              onChange={(e) => { setCustomEnd(e.target.value); setPage(1); }}
            />
          </label>
        </div>
      )}

      {/* Search & Dropdown Filters */}
      <div className="bg-white border rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            className="input pl-10 w-full"
            placeholder="Search people, actions, descriptions or IP..."
          />
        </div>
        <select
          value={action}
          onChange={(event) => { setAction(event.target.value); setPage(1); }}
          className="input sm:w-52"
        >
          <option value="all">All actions</option>
          {actions.map((item) => (
            <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(event) => { setRoleFilter(event.target.value as typeof roleFilter); setPage(1); }}
          className="input sm:w-44"
        >
          <option value="all">All Actor Roles</option>
          <option value="admin">Admins</option>
          <option value="user">Customers</option>
          <option value="reseller">Resellers</option>
          <option value="system">System Events</option>
        </select>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setAction('all');
              setRoleFilter('all');
              setPeriod('all');
              setCustomStart('');
              setCustomEnd('');
              setPage(1);
            }}
            className="btn btn-outline btn-sm shrink-0"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </button>
        )}
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-12 text-center text-sm text-gray-400">No recorded activity matches these filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Time', 'Actor', 'Customer', 'Action', 'Description', 'IP'].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left text-xs uppercase text-gray-500">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pageRows.map((row, i) => (
                    <motion.tr
                      key={row.id}
                      initial={rowsIntroduced.current ? false : { opacity: 0, y: reduceMotion ? 0 : 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: staggerDelay(i, 0.02, 0.18), duration: DURATION.base, ease: EASE_OUT }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-xs whitespace-nowrap tabular-nums">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{row.actor?.name || 'System'}</p>
                        <p className="text-xs text-gray-500">{row.actor?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{row.user?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{row.user?.email || row.user_id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <motion.span
                          key={row.action}
                          variants={pop}
                          initial="initial"
                          animate="animate"
                          className="px-2 py-1 rounded bg-primary-50 text-primary-700 text-xs capitalize inline-block"
                        >
                          {row.action.replace(/_/g, ' ')}
                        </motion.span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-sm">
                        {row.description || 'No description'}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500 tabular-nums">
                        {row.ip_address || '-'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-500">
                <span className="tabular-nums">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, rows.length)} of {rows.length} events
                </span>
                <div className="flex items-center gap-2">
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
      </div>
    </div>
  );
};

export default ActivityLogs;
