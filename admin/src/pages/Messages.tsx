import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Search, Mail, Clock, CheckCircle, CircleDot, RefreshCw,
  ExternalLink, Download, ChevronLeft, ChevronRight, Send, ShoppingCart, Save, StickyNote,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import { ADMIN_PERIOD_OPTIONS, AdminPeriod, exportToCsv, matchesAdminPeriod } from '../utils/dateRange';
import { DURATION, EASE_OUT, expandCollapse, fadeUp, pop, staggerDelay } from '../lib/motion';

interface SupportRequest {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  order_id: string | null;
  category: string | null;
  subject: string;
  message: string;
  source: 'support' | 'contact';
  status: 'new' | 'open' | 'resolved';
  created_at: string;
}

const STATUS_FILTERS = ['all', 'new', 'open', 'resolved'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];
const NOTES_KEY = 'pixiekat_ticket_notes_v1';
const PAGE_SIZE = 20;

const statusBadge = (status: SupportRequest['status']) => {
  if (status === 'new') return 'bg-red-100 text-red-800';
  if (status === 'open') return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
};

const categoryLabel: Record<string, string> = {
  order: 'Order Not Received',
  payment: 'Payment Failed',
  amount: 'Wrong Amount',
  account: 'Account Issues',
  other: 'Other',
};

