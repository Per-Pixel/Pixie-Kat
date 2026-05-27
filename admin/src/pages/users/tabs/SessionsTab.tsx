import { useState, useEffect } from 'react';
import { Monitor, Smartphone, Tablet, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { UserDetailData } from '../useUserDetail';

interface Props { data: UserDetailData; refetch: () => void; }

interface LoginEntry {
  id: string;
  ip_address?: string | null;
  user_agent?: string | null;
  country?: string | null;
  city?: string | null;
  device_type?: string | null;
  browser?: string | null;
  success: boolean;
  used_2fa: boolean;
  created_at: string;
}

function DeviceIcon({ type }: { type?: string | null }) {
  if (type === 'mobile') return <Smartphone className="w-4 h-4 text-gray-400" />;
  if (type === 'tablet') return <Tablet className="w-4 h-4 text-gray-400" />;
  return <Monitor className="w-4 h-4 text-gray-400" />;
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function SessionsTab({ data }: Props) {
  const [logs, setLogs] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data: rows } = await supabase
        .from('user_login_history')
        .select('*')
        .eq('user_id', data.profile.id)
        .order('created_at', { ascending: false })
        .limit(30);
      setLogs((rows as LoginEntry[]) ?? []);
      setLoading(false);
    };
    fetchLogs();
  }, [data.profile.id]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Login History (last 30)</h3>
          {loading && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading sessions…</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No login history yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <DeviceIcon type={log.device_type} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-800">
                        {log.browser ?? log.device_type ?? 'Unknown device'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {log.success ? 'Success' : 'Failed'}
                      </span>
                      {log.used_2fa && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                          2FA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[log.ip_address, log.city, log.country].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                  {formatTs(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
