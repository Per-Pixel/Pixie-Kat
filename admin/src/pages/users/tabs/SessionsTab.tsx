import { useState, useEffect } from 'react';
import { Monitor, Smartphone, Tablet, RefreshCw, Globe2, MapPin, Clock3 } from 'lucide-react';
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

const deviceLabels: Record<string, string> = {
  desktop: 'Desktop',
  mobile: 'Mobile',
  tablet: 'Tablet',
  unknown: 'Unknown device',
};

function DeviceIcon({ type }: { type?: string | null }) {
  if (type === 'mobile') return <Smartphone className="w-4 h-4 text-gray-500" />;
  if (type === 'tablet') return <Tablet className="w-4 h-4 text-gray-500" />;
  return <Monitor className="w-4 h-4 text-gray-500" />;
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getSessionTitle(log: LoginEntry) {
  const browser = log.browser ?? 'Unknown browser';
  const device = deviceLabels[log.device_type ?? 'unknown'] ?? 'Unknown device';
  return `${browser} on ${device}`;
}

function getLocation(log: LoginEntry) {
  return [log.city, log.country].filter(Boolean).join(', ') || 'Unknown location';
}

export default function SessionsTab({ data, refetch }: Props) {
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

  const currentSession = logs.find((log) => log.success) ?? null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Current Session</h3>
            <p className="text-xs text-gray-400 mt-0.5">Latest successful login recorded for this user.</p>
          </div>
          <button
            type="button"
            onClick={refetch}
            className="btn btn-outline btn-sm"
            title="Refresh user details"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading current session...</div>
        ) : !currentSession ? (
          <div className="p-8 text-center text-gray-400 text-sm">No successful session has been recorded yet.</div>
        ) : (
          <div className="p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50">
                  <DeviceIcon type={currentSession.device_type} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-semibold text-gray-900">
                      {getSessionTitle(currentSession)}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      Current
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 break-all">
                    {currentSession.user_agent ?? 'No user agent captured'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[520px]">
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    <Globe2 className="w-3.5 h-3.5" />
                    IP Address
                  </div>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {currentSession.ip_address ?? 'Unknown'}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    <MapPin className="w-3.5 h-3.5" />
                    Location
                  </div>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {getLocation(currentSession)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    <Clock3 className="w-3.5 h-3.5" />
                    Signed In
                  </div>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {formatTs(currentSession.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Login History (last 30)</h3>
          {loading && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading sessions...</div>
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
                        {getSessionTitle(log)}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {log.success ? 'Success' : 'Failed'}
                      </span>
                      {currentSession?.id === log.id && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                          Current
                        </span>
                      )}
                      {log.used_2fa && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                          2FA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[log.ip_address, getLocation(log)].filter(Boolean).join(' | ')}
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
