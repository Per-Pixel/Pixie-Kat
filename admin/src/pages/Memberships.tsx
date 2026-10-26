import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BadgePercent, ChevronLeft, ChevronRight, Crown, Download,
  Plus, RefreshCw, Save, Search, UserPlus, X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAdminCurrency } from '../lib/currency';
import { exportToCsv } from '../utils/dateRange';
import { DURATION, EASE_OUT, fadeUp, pop, pressScale, staggerDelay } from '../lib/motion';

interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  discount_percent: number | string;
  price: number | string;
  currency: string;
  duration_days: number;
  benefits: string[];
  is_active: boolean;
  sort_order: number;
}

interface UserMembership {
  id: string;
  user_id: string;
  plan_id?: string;
  status: string;
  started_at: string;
  expires_at: string;
  membership_plans?: { name: string; discount_percent: number | string } | Array<{ name: string; discount_percent: number | string }> | null;
  profiles?: { name: string; email: string } | Array<{ name: string; email: string }> | null;
}

const emptyPlan: Omit<MembershipPlan, 'id'> = {
  name: '',
  slug: '',
  description: '',
  discount_percent: 0,
  price: 0,
  currency: 'INR',
  duration_days: 30,
  benefits: [],
  is_active: true,
  sort_order: 0,
};

