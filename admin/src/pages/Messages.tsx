import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Mail, Clock, CheckCircle, CircleDot, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

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

const Messages: React.FC = () => {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    setLoadError('');
    const { data, error } = await supabase
      .from('support_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

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
      if (!q) return true;
      return [r.name, r.email, r.subject, r.message, r.order_id ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [requests, search, statusFilter]);

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
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-1">Support tickets and contact form submissions</p>
        </div>
        <button
          onClick={loadRequests}
          className="mt-4 sm:mt-0 btn btn-outline btn-md"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, subject, or order ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s} ({counts[s]})
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200"
      >
        {loadError ? (
          <div className="p-10 text-center text-sm text-amber-700">{loadError}</div>
        ) : loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Loading messages…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No messages found.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filtered.map((r) => {
              const expanded = expandedId === r.id;
              return (
                <div key={r.id} className="p-6 hover:bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : r.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {r.subject || (r.category ? categoryLabel[r.category] ?? r.category : 'Support request')}
                          </h3>
                          <span className="text-xs text-gray-400 uppercase tracking-wide">
                            {r.source === 'support' ? 'support' : 'contact'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{r.message}</p>
                        <div className="flex flex-wrap items-center text-xs text-gray-500 mt-2 gap-x-2">
                          <span>{r.name}</span>
                          <span>•</span>
                          <span>{r.email}</span>
                          {r.order_id && (
                            <>
                              <span>•</span>
                              <span>Order {r.order_id}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{new Date(r.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusBadge(r.status)}`}
                      >
                        {r.status === 'new' && <CircleDot className="w-3 h-3 mr-1" />}
                        {r.status === 'open' && <Clock className="w-3 h-3 mr-1" />}
                        {r.status === 'resolved' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {r.status}
                      </span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 p-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.message}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <a
                          href={`mailto:${r.email}?subject=Re: ${encodeURIComponent(r.subject || 'Your PixieKat request')}`}
                          className="btn btn-outline btn-sm"
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          Reply via email
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Messages;
