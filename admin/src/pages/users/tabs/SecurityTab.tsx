import { useState } from 'react';
import { Shield, Key, LogOut, Mail, Smartphone, Loader2, AlertTriangle } from 'lucide-react';
import { AxiosError } from 'axios';
import { api } from '../../../services/api';
import { toast } from 'react-hot-toast';
import type { UserDetailData } from '../useUserDetail';

interface Props { data: UserDetailData; refetch: () => void; }

function apiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string } | undefined;
    return data?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function SecurityTab({ data, refetch }: Props) {
  const { profile, twoFactor } = data;
  const [working, setWorking] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [showDisable2fa, setShowDisable2fa] = useState(false);

  const handleAction = async (action: string, body?: unknown) => {
    setWorking(action);
    try {
      const res = await api.post<{ message?: string }>(`/admin/users/${profile.id}/${action}`, body ?? {});
      toast.success(res.data?.message || 'Action completed');
      refetch();
    } catch (error) {
      toast.error(apiErrorMessage(error, `Failed to ${action}`));
    } finally {
      setWorking(null);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setWorking('change-email');
    try {
      const res = await api.post<{ message?: string }>(`/admin/users/${profile.id}/change-email`, { newEmail: newEmail.trim() });
      toast.success(res.data?.message || 'Email updated');
      setShowEmailModal(false);
      setNewEmail('');
      refetch();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to change email'));
    } finally {
      setWorking(null);
    }
  };

  const handleDisable2FA = async () => {
    setWorking('disable-2fa');
    try {
      const res = await api.post<{ message?: string }>(`/admin/users/${profile.id}/disable-2fa`);
      toast.success(res.data?.message || '2FA disabled');
      setShowDisable2fa(false);
      refetch();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Failed to disable 2FA'));
    } finally {
      setWorking(null);
    }
  };

  const features = [
    {
      icon: Key,
      key: 'disable-2fa',
      label: 'Disable 2FA',
      desc: 'Force-disable all MFA factors for account recovery',
      onClick: () => setShowDisable2fa(true),
      guard: twoFactor?.is_enabled,
    },
    {
      icon: LogOut,
      key: 'force-logout',
      label: 'Force Logout',
      desc: 'Revoke all active sessions immediately',
      onClick: () => handleAction('force-logout'),
    },
    {
      icon: Mail,
      key: 'change-email',
      label: 'Change Email',
      desc: 'Admin override of the user\'s email address',
      onClick: () => setShowEmailModal(true),
    },
    {
      icon: Key,
      key: 'reset-password',
      label: 'Send Password Reset',
      desc: 'Trigger a password reset email',
      onClick: () => handleAction('reset-password'),
    },
    {
      icon: Smartphone,
      key: 'sessions',
      label: 'Active Sessions',
      desc: 'View and revoke individual sessions',
      onClick: () => {
        // Sessions tab is the primary UI for this; navigate handled by parent tabs
        toast('Open the Sessions tab to manage individual sessions.');
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-500" />
            Two-Factor Authentication
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900 font-medium">
                {twoFactor?.is_enabled ? 'Enabled' : 'Disabled'}
              </p>
              {twoFactor?.is_enabled && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Method: {twoFactor.method?.toUpperCase()}
                </p>
              )}
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              twoFactor?.is_enabled
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {twoFactor?.is_enabled ? 'Active' : 'Off'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Email Verification</h3>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-900">{profile.email}</p>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              profile.email_verified
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {profile.email_verified ? 'Verified' : 'Unverified'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Security Controls</h3>
        <p className="text-sm text-gray-500 mb-5">Manage this user&apos;s security and access.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map(({ icon: Icon, key, label, desc, onClick, guard }) => (
            <button
              key={key}
              onClick={onClick}
              disabled={working === key || guard === false}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 text-left hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
                {working === key ? (
                  <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4 text-purple-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {showDisable2fa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Disable 2FA?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              This will remove all MFA factors from the user&apos;s account. They will be able to log in with only their password until they re-enroll.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDisable2fa(false)}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDisable2FA}
                disabled={working === 'disable-2fa'}
                className="btn btn-primary btn-sm"
              >
                {working === 'disable-2fa' ? 'Disabling…' : 'Disable 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleChangeEmail} className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Change User Email</h3>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New email address</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="input w-full mb-6"
              placeholder="user@example.com"
              required
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={working === 'change-email'}
                className="btn btn-primary btn-sm"
              >
                {working === 'change-email' ? 'Saving…' : 'Change Email'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