const PAGE_SIZE = 15;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function firstJoined<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const Memberships: React.FC = () => {
  const { formatMoney } = useAdminCurrency();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [selectedId, setSelectedId] = useState<string | 'new'>('new');
  const [form, setForm] = useState(emptyPlan);
  const [benefitsText, setBenefitsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // User memberships filters
  const [memberSearch, setMemberSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'cancelled'>('all');
  const [memberPage, setMemberPage] = useState(1);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  // Grant membership inline drawer
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantPlanId, setGrantPlanId] = useState('');
  const [granting, setGranting] = useState(false);

  const reduceMotion = useReducedMotion();
  const rowsIntroduced = useRef(false);

  useEffect(() => {
    if (!loading) rowsIntroduced.current = true;
  }, [loading]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedId) ?? null,
    [plans, selectedId]
  );

  const activeCount = useMemo(
    () => memberships.filter((membership) => membership.status === 'active' && new Date(membership.expires_at) > new Date()).length,
    [memberships]
  );

  const isMissingTable = (msg?: string) =>
    !!msg && (msg.includes('membership_plans') || msg.toLowerCase().includes('schema cache') || msg.toLowerCase().includes('does not exist'));

  const loadData = async () => {
    setLoading(true);

    const [plansRes, membershipsRes] = await Promise.all([
      supabase
        .from('membership_plans')
        .select('*')
        .order('sort_order', { ascending: true }),
      supabase
        .from('user_memberships')
        .select('id, user_id, plan_id, status, started_at, expires_at, membership_plans(name, discount_percent), profiles:user_id(name, email)')
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    if (plansRes.error) {
      if (!isMissingTable(plansRes.error.message)) toast.error(plansRes.error.message);
      setPlans([]);
    } else {
      const loadedPlans = (plansRes.data as MembershipPlan[]) ?? [];
      setPlans(loadedPlans);
      if (!grantPlanId && loadedPlans[0]) setGrantPlanId(loadedPlans[0].id);
    }

    if (!membershipsRes.error) {
      setMemberships((membershipsRes.data as unknown as UserMembership[]) ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedPlan) {
      setForm(emptyPlan);
      setBenefitsText('');
      return;
    }

    setForm({
      name: selectedPlan.name,
      slug: selectedPlan.slug,
      description: selectedPlan.description ?? '',
      discount_percent: selectedPlan.discount_percent,
      price: selectedPlan.price,
      currency: selectedPlan.currency,
      duration_days: selectedPlan.duration_days,
      benefits: selectedPlan.benefits ?? [],
      is_active: selectedPlan.is_active,
      sort_order: selectedPlan.sort_order,
    });
    setBenefitsText((selectedPlan.benefits ?? []).join('\n'));
  }, [selectedPlan]);

  const updateForm = (key: keyof typeof form, value: string | number | boolean) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'name' && !selectedPlan ? { slug: slugify(String(value)) } : {}),
    }));
  };

  const savePlan = async () => {
    if (!form.name.trim()) {
      toast.error('Plan name is required');
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      slug: slugify(form.slug || form.name),
      description: form.description?.trim() || null,
      discount_percent: Number(form.discount_percent),
      price: Number(form.price),
      duration_days: Number(form.duration_days),
      sort_order: Number(form.sort_order),
      benefits: benefitsText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    };

    setSaving(true);
    const result = selectedPlan
      ? await supabase.from('membership_plans').update(payload).eq('id', selectedPlan.id)
      : await supabase.from('membership_plans').insert(payload);
    setSaving(false);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success(selectedPlan ? 'Membership plan updated' : 'Membership plan created');
    setSelectedId('new');
    await loadData();
  };

  const filteredMemberships = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    const now = new Date();
    return memberships.filter((m) => {
      const profile = firstJoined(m.profiles);
      const plan = firstJoined(m.membership_plans);
      const isExpired = new Date(m.expires_at) <= now || m.status === 'expired';
      const effectiveStatus = m.status === 'cancelled' ? 'cancelled' : isExpired ? 'expired' : 'active';

      if (statusFilter !== 'all' && effectiveStatus !== statusFilter) return false;
      if (planFilter !== 'all' && (plan?.name ?? '') !== planFilter) return false;
      if (q && !`${profile?.name ?? ''} ${profile?.email ?? ''} ${m.user_id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [memberships, memberSearch, statusFilter, planFilter]);

  const handleExtend30d = async (membership: UserMembership) => {
    setUpdatingMemberId(membership.id);
    const base = new Date(membership.expires_at) > new Date() ? new Date(membership.expires_at) : new Date();
    base.setDate(base.getDate() + 30);
    const { error } = await supabase
      .from('user_memberships')
      .update({ expires_at: base.toISOString(), status: 'active' })
      .eq('id', membership.id);
    setUpdatingMemberId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Extended membership by 30 days');
    await loadData();
  };

  const handleToggleCancel = async (membership: UserMembership) => {
    setUpdatingMemberId(membership.id);
    const nextStatus = membership.status === 'cancelled' ? 'active' : 'cancelled';
    const { error } = await supabase
      .from('user_memberships')
      .update({ status: nextStatus })
      .eq('id', membership.id);
    setUpdatingMemberId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(nextStatus === 'cancelled' ? 'Membership cancelled' : 'Membership reactivated');
    await loadData();
  };

  const handleGrantMembership = async () => {
    const email = grantEmail.trim().toLowerCase();
    const plan = plans.find((p) => p.id === grantPlanId);
    if (!email || !plan) {
      toast.error('Enter a customer email and select a plan');
      return;
    }
    setGranting(true);
    try {
      const { data: userRow, error: userErr } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', email)
        .maybeSingle();
      if (userErr || !userRow) {
        toast.error('No customer found with that email');
        return;
      }
      const now = new Date();
      const expires = new Date(now.getTime() + Number(plan.duration_days || 30) * 86_400_000);
      const { error: insErr } = await supabase.from('user_memberships').insert({
        user_id: userRow.id,
        plan_id: plan.id,
        status: 'active',
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
      });
      if (insErr) {
        toast.error(insErr.message);
        return;
      }
      toast.success(`Granted ${plan.name} to ${userRow.email}`);
      setGrantEmail('');
      setGrantOpen(false);
      await loadData();
    } finally {
      setGranting(false);
    }
  };

  const handleExportMemberships = () => {
    exportToCsv(
      'user-memberships',
      ['User', 'Email', 'Plan', 'Status', 'Started', 'Expires'],
      filteredMemberships.map((m) => {
        const prof = firstJoined(m.profiles);
        const plan = firstJoined(m.membership_plans);
        return [
          prof?.name ?? m.user_id,
          prof?.email ?? '',
          plan?.name ?? 'Deleted plan',
          m.status,
          m.started_at,
          m.expires_at,
        ];
      })
    );
  };

  const totalPages = Math.max(1, Math.ceil(filteredMemberships.length / PAGE_SIZE));
  const safePage = Math.min(memberPage, totalPages);
  const pageMemberships = filteredMemberships.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <motion.div
        variants={fadeUp}
        initial="initial"
        animate="animate"
        transition={{ duration: DURATION.base, ease: EASE_OUT }}
        className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <Crown className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Memberships</h1>
            <p className="text-sm text-gray-500">Configure member pricing tiers and manage active subscribers</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportMemberships}
            disabled={!filteredMemberships.length}
            className="btn btn-outline btn-md"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </button>
          <button type="button" onClick={loadData} disabled={loading} className="btn btn-outline btn-md">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Plans', value: plans.length.toLocaleString() },
          { label: 'Active Members', value: activeCount.toLocaleString() },
          {
            label: 'Best Discount',
            value: plans.length ? `${Math.max(...plans.map((plan) => Number(plan.discount_percent ?? 0))).toFixed(0)}%` : '0%',
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + staggerDelay(i, 0.05, 0.12), duration: DURATION.base, ease: EASE_OUT }}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Plans</h2>
            <button type="button" onClick={() => setSelectedId('new')} className="btn btn-primary btn-sm">
              <Plus className="mr-2 h-4 w-4" />
              New Plan
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-500">Loading memberships...</div>
            ) : plans.length === 0 ? (
              <div className="p-6 space-y-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800 mb-1">Database table not found</p>
                  <p className="text-xs text-amber-700 mb-2">The <code className="font-mono bg-amber-100 px-1 rounded">membership_plans</code> table doesn't exist yet in your Supabase project. Run the migration below in the Supabase SQL Editor to create it.</p>
                  <a
                    href="https://supabase.com/dashboard/project/_/sql"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 underline"
                  >
                    Open Supabase SQL Editor ↗
                  </a>
                  <p className="text-xs text-amber-600 mt-2">Migration file: <code className="font-mono">supabase/migrations/010_memberships.sql</code></p>
                </div>
              </div>
            ) : plans.map((plan, i) => (
              <motion.button
                key={plan.id}
                type="button"
                initial={rowsIntroduced.current ? false : { opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: staggerDelay(i, 0.04, 0.2), duration: DURATION.base, ease: EASE_OUT }}
                onClick={() => setSelectedId(plan.id)}
                className={`flex w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors ${
                  selectedId === plan.id ? 'bg-primary-50/50' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{plan.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      plan.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {plan.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{plan.description || 'No description'}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary-600 tabular-nums">{Number(plan.discount_percent).toFixed(0)}% off</p>
                  <p className="text-sm text-gray-500 tabular-nums">{formatMoney(plan.price)} / {plan.duration_days} days</p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{selectedPlan ? 'Edit Plan' : 'New Plan'}</h2>
              <p className="text-sm text-gray-500">Customer discounts are applied at checkout.</p>
            </div>
            {selectedPlan ? (
              <button type="button" onClick={() => setSelectedId('new')} className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="space-y-4">
            <div>
              <label className="label mb-1.5 block">Plan Name</label>
              <input className="input" value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Gold" />
            </div>
            <div>
              <label className="label mb-1.5 block">Slug</label>
              <input className="input" value={form.slug} onChange={(event) => updateForm('slug', event.target.value)} placeholder="gold" />
            </div>
            <div>
              <label className="label mb-1.5 block">Description</label>
              <textarea className="input min-h-20 py-2" value={form.description ?? ''} onChange={(event) => updateForm('description', event.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label mb-1.5 block">Discount %</label>
                <input className="input" type="number" min="0" max="100" step="0.1" value={form.discount_percent} onChange={(event) => updateForm('discount_percent', event.target.value)} />
              </div>
              <div>
                <label className="label mb-1.5 block">Duration Days</label>
                <input className="input" type="number" min="1" value={form.duration_days} onChange={(event) => updateForm('duration_days', event.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <div>
                <label className="label mb-1.5 block">Price</label>
                <input className="input" type="number" min="0" step="0.01" value={form.price} onChange={(event) => updateForm('price', event.target.value)} />
              </div>
              <div>
                <label className="label mb-1.5 block">Currency</label>
                <input className="input" value={form.currency} onChange={(event) => updateForm('currency', event.target.value.toUpperCase())} />
              </div>
            </div>
            <div>
              <label className="label mb-1.5 block">Benefits</label>
              <textarea
                className="input min-h-24 py-2"
                value={benefitsText}
                onChange={(event) => setBenefitsText(event.target.value)}
                placeholder="One benefit per line"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Visible to customers</p>
                <p className="text-xs text-gray-500">Hidden plans will not appear on the game detail page.</p>
              </div>
              <button
                type="button"
                onClick={() => updateForm('is_active', !form.is_active)}
                className={`h-6 w-11 rounded-full p-0.5 transition ${form.is_active ? 'bg-primary-600' : 'bg-gray-200'}`}
              >
                <span className={`block h-5 w-5 rounded-full bg-white shadow transition ${form.is_active ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <motion.button type="button" {...pressScale} onClick={savePlan} disabled={saving} className="btn btn-primary btn-md w-full">
              {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Plan
            </motion.button>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BadgePercent className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">User Memberships ({filteredMemberships.length})</h2>
          </div>
          <button
            type="button"
            onClick={() => setGrantOpen((v) => !v)}
            className="btn btn-outline btn-sm self-start sm:self-auto"
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            Grant Membership
          </button>
        </div>

        {grantOpen && (
          <div className="border-b border-gray-200 bg-primary-50/40 px-6 py-4 flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer Email</label>
              <input
                type="email"
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                placeholder="customer@example.com"
                className="input bg-white text-sm w-full"
              />
            </div>
            <div className="w-full sm:w-56">
              <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
              <select
                value={grantPlanId}
                onChange={(e) => setGrantPlanId(e.target.value)}
                className="input bg-white text-sm w-full"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.duration_days}d)
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleGrantMembership}
              disabled={granting || !plans.length}
              className="btn btn-primary btn-md shrink-0"
            >
              {granting ? 'Granting…' : 'Grant Now'}
            </button>
          </div>
        )}

        <div className="border-b border-gray-100 px-6 py-3 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => { setMemberSearch(e.target.value); setMemberPage(1); }}
              placeholder="Search subscribers by name or email..."
              className="input pl-9 text-sm w-full"
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setMemberPage(1); }}
            className="input sm:w-48 text-sm"
          >
            <option value="all">All Plans</option>
            {plans.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setMemberPage(1); }}
            className="input sm:w-44 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['User', 'Plan', 'Status', 'Started', 'Expires', 'Actions'].map((heading) => (
                  <th key={heading} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageMemberships.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">No user memberships match your filters.</td>
                </tr>
              ) : pageMemberships.map((membership, i) => {
                const profile = firstJoined(membership.profiles);
                const plan = firstJoined(membership.membership_plans);
                const isExpired = new Date(membership.expires_at) <= new Date();

                return (
                  <motion.tr
                    key={membership.id}
                    initial={rowsIntroduced.current ? false : { opacity: 0, y: reduceMotion ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: staggerDelay(i, 0.028, 0.2), duration: DURATION.base, ease: EASE_OUT }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{profile?.name ?? 'Unknown user'}</p>
                      <p className="text-xs text-gray-500">{profile?.email ?? membership.user_id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{plan?.name ?? 'Deleted plan'}</td>
                    <td className="px-6 py-4">
                      <motion.span
                        key={membership.status}
                        variants={pop}
                        initial="initial"
                        animate="animate"
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize inline-block ${
                          membership.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : isExpired
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {membership.status === 'active' && isExpired ? 'expired' : membership.status}
                      </motion.span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 tabular-nums">{formatDate(membership.started_at)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 tabular-nums">{formatDate(membership.expires_at)}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={updatingMemberId === membership.id}
                          onClick={() => handleExtend30d(membership)}
                          className="px-2.5 py-1 text-xs font-medium rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700"
                        >
                          +30d
                        </button>
                        <button
                          type="button"
                          disabled={updatingMemberId === membership.id}
                          onClick={() => handleToggleCancel(membership)}
                          className="px-2.5 py-1 text-xs font-medium rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600"
                        >
                          {membership.status === 'cancelled' ? 'Reactivate' : 'Cancel'}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-500">
            <span className="tabular-nums">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredMemberships.length)} of {filteredMemberships.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMemberPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded border bg-white disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="tabular-nums">Page {safePage} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setMemberPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded border bg-white disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Memberships;
