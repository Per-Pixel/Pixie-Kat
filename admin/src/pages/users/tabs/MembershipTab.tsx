import { useState, useEffect, useCallback } from 'react';
import { Crown, Plus, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { UserDetailData } from '../useUserDetail';

interface Props { data: UserDetailData; refetch: () => void; }

interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  discount_percent: number | string;
  price: number | string;
  currency: string;
  duration_days: number;
  is_active: boolean;
}

interface UserMembership {
  id: string;
  user_id: string;
  membership_plan_id: string;
  status: string;
  started_at: string;
  expires_at: string;
  membership_plans: { name: string; discount_percent: number | string } | null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isActive(m: UserMembership) {
  return m.status === 'active' && new Date(m.expires_at) > new Date();
}

export default function MembershipTab({ data }: Props) {
  const userId = data.profile.id;
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [customDays, setCustomDays] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [membershipsRes, plansRes] = await Promise.all([
      supabase
        .from('user_memberships')
        .select('id, user_id, membership_plan_id, status, started_at, expires_at, membership_plans(name, discount_percent)')
        .eq('user_id', userId)
        .order('started_at', { ascending: false }),
      supabase
        .from('membership_plans')
        .select('id, name, slug, discount_percent, price, currency, duration_days, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ]);

    if (!membershipsRes.error) setMemberships((membershipsRes.data ?? []) as unknown as UserMembership[]);
    if (!plansRes.error) setPlans((plansRes.data ?? []) as MembershipPlan[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const addMembership = async () => {
    if (!selectedPlanId) { toast.error('Select a plan'); return; }
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (!plan) return;

    const days = customDays ? Number(customDays) : plan.duration_days;
    if (!days || days < 1) { toast.error('Invalid duration'); return; }

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + days * 86_400_000);

    setAdding(true);
    const { error } = await supabase.from('user_memberships').insert({
      user_id: userId,
      membership_plan_id: selectedPlanId,
      status: 'active',
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    });
    setAdding(false);

    if (error) { toast.error(error.message); return; }
    toast.success('Membership added');
    setShowAdd(false);
    setSelectedPlanId('');
    setCustomDays('');
    await load();
  };

  const removeMembership = async (id: string) => {
    if (!window.confirm('Remove this membership?')) return;
    const { error } = await supabase.from('user_memberships').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Membership removed');
    await load();
  };

  const activeMemberships = memberships.filter(isActive);
  const expiredMemberships = memberships.filter((m) => !isActive(m));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        Loading memberships…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="w-6 h-6 text-amber-500" />
          <div>
            <h2 className="font-semibold text-gray-900">Memberships</h2>
            <p className="text-sm text-gray-500">
              {activeMemberships.length} active · {expiredMemberships.length} expired
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn btn-outline btn-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAdd((s) => !s)} className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Membership
          </button>
        </div>
      </div>

      {/* Add membership form */}
      {showAdd && (
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Add Membership</h3>
          {plans.length === 0 ? (
            <div className="flex items-center gap-2 text-amber-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              No active membership plans found. Create plans in the Memberships section first.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="label mb-1.5 block">Plan</label>
                <select
                  className="input"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                >
                  <option value="">— Select plan —</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {Number(p.discount_percent).toFixed(0)}% off · {p.duration_days} days
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label mb-1.5 block">Duration (days, optional override)</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  placeholder={selectedPlanId ? String(plans.find((p) => p.id === selectedPlanId)?.duration_days ?? '') : ''}
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={addMembership} disabled={adding || plans.length === 0} className="btn btn-primary btn-sm">
              {adding ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
              Confirm
            </button>
            <button onClick={() => setShowAdd(false)} className="btn btn-outline btn-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Active memberships */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-3">
          <h3 className="font-semibold text-gray-900">Active</h3>
        </div>
        {activeMemberships.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No active memberships.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeMemberships.map((m) => {
              const plan = Array.isArray(m.membership_plans) ? m.membership_plans[0] : m.membership_plans;
              return (
                <div key={m.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{plan?.name ?? 'Unknown plan'}</p>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Active</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {Number(plan?.discount_percent ?? 0).toFixed(0)}% discount · Started {formatDate(m.started_at)} · Expires {formatDate(m.expires_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeMembership(m.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove membership"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expired / cancelled memberships */}
      {expiredMemberships.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-3">
            <h3 className="font-semibold text-gray-500">History</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {expiredMemberships.map((m) => {
              const plan = Array.isArray(m.membership_plans) ? m.membership_plans[0] : m.membership_plans;
              return (
                <div key={m.id} className="flex items-center justify-between px-5 py-4 opacity-60">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-700">{plan?.name ?? 'Unknown plan'}</p>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">{m.status}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {Number(plan?.discount_percent ?? 0).toFixed(0)}% discount · {formatDate(m.started_at)} – {formatDate(m.expires_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeMembership(m.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
