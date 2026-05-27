import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Save, RefreshCw, ShoppingBag, Wallet, Clock, AlertTriangle, Trash2, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../services/api';
import { toast } from 'react-hot-toast';
import type { UserDetailData } from '../useUserDetail';

interface Props { data: UserDetailData; refetch: () => void; }

const ROLES    = ['user', 'admin', 'reseller', 'support'] as const;
const LANGS    = ['en', 'ur', 'ar', 'fr', 'de', 'es'] as const;
const STATUSES = ['active', 'inactive', 'suspended', 'banned'] as const;
const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const statusColors: Record<string, string> = {
  active:    'bg-green-100 text-green-700 border-green-200',
  inactive:  'bg-gray-100 text-gray-600 border-gray-200',
  suspended: 'bg-orange-100 text-orange-700 border-orange-200',
  banned:    'bg-red-100 text-red-700 border-red-200',
};

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-base font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function formatDate(ts?: string | null) {
  if (!ts) return 'Never';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initialsForName(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarPathFromUrl(url?: string | null) {
  if (!url) return null;

  try {
    const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
    const index = url.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(url.slice(index + marker.length).split('?')[0]);
  } catch {
    return null;
  }
}

function getAvatarErrorMessage(err: unknown) {
  const message = err instanceof Error ? err.message : '';
  if (message.toLowerCase().includes('bucket not found')) {
    return 'Profile picture storage is not set up yet. Run supabase/migrations/003_avatar_storage.sql in Supabase.';
  }
  return message || 'Failed to update profile picture';
}

export default function OverviewTab({ data, refetch }: Props) {
  const { profile } = data;
  const { user: adminUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    name:     profile.name,
    username: profile.username ?? '',
    phone:    profile.phone ?? '',
    bio:      profile.bio ?? '',
    role:     profile.role,
    language: profile.language,
    timezone: profile.timezone,
  });
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url ?? '');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus]     = useState<typeof STATUSES[number] | null>(null);
  const [statusReason, setStatusReason]       = useState('');
  const [changingStatus, setChangingStatus]   = useState(false);

  const field = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    setAvatarPreview(profile.avatar_url ?? '');
    setAvatarFile(null);
  }, [profile.avatar_url]);

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      toast.error('Profile picture must be 5MB or smaller');
      event.target.value = '';
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const saveAvatar = async () => {
    if (!avatarFile) return;

    setSavingAvatar(true);
    try {
      const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${profile.id}/admin-${Date.now()}.${ext}`;
      const oldAvatarPath = getAvatarPathFromUrl(profile.avatar_url);

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, avatarFile, {
          cacheControl: '3600',
          contentType: avatarFile.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: urlData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      if (oldAvatarPath && oldAvatarPath !== path) {
        await supabase.storage.from(AVATAR_BUCKET).remove([oldAvatarPath]);
      }

      toast.success('Profile picture updated');
      setAvatarFile(null);
      refetch();
    } catch (err: any) {
      toast.error(getAvatarErrorMessage(err));
    } finally {
      setSavingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    if (!profile.avatar_url && !avatarFile) return;
    if (profile.avatar_url && !confirm('Remove this user profile picture?')) return;

    setRemovingAvatar(true);
    try {
      const oldAvatarPath = getAvatarPathFromUrl(profile.avatar_url);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      if (oldAvatarPath) {
        await supabase.storage.from(AVATAR_BUCKET).remove([oldAvatarPath]);
      }

      setAvatarFile(null);
      setAvatarPreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Profile picture removed');
      refetch();
    } catch (err: any) {
      toast.error(getAvatarErrorMessage(err));
    } finally {
      setRemovingAvatar(false);
    }
  };

  const saveProfile = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        name:      form.name.trim(),
        username:  form.username.trim() || null,
        phone:     form.phone.trim()    || null,
        bio:       form.bio.trim()      || null,
        role:      form.role,
        language:  form.language,
        timezone:  form.timezone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (error) {
      toast.error(error.message || 'Failed to save profile');
    } else {
      toast.success('Profile saved');
      if (form.role !== profile.role) {
        supabase.rpc('log_activity', {
          p_user_id: profile.id,
          p_action: 'profile_update',
          p_description: `Role changed from ${profile.role} to ${form.role}`,
          p_actor_id: adminUser?.id ?? null,
          p_metadata: { old_role: profile.role, new_role: form.role },
        }).then(({ error: logErr }) => {
          if (logErr) console.warn('[log_activity] role change log failed:', logErr.message);
        });
      }
      refetch();
    }
    setSaving(false);
  };

  const openStatusChange = (newStatus: typeof STATUSES[number]) => {
    if (newStatus === profile.status) return;
    setPendingStatus(newStatus);
    setStatusReason('');
    setShowStatusModal(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus) return;
    if (!statusReason.trim() || statusReason.trim().length < 3) {
      toast.error('Please provide a reason (min 3 chars)');
      return;
    }
    setChangingStatus(true);
    try {
      await api.post(`/admin/users/${profile.id}/status`, {
        status: pendingStatus,
        reason: statusReason.trim(),
      });
      toast.success(`Status changed to ${pendingStatus}`);
      setShowStatusModal(false);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change status');
    }
    setChangingStatus(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Wallet}
          label="Wallet Balance"
          value={`PKS ${Number(profile.wallet_balance).toFixed(2)}`}
          color="bg-purple-50 text-purple-500"
        />
        <StatCard
          icon={ShoppingBag}
          label="Total Orders"
          value="—"
          color="bg-blue-50 text-blue-500"
        />
        <StatCard
          icon={Clock}
          label="Member Since"
          value={formatDate(profile.created_at)}
          color="bg-green-50 text-green-500"
        />
        <StatCard
          icon={Clock}
          label="Last Login"
          value={formatDate(profile.last_login_at)}
          color="bg-orange-50 text-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile form — 2/3 width */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-5">Profile Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label block mb-1.5">Full Name *</label>
              <input className="input" value={form.name} onChange={field('name')} maxLength={100} />
            </div>
            <div>
              <label className="label block mb-1.5">Username</label>
              <input className="input" value={form.username} onChange={field('username')} placeholder="optional" maxLength={50} />
            </div>
            <div>
              <label className="label block mb-1.5">Email</label>
              <input className="input bg-gray-50" value={profile.email} disabled title="Change email via Security tab" />
            </div>
            <div>
              <label className="label block mb-1.5">Phone</label>
              <input className="input" value={form.phone} onChange={field('phone')} placeholder="+1 234 567 8900" maxLength={32} />
            </div>
            <div>
              <label className="label block mb-1.5">Role</label>
              <select className="input" value={form.role} onChange={field('role')}>
                {ROLES.map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label block mb-1.5">Language</label>
              <select className="input" value={form.language} onChange={field('language')}>
                {LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label block mb-1.5">Bio</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={form.bio}
                onChange={field('bio')}
                placeholder="Short bio..."
                maxLength={500}
              />
            </div>
          </div>
          <div className="flex justify-end mt-5 pt-4 border-t border-gray-100">
            <button onClick={saveProfile} disabled={saving} className="btn btn-primary btn-md">
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </button>
          </div>
        </div>

        {/* Account status card — 1/3 width */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Profile Picture</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-primary-600 font-bold text-xl overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} className="w-full h-full object-cover" alt={profile.name} />
                ) : (
                  initialsForName(profile.name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={savingAvatar || removingAvatar}
                  className="btn btn-outline btn-sm w-full mb-2"
                >
                  <Camera className="w-4 h-4 mr-1.5" />
                  Choose Image
                </button>
                {(profile.avatar_url || avatarFile) && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    disabled={savingAvatar || removingAvatar}
                    className="btn btn-outline btn-sm w-full text-red-600 hover:text-red-700"
                  >
                    {removingAvatar ? (
                      <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-1.5" />
                    )}
                    Remove
                  </button>
                )}
              </div>
            </div>
            {avatarFile && (
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreview(profile.avatar_url ?? '');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  disabled={savingAvatar}
                  className="btn btn-outline btn-sm"
                >
                  Cancel
                </button>
                <button type="button" onClick={saveAvatar} disabled={savingAvatar} className="btn btn-primary btn-sm">
                  {savingAvatar ? (
                    <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1.5" />
                  )}
                  Save Picture
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Account Status</h3>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">Current</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${statusColors[profile.status] ?? statusColors.active}`}>
                {profile.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">Change to:</p>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map(s => (
                <button
                  key={s}
                  disabled={s === profile.status}
                  onClick={() => openStatusChange(s)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium capitalize border transition-all
                    ${s === profile.status
                      ? 'opacity-40 cursor-not-allowed ' + (statusColors[s] ?? '')
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900'
                    }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Identifiers</h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-400">User ID</p>
                <p className="text-xs font-mono text-gray-600 break-all">{profile.id}</p>
              </div>
              {profile.referral_code && (
                <div>
                  <p className="text-xs text-gray-400">Referral Code</p>
                  <p className="text-sm font-bold font-mono text-purple-600">{profile.referral_code}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Email Verified</p>
                <p className="text-sm font-medium text-gray-700">
                  {profile.email_verified ? '✓ Yes' : '✗ No'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status change confirmation modal */}
      <AnimatePresence>
        {showStatusModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowStatusModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Change Account Status</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Set to <span className="font-semibold capitalize">{pendingStatus}</span>
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {(pendingStatus === 'banned' || pendingStatus === 'suspended') && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-orange-700">
                    This action will immediately revoke all active sessions.
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="label block mb-1.5">Reason <span className="text-red-500">*</span></label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  rows={3}
                  placeholder="Provide a reason for this status change..."
                  className="input resize-none w-full"
                  maxLength={500}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="btn btn-outline btn-md flex-1"
                  disabled={changingStatus}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStatusChange}
                  disabled={changingStatus}
                  className="btn btn-primary btn-md flex-1"
                >
                  {changingStatus ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