function readTicketNotes(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSentOrHistory = location.pathname.endsWith('/sent') || location.pathname.endsWith('/history');

  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => (isSentOrHistory ? 'resolved' : 'all'));
  const [sourceFilter, setSourceFilter] = useState<'all' | 'support' | 'contact'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [period, setPeriod] = useState<AdminPeriod>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [notesById, setNotesById] = useState<Record<string, string>>(() => readTicketNotes());
  const reduceMotion = useReducedMotion();
  // Row entrance stagger runs once — filters afterwards swap instantly.
  const rowsIntroduced = useRef(false);

  useEffect(() => {
    if (location.pathname.endsWith('/sent') || location.pathname.endsWith('/history')) {
      setStatusFilter('resolved');
    } else if (location.pathname === '/messages' || location.pathname.endsWith('/received')) {
      setStatusFilter('all');
    }
    setPage(1);
  }, [location.pathname]);

  useEffect(() => {
    if (!loading && requests.length > 0) rowsIntroduced.current = true;
  }, [loading, requests.length]);

  const loadRequests = async () => {
    setLoading(true);
    setLoadError('');
    const { data, error } = await supabase
      .from('support_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      const missing =
        error.message.includes('support_requests') ||
        error.message.toLowerCase().includes('schema cache');
      setLoadError(
        missing
          ? 'The support_requests table is not in your Supabase project yet. Apply supabase/migrations/039_support_requests.sql first.'
          : error.message
      );
      setRequests([]);
    } else {
      setRequests((data as SupportRequest[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && r.source !== sourceFilter) return false;
      if (categoryFilter !== 'all' && (r.category || 'other') !== categoryFilter) return false;
      if (!matchesAdminPeriod(r.created_at, period, customStart, customEnd)) return false;
      if (location.pathname.endsWith('/sent') && !r.subject?.startsWith('[Outbound]')) {
        // If there are outbound messages, prefer them on /sent, otherwise show resolved
        const hasOutbound = requests.some((item) => item.subject?.startsWith('[Outbound]'));
        if (hasOutbound) return false;
      }
      if (!q) return true;
      return [r.name, r.email, r.subject, r.message, r.order_id ?? '', notesById[r.id] ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [requests, search, statusFilter, sourceFilter, categoryFilter, period, customStart, customEnd, location.pathname, notesById]);

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = { all: requests.length, new: 0, open: 0, resolved: 0 };
    for (const r of requests) base[r.status] += 1;
    return base;
  }, [requests]);

  const setStatus = async (id: string, status: SupportRequest['status']) => {
    setUpdating(id);
    const { error } = await supabase
      .from('support_requests')
      .update({ status })
      .eq('id', id);
    setUpdating(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(`Ticket marked ${status}`);
  };

  const saveTicketNote = (id: string, note: string) => {
    const next = { ...notesById, [id]: note };
    setNotesById(next);
    try {
      window.localStorage.setItem(NOTES_KEY, JSON.stringify(next));
      toast.success('Internal note saved');
    } catch {
      toast.error('Failed to save note');
    }
  };

  const handleExport = () => {
    exportToCsv(
      'support-messages',
      ['ID', 'Date', 'Name', 'Email', 'Source', 'Category', 'Order ID', 'Status', 'Subject', 'Message', 'Admin Note'],
      filtered.map((r) => [
        r.id,
        r.created_at,
        r.name,
        r.email,
        r.source,
        r.category ?? '',
        r.order_id ?? '',
        r.status,
        r.subject,
        r.message,
        notesById[r.id] ?? '',
      ])
    );
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <motion.div
        variants={fadeUp}
        initial="initial"
        animate="animate"
        transition={{ duration: DURATION.base, ease: EASE_OUT }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {location.pathname.endsWith('/sent')
              ? 'Sent & Resolved Messages'
              : location.pathname.endsWith('/history')
              ? 'Message History'
              : 'Messages'}
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Support tickets, contact form submissions, and outbound logs ({filtered.length} matching)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/messages/compose')}
            className="btn btn-primary btn-sm"
          >
            <Send className="w-4 h-4 mr-1.5" />
            Compose
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!filtered.length}
            className="btn btn-outline btn-sm"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </button>
          <button
            onClick={loadRequests}
            className="btn btn-outline btn-sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2">
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
            <input type="date" className="input mt-1 block" value={customStart} onChange={(e) => { setCustomStart(e.target.value); setPage(1); }} />
          </label>
          <label className="text-xs text-gray-500">
            End
            <input type="date" className="input mt-1 block" value={customEnd} onChange={(e) => { setCustomEnd(e.target.value); setPage(1); }} />
          </label>
        </div>
      )}

      <motion.div
        variants={fadeUp}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.08, duration: DURATION.base, ease: EASE_OUT }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, subject, order ID, or admin note..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input pl-10"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s} <span className="tabular-nums">({counts[s]})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value as typeof sourceFilter); setPage(1); }}
            className="input sm:w-44 text-sm"
          >
            <option value="all">All Sources</option>
            <option value="support">Support Ticket</option>
            <option value="contact">Contact Form</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="input sm:w-52 text-sm"
          >
            <option value="all">All Categories</option>
            {Object.entries(categoryLabel).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.14, duration: DURATION.base, ease: EASE_OUT }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      >
        {loadError ? (
          <div className="p-10 text-center text-sm text-amber-700">{loadError}</div>
        ) : loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Loading messages…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No messages match your filters.</div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {pageRows.map((r, i) => {
                const expanded = expandedId === r.id;
                const savedNote = notesById[r.id] ?? '';
                return (
                  <motion.div
                    key={r.id}
                    initial={rowsIntroduced.current ? false : { opacity: 0, y: reduceMotion ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: staggerDelay(i, 0.03, 0.2), duration: DURATION.base, ease: EASE_OUT }}
                    className="p-6 hover:bg-gray-50"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : r.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {r.subject || (r.category ? categoryLabel[r.category] ?? r.category : 'Support request')}
                            </h3>
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 uppercase tracking-wide">
                              {r.source === 'support' ? 'support' : 'contact'}
                            </span>
                            {r.category && (
                              <span className="text-xs px-2 py-0.5 rounded bg-primary-50 text-primary-700">
                                {categoryLabel[r.category] ?? r.category}
                              </span>
                            )}
                            {savedNote && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                                <StickyNote className="w-3 h-3" /> Note
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{r.message}</p>
                          <div className="flex flex-wrap items-center text-xs text-gray-500 mt-2 gap-x-2">
                            <span>{r.name}</span>
                            <span>•</span>
                            <span>{r.email}</span>
                            {r.order_id && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-primary-600">Order {r.order_id}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{new Date(r.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                        <motion.span
                          key={r.status}
                          variants={pop}
                          initial="initial"
                          animate="animate"
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusBadge(r.status)}`}
                        >
                          {r.status === 'new' && <CircleDot className="w-3 h-3 mr-1" />}
                          {r.status === 'open' && <Clock className="w-3 h-3 mr-1" />}
                          {r.status === 'resolved' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {r.status}
                        </motion.span>
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          variants={expandCollapse}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={{ duration: DURATION.base, ease: EASE_OUT }}
                          className="mt-4 rounded-lg bg-gray-50 border border-gray-100 p-4 overflow-hidden space-y-4"
                        >
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.message}</p>

                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={`mailto:${r.email}?subject=Re: ${encodeURIComponent(r.subject || 'Your PixieKat request')}`}
                              className="btn btn-outline btn-sm"
                            >
                              <Mail className="w-4 h-4 mr-1" />
                              Reply via email
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                            {r.order_id && (
                              <button
                                type="button"
                                onClick={() => navigate(`/orders?search=${encodeURIComponent(r.order_id!)}`)}
                                className="btn btn-outline btn-sm"
                              >
                                <ShoppingCart className="w-4 h-4 mr-1" />
                                View Order
                              </button>
                            )}
                            {r.status !== 'open' && (
                              <button
                                onClick={() => setStatus(r.id, 'open')}
                                disabled={updating === r.id}
                                className="btn btn-outline btn-sm"
                              >
                                Mark open
                              </button>
                            )}
                            {r.status !== 'resolved' && (
                              <button
                                onClick={() => setStatus(r.id, 'resolved')}
                                disabled={updating === r.id}
                                className="btn btn-primary btn-sm"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Resolve
                              </button>
                            )}
                            {r.status === 'resolved' && (
                              <button
                                onClick={() => setStatus(r.id, 'new')}
                                disabled={updating === r.id}
                                className="btn btn-outline btn-sm"
                              >
                                Reopen
                              </button>
                            )}
                          </div>

                          {/* Internal Admin Note */}
                          <div className="pt-3 border-t border-gray-200">
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">
                              Internal Admin Triage Note
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                defaultValue={savedNote}
                                id={`note-${r.id}`}
                                placeholder="Add internal note (e.g., refunded via wallet, waiting on supplier)..."
                                className="input text-xs py-1.5 flex-1 bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const el = document.getElementById(`note-${r.id}`) as HTMLInputElement | null;
                                  saveTicketNote(r.id, el?.value.trim() ?? '');
                                }}
                                className="btn btn-outline btn-sm shrink-0"
                              >
                                <Save className="w-3.5 h-3.5 mr-1" />
                                Save Note
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-500">
                <span className="tabular-nums">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} messages
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
      </motion.div>
    </div>
  );
};

export default Messages;
