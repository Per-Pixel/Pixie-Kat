import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BadgePercent, Crown, Plus, RefreshCw, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatMoney(value: number | string, currency = 'INR') {
  const symbols: Record<string, string> = { INR: '₹', USD: '$', PKR: 'Rs ' };
  return `${symbols[currency] ?? `${currency} `}${Number(value ?? 0).toFixed(2)}`;
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
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [selectedId, setSelectedId] = useState<string | 'new'>('new');
  const [form, setForm] = useState(emptyPlan);
  const [benefitsText, setBenefitsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        .select('id, user_id, status, started_at, expires_at, membership_plans(name, discount_percent), profiles:user_id(name, email)')
        .order('created_at', { ascending: false })
        .limit(25),
    ]);

    if (plansRes.error) {
      if (!isMissingTable(plansRes.error.message)) toast.error(plansRes.error.message);
      setPlans([]);
    } else {
      setPlans((plansRes.data as MembershipPlan[]) ?? []);
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

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <Crown className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Memberships</h1>
            <p className="text-sm text-gray-500">Configure member pricing tiers and review active members</p>
          </div>
        </div>
        <button type="button" onClick={loadData} disabled={loading} className="btn btn-outline btn-md">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Plans</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{plans.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Active Members</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{activeCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Best Discount</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {plans.length ? `${Math.max(...plans.map((plan) => Number(plan.discount_percent ?? 0))).toFixed(0)}%` : '0%'}
          </p>
        </div>
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
            ) : plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedId(plan.id)}
                className={`flex w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-gray-50 ${
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
                  <p className="text-lg font-bold text-primary-600">{Number(plan.discount_percent).toFixed(0)}% off</p>
                  <p className="text-sm text-gray-500">{formatMoney(plan.price, plan.currency)} / {plan.duration_days} days</p>
                </div>
              </button>
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
            <button type="button" onClick={savePlan} disabled={saving} className="btn btn-primary btn-md w-full">
              {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Plan
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
          <BadgePercent className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Recent User Memberships</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['User', 'Plan', 'Status', 'Started', 'Expires'].map((heading) => (
                  <th key={heading} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {memberships.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">No user memberships yet.</td>
                </tr>
              ) : memberships.map((membership) => {
                const profile = firstJoined(membership.profiles);
                const plan = firstJoined(membership.membership_plans);

                return (
                  <tr key={membership.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{profile?.name ?? 'Unknown user'}</p>
                      <p className="text-xs text-gray-500">{profile?.email ?? membership.user_id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{plan?.name ?? 'Deleted plan'}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-700">{membership.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(membership.started_at)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(membership.expires_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Memberships;
