import { useState, useEffect } from 'react';
import { Users, RefreshCw, Copy } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import type { UserDetailData } from '../useUserDetail';

interface Props { data: UserDetailData; refetch: () => void; }

interface Referral {
  id: string;
  referred_id: string;
  status: string;
  commission: number;
  created_at: string;
  referred?: { name: string; email: string };
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusColor: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  active:   'bg-green-100 text-green-700',
  rewarded: 'bg-purple-100 text-purple-700',
  expired:  'bg-gray-100 text-gray-500',
};

export default function ReferralsTab({ data }: Props) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferrals = async () => {
      setLoading(true);
      const { data: rows } = await supabase
        .from('referrals')
        .select('id, referred_id, status, commission, created_at')
        .eq('referrer_id', data.profile.id)
        .order('created_at', { ascending: false });
      setReferrals((rows as Referral[]) ?? []);
      setLoading(false);
    };
    fetchReferrals();
  }, [data.profile.id]);

  const copyCode = () => {
    if (data.profile.referral_code) {
      navigator.clipboard.writeText(data.profile.referral_code);
      toast.success('Referral code copied');
    }
  };

  const totalCommission = referrals.reduce((s, r) => s + Number(r.commission), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Referral Code</p>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-900 font-mono tracking-wider">
              {data.profile.referral_code ?? '—'}
            </span>
            {data.profile.referral_code && (
              <button onClick={copyCode} className="text-gray-400 hover:text-purple-500 transition-colors">
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Referrals</p>
          <p className="text-2xl font-bold text-gray-900">{referrals.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Commission Earned</p>
          <p className="text-2xl font-bold text-gray-900">
            PKS {totalCommission.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">Referred Users</h3>
          </div>
          {loading && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading referrals…</div>
        ) : referrals.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No referrals yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50">
                <div>
                  <p className="text-sm text-gray-700 font-mono text-xs">{ref.referred_id}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatTs(ref.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {Number(ref.commission) > 0 && (
                    <span className="text-sm font-medium text-gray-700">
                      PKS {Number(ref.commission).toFixed(2)}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[ref.status] ?? statusColor.pending}`}>
                    {ref.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
