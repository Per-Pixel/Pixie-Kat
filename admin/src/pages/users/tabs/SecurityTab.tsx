import { Shield, Key, LogOut, Mail, Smartphone } from 'lucide-react';
import type { UserDetailData } from '../useUserDetail';

interface Props { data: UserDetailData; refetch: () => void; }

export default function SecurityTab({ data }: Props) {
  const { twoFactor } = data;

  const features = [
    { icon: Key, label: 'Disable 2FA', desc: 'Force-disable all MFA factors for account recovery' },
    { icon: LogOut, label: 'Force Logout', desc: 'Revoke all active sessions immediately' },
    { icon: Mail, label: 'Change Email', desc: 'Admin override of the user\'s email address' },
    { icon: Key, label: 'Send Password Reset', desc: 'Trigger a password reset email' },
    { icon: Smartphone, label: 'Active Sessions', desc: 'View and revoke individual sessions' },
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
            <p className="text-sm text-gray-900">{data.profile.email}</p>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              data.profile.email_verified
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {data.profile.email_verified ? 'Verified' : 'Unverified'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Security Controls</h3>
        <p className="text-sm text-gray-500 mb-5">Full security management coming in the next sprint.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
                <Icon className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
