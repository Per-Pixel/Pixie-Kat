import { useState, useEffect } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { UserDetailData } from '../useUserDetail';

interface Props { data: UserDetailData; refetch: () => void; }

interface ActivityEntry {
  id: string;
  action: string;
  description?: string | null;
  ip_address?: string | null;
  created_at: string;
}

const actionLabels: Record<string, string> = {
  login: 'Signed in',
  logout: 'Signed out',
  login_failed: 'Failed login attempt',
  profile_update: 'Updated profile',
  password_changed: 'Changed password',
  password_reset_requested: 'Requested password reset',
  '2fa_enabled': 'Enabled 2FA',
  '2fa_disabled': 'Disabled 2FA',
  order_placed: 'Placed an order',
  wallet_credit: 'Wallet credited',
  wallet_debit: 'Wallet debited',
  account_suspended: 'Account suspended',
  account_banned: 'Account banned',
  account_reactivated: 'Account reactivated',
  session_revoked: 'Sessions revoked',
};

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ActivityTab({ data }: Props) {
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data: rows } = await supabase
        .from('user_activity_log')
        .select('id, action, description, ip_address, created_at')
        .eq('user_id', data.profile.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setLogs((rows as ActivityEntry[]) ?? []);
      setLoading(false);
    };
    fetchLogs();
  }, [data.profile.id]);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Activity Log</h3>
        </div>
        {loading && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading activity…</div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No activity recorded yet.</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {actionLabels[log.action] ?? log.action.replace(/_/g, ' ')}
                </p>
                {log.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{log.description}</p>
                )}
                {log.ip_address && (
                  <p className="text-xs text-gray-400 mt-0.5">IP: {log.ip_address}</p>
                )}
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap ml-4 mt-0.5">
                {formatTs(log.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
