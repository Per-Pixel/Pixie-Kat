import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, Users, User, X, Search, Mail, ExternalLink, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface Recipient {
  id: string;
  name: string;
  email: string;
  type: 'user' | 'group';
  role?: string;
}

const GROUP_RECIPIENTS: Recipient[] = [
  { id: 'group-all-users', name: 'All Active Customers', email: 'group:user', type: 'group' },
  { id: 'group-resellers', name: 'All Resellers / Brokers', email: 'group:reseller', type: 'group' },
];

const DRAFT_KEY = 'pixiekat_compose_draft_v1';

const Compose: React.FC = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Recipient[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [category, setCategory] = useState<'order' | 'payment' | 'account' | 'other'>('other');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.subject) setSubject(parsed.subject);
        if (parsed.message) setMessage(parsed.message);
        if (Array.isArray(parsed.recipients)) setRecipients(parsed.recipients);
      }
    } catch {
      // ignore draft parse errors
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoadingProfiles(true);
    supabase
      .from('profiles')
      .select('id, name, email, role, status')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!mounted) return;
        const loaded: Recipient[] = (data ?? [])
          .filter((p: any) => p.email)
          .map((p: any) => ({
            id: p.id,
            name: p.name || p.email.split('@')[0],
            email: p.email,
            type: 'user' as const,
            role: p.role || 'user',
          }));
        setProfiles(loaded);
        setLoadingProfiles(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const availableOptions = useMemo(() => {
    const q = recipientQuery.trim().toLowerCase();
    const all = [...GROUP_RECIPIENTS, ...profiles].filter(
      (opt) => !recipients.some((selected) => selected.id === opt.id)
    );
    if (!q) return all.slice(0, 15);
    return all
      .filter((opt) => `${opt.name} ${opt.email} ${opt.role ?? ''}`.toLowerCase().includes(q))
      .slice(0, 15);
  }, [profiles, recipients, recipientQuery]);

  const resolvedEmails = useMemo(() => {
    const emails = new Set<string>();
    recipients.forEach((r) => {
      if (r.type === 'user' && r.email) {
        emails.add(r.email);
      } else if (r.id === 'group-all-users') {
        profiles.filter((p) => p.role === 'user').forEach((p) => emails.add(p.email));
      } else if (r.id === 'group-resellers') {
        profiles.filter((p) => p.role === 'reseller').forEach((p) => emails.add(p.email));
      }
    });
    return [...emails];
  }, [recipients, profiles]);

  const addRecipient = (recipient: Recipient) => {
    if (!recipients.find((r) => r.id === recipient.id)) {
      setRecipients([...recipients, recipient]);
    }
    setRecipientQuery('');
    setShowRecipientDropdown(false);
  };

  const removeRecipient = (recipientId: string) => {
    setRecipients(recipients.filter((r) => r.id !== recipientId));
  };

  const handleSaveDraft = () => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ recipients, subject, message }));
      toast.success('Draft saved locally');
    } catch {
      toast.error('Could not save draft');
    }
  };

  const handleSend = async (openMailClient = false) => {
    if (recipients.length === 0 || !subject.trim() || !message.trim()) {
      toast.error('Please select at least one recipient and fill in subject & message');
      return;
    }

    setSending(true);
    try {
      const primaryTarget = recipients[0];
      const { error } = await supabase.from('support_requests').insert({
        user_id: primaryTarget.type === 'user' ? primaryTarget.id : null,
        name: primaryTarget.name,
        email: resolvedEmails[0] || primaryTarget.email,
        category,
        subject: `[Outbound] ${subject.trim()}`,
        message: message.trim(),
        source: 'support',
        status: 'resolved',
      });

      if (error && !error.message.includes('support_requests')) {
        toast.error(error.message);
        setSending(false);
        return;
      }

      if (openMailClient && resolvedEmails.length > 0) {
        const bcc = resolvedEmails.slice(0, 40).join(',');
        window.location.href = `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(
          subject.trim()
        )}&body=${encodeURIComponent(message.trim())}`;
      }

      window.localStorage.removeItem(DRAFT_KEY);
      toast.success(`Logged outbound message for ${resolvedEmails.length || recipients.length} recipient(s)`);
      setRecipients([]);
      setSubject('');
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center">
          <Send className="w-8 h-8 text-primary-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compose Message</h1>
            <p className="text-gray-600 text-sm">Send and log outbound support messages to real customer accounts</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/messages')}
          className="btn btn-outline btn-sm self-start sm:self-auto"
        >
          ← Back to Inbox
        </button>
      </motion.div>

      {/* Compose Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="space-y-6">
          {/* Recipients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Recipients *
              </label>
              <span className="text-xs text-gray-400 tabular-nums">
                {loadingProfiles ? 'Loading directory…' : `${profiles.length} active accounts loaded · ${resolvedEmails.length} resolved email(s)`}
              </span>
            </div>
            <div className="space-y-3">
              {recipients.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {recipients.map((recipient) => (
                    <span
                      key={recipient.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                    >
                      {recipient.type === 'group' ? (
                        <Users className="w-3.5 h-3.5 mr-1.5" />
                      ) : (
                        <User className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      <span>{recipient.name}</span>
                      {recipient.type === 'user' && (
                        <span className="ml-1.5 text-xs text-primary-600">({recipient.email})</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeRecipient(recipient.id)}
                        className="ml-2 text-primary-600 hover:text-primary-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search & Select Recipients */}
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={recipientQuery}
                    onFocus={() => setShowRecipientDropdown(true)}
                    onChange={(e) => {
                      setRecipientQuery(e.target.value);
                      setShowRecipientDropdown(true);
                    }}
                    placeholder="Search customers by name or email, or pick a group..."
                    className="input pl-10 w-full"
                  />
                </div>

                {showRecipientDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {availableOptions.length === 0 ? (
                      <div className="p-4 text-sm text-gray-400 text-center">No matching users found.</div>
                    ) : (
                      availableOptions.map((recipient) => (
                        <button
                          key={recipient.id}
                          type="button"
                          onClick={() => addRecipient(recipient)}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center justify-between"
                        >
                          <div className="flex items-center min-w-0">
                            {recipient.type === 'group' ? (
                              <Users className="w-4 h-4 mr-2.5 text-primary-600 shrink-0" />
                            ) : (
                              <User className="w-4 h-4 mr-2.5 text-gray-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{recipient.name}</div>
                              <div className="text-xs text-gray-500 truncate">{recipient.email}</div>
                            </div>
                          </div>
                          {recipient.role && (
                            <span className="text-[11px] uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {recipient.role}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input w-full"
                placeholder="Order update, account verification, or announcement..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className="input w-full"
              >
                <option value="order">Order Support</option>
                <option value="payment">Payment / Wallet</option>
                <option value="account">Account Issue</option>
                <option value="other">General / Announcement</option>
              </select>
            </div>
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              id="message"
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input w-full py-2.5 min-h-[180px]"
              placeholder="Write your message here..."
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="btn btn-outline btn-md"
            >
              Save Draft
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={sending}
                onClick={() => void handleSend(true)}
                className="btn btn-outline btn-md flex items-center"
              >
                <Mail className="w-4 h-4 mr-2" />
                Log &amp; Open Email Client
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => void handleSend(false)}
                className="btn btn-primary btn-md flex items-center"
              >
                {sending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Log &amp; Send Message
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Compose;
