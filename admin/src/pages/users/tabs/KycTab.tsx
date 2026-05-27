import { BadgeCheck, AlertCircle, Clock } from 'lucide-react';
import type { UserDetailData } from '../useUserDetail';

interface Props { data: UserDetailData; refetch: () => void; }

const tierConfig = {
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

export default function KycTab({ data }: Props) {
  const kyc = data.kyc;
  const tier = (kyc?.tier ?? 'unverified') as keyof typeof tierConfig;
  const tierCfg = tierConfig[tier];

  const checks = [
    { label: 'Identity Document', status: kyc?.identity_status ?? 'pending' },
    { label: 'Address Proof',     status: kyc?.address_status  ?? 'pending' },
    { label: 'Phone Number',      status: kyc?.phone_status    ?? 'pending' },
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

        <div className="space-y-3">
          {checks.map(({ label, status }) => {
            const cfg = statusConfig[status] ?? statusConfig.pending;
            const Icon = cfg.icon;
            return (
              <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <span className="text-sm text-gray-700">{label}</span>
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                  <span className="text-sm font-medium capitalize text-gray-700">{status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">KYC Management</h3>
        <p className="text-sm text-gray-500 mb-4">
          Full KYC document review, tier upgrades, and rejection reasons coming in the next sprint.
        </p>
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            Document uploads, manual verification, and tier change history will be available here.
          </p>
        </div>
      </div>
    </div>
  );
}
