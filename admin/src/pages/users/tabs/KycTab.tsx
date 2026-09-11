import { useState } from 'react';
import { BadgeCheck, AlertCircle, Clock, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { UserDetailData } from '../useUserDetail';

interface Props { data: UserDetailData; refetch: () => void; }

const TIER_OPTIONS = ['unverified', 'basic', 'verified', 'premium'] as const;
const STATUS_OPTIONS = ['pending', 'approved', 'rejected', 'expired'] as const;

const tierConfig: Record<string, { label: string; color: string }> = {
  unverified: { label: 'Unverified', color: 'bg-gray-100 text-gray-600' },
  basic:      { label: 'Basic',      color: 'bg-blue-100 text-blue-700' },
  verified:   { label: 'Verified',   color: 'bg-green-100 text-green-700' },
  premium:    { label: 'Premium',    color: 'bg-purple-100 text-purple-700' },
};

const statusConfig: Record<string, { icon: typeof BadgeCheck; color: string }> = {
  pending:  { icon: Clock,         color: 'text-yellow-500' },
  approved: { icon: BadgeCheck,    color: 'text-green-500' },
  rejected: { icon: AlertCircle,   color: 'text-red-500' },
  expired:  { icon: AlertCircle,   color: 'text-gray-400' },
};

function normalizeKyc(data: UserDetailData['kyc']) {
  return {
    tier: (data?.tier ?? 'unverified') as string,
    identity_status: (data?.identity_status ?? 'pending') as string,
    address_status: (data?.address_status ?? 'pending') as string,
    phone_status: (data?.phone_status ?? 'pending') as string,
    notes: (data?.notes ?? '') as string,
  };
}

export default function KycTab({ data, refetch }: Props) {
  const { profile, kyc } = data;
  const [form, setForm] = useState(normalizeKyc(kyc));
  const [saving, setSaving] = useState(false);

  const tierCfg = tierConfig[form.tier] ?? tierConfig.unverified;

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      user_id: profile.id,
      tier: form.tier,
      identity_status: form.identity_status,
      address_status: form.address_status,
      phone_status: form.phone_status,
      notes: form.notes.trim(),
    };

    try {
      const { error } = kyc
        ? await supabase.from('user_kyc').update(payload).eq('user_id', profile.id)
        : await supabase.from('user_kyc').insert(payload);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('KYC settings saved');
        refetch();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save KYC');
    } finally {
      setSaving(false);
    }
  };

  const checks = [
    { label: 'Identity Document', key: 'identity_status' as const, status: form.identity_status },
    { label: 'Address Proof',     key: 'address_status'  as const, status: form.address_status },
    { label: 'Phone Number',      key: 'phone_status'    as const, status: form.phone_status },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900">KYC Status</h3>
            <p className="text-sm text-gray-500 mt-0.5">Identity verification tier and check results</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${tierCfg.color}`}>
            {tierCfg.label}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Verification Tier</label>
            <select
              className="input w-full"
              value={form.tier}
              onChange={(e) => update('tier', e.target.value)}
            >
              {TIER_OPTIONS.map((t) => (
                <option key={t} value={t}>{tierConfig[t]?.label ?? t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Admin Notes</label>
            <textarea
              className="input w-full h-20 resize-none"
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Internal notes about this user’s KYC"
            />
          </div>
        </div>

        <div className="space-y-3">
          {checks.map(({ label, key, status }) => {
            const cfg = statusConfig[status] ?? statusConfig.pending;
            const Icon = cfg.icon;
            return (
              <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <span className="text-sm text-gray-700">{label}</span>
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                  <select
                    className="input input-sm text-sm py-1"
                    value={status}
                    onChange={(e) => update(key, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s} className="capitalize">{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary btn-md flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save KYC
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">KYC Management</h3>
        <p className="text-sm text-gray-500 mb-4">
          Manual tier and status overrides are saved to <code className="text-xs bg-gray-100 px-1 rounded">user_kyc</code>.
          Document uploads and automated verification are planned for a later release.
        </p>
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            Changes here update the customer-facing verification status immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
