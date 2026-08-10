import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, AlertCircle,
  LayoutDashboard, Wallet, Shield, BadgeCheck,
  Activity, Monitor, StickyNote, Users, TrendingUp,
} from 'lucide-react';
import { useUserDetail } from './useUserDetail';
import OverviewTab    from './tabs/OverviewTab';
import WalletTab      from './tabs/WalletTab';
import SecurityTab    from './tabs/SecurityTab';
import KycTab         from './tabs/KycTab';
import ActivityTab    from './tabs/ActivityTab';
import SessionsTab    from './tabs/SessionsTab';
import NotesTab       from './tabs/NotesTab';
import ReferralsTab   from './tabs/ReferralsTab';
import SpendingTab    from './tabs/SpendingTab';

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: LayoutDashboard },
  { id: 'spending',  label: 'Spending',  icon: TrendingUp },
  { id: 'wallet',    label: 'Wallet',    icon: Wallet },
  { id: 'security',  label: 'Security',  icon: Shield },
  { id: 'kyc',       label: 'KYC',       icon: BadgeCheck },
  { id: 'activity',  label: 'Activity',  icon: Activity },
  { id: 'sessions',  label: 'Sessions',  icon: Monitor },
  { id: 'notes',     label: 'Notes',     icon: StickyNote },
  { id: 'referrals', label: 'Referrals', icon: Users },
] as const;

type TabId = typeof TABS[number]['id'];

const statusColors: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  inactive:  'bg-gray-100 text-gray-600',
  suspended: 'bg-orange-100 text-orange-700',
  banned:    'bg-red-100 text-red-700',
};

const roleColors: Record<string, string> = {
  admin:    'bg-purple-100 text-purple-700',
  support:  'bg-blue-100 text-blue-700',
  reseller: 'bg-teal-100 text-teal-700',
  user:     'bg-gray-100 text-gray-600',
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="flex items-start gap-5">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-200 rounded w-64" />
          <div className="flex gap-2">
            <div className="h-6 bg-gray-200 rounded-full w-16" />
            <div className="h-6 bg-gray-200 rounded-full w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useUserDetail(id);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-gray-200 rounded-lg animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-5 bg-gray-200 rounded w-32 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
          </div>
        </div>
        <SkeletonCard />
        <div className="flex gap-2 border-b border-gray-200 pb-px animate-pulse">
          {TABS.map(t => <div key={t.id} className="h-9 bg-gray-200 rounded-t-md w-24" />)}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="p-3 bg-red-50 rounded-full">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">User not found</h2>
          <p className="text-sm text-gray-500 mt-1">{error ?? 'This user does not exist or you lack permission.'}</p>
        </div>
        <button onClick={() => navigate('/users')} className="btn btn-outline btn-md">
          Back to Users
        </button>
      </div>
    );
  }

  const { profile } = data;
  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const tabProps = { data, refetch };

  return (
    <div className="space-y-6">
      {/* Breadcrumb + title */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <button
          onClick={() => navigate('/users')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Back to users"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-0.5">
            <button onClick={() => navigate('/users')} className="hover:text-gray-700 transition-colors">
              Users
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">{profile.name}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">User Detail</h1>
        </div>
        <button
          onClick={refetch}
          className="ml-auto btn btn-outline btn-sm"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh
        </button>
      </motion.div>

      {/* User header card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-primary-600 font-bold text-xl">
            {profile.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover" alt={profile.name} />
              : initials
            }
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{profile.name}</h2>
              {profile.username && (
                <span className="text-sm text-gray-400">@{profile.username}</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-2.5">{profile.email}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${roleColors[profile.role] ?? roleColors.user}`}>
                {profile.role}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[profile.status] ?? statusColors.active}`}>
                {profile.status}
              </span>
              {!profile.email_verified && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-600 border border-yellow-200">
                  Email unverified
                </span>
              )}
              {data.twoFactor?.is_enabled && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600 border border-green-200">
                  2FA on
                </span>
              )}
              <span className="text-xs text-gray-400">
                PKS {Number(profile.wallet_balance).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="border-b border-gray-200"
      >
        <div className="flex gap-1 overflow-x-auto pb-px scrollbar-hide">
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all -mb-px ${
                activeTab === tabId
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {activeTab === 'overview'  && <OverviewTab  {...tabProps} />}
        {activeTab === 'spending'  && <SpendingTab  {...tabProps} />}
        {activeTab === 'wallet'    && <WalletTab    {...tabProps} />}
        {activeTab === 'security'  && <SecurityTab  {...tabProps} />}
        {activeTab === 'kyc'       && <KycTab       {...tabProps} />}
        {activeTab === 'activity'  && <ActivityTab  {...tabProps} />}
        {activeTab === 'sessions'  && <SessionsTab  {...tabProps} />}
        {activeTab === 'notes'     && <NotesTab     {...tabProps} />}
        {activeTab === 'referrals' && <ReferralsTab {...tabProps} />}
      </motion.div>
    </div>
  );
}
