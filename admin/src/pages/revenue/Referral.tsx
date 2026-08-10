import React, { useMemo } from 'react';
import { AlertCircle, DollarSign, RefreshCw, Share2, Users } from 'lucide-react';
import { useAdminReport } from '../../hooks/useAdminReport';

const Referral: React.FC = () => {
  const { data, loading, error, refresh } = useAdminReport();
  const rows = useMemo(() => {
    if (!data) return [];
    const grouped = new Map<string, { id: string; name: string; email: string; referrals: number; active: number; commission: number }>();
    data.referrals.forEach((referral) => {
      const profile = data.profiles.find((item) => item.id === referral.referrer_id);
      const current = grouped.get(referral.referrer_id) ?? { id: referral.referrer_id, name: profile?.name || 'Unknown user', email: profile?.email || '', referrals: 0, active: 0, commission: 0 };
      current.referrals += 1;
      if (['active', 'rewarded'].includes(referral.status)) current.active += 1;
      current.commission += Number(referral.commission || 0);
      grouped.set(referral.referrer_id, current);
    });
    return [...grouped.values()].sort((a, b) => b.referrals - a.referrals);
  }, [data]);

  if (loading && !data) return <div className="py-24 text-center text-gray-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3" />Loading referrals...</div>;
  if (error || !data) return <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700"><AlertCircle className="w-5 h-5 mb-2" />{error}<button onClick={refresh} className="btn btn-outline btn-sm ml-4">Retry</button></div>;
  const commission = data.referrals.reduce((sum, item) => sum + Number(item.commission || 0), 0);
  const converted = data.referrals.filter((item) => ['active', 'rewarded'].includes(item.status)).length;

  return <div className="space-y-6">
    <div className="flex items-center gap-3"><Share2 className="w-7 h-7 text-primary-600" /><div><h1 className="text-2xl font-bold">Referral Program</h1><p className="text-sm text-gray-500">Live referral relationships and commissions</p></div></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[{ label: 'Total Referrals', value: data.referrals.length, icon: Users }, { label: 'Converted', value: converted, icon: Share2 }, { label: 'Commission Awarded', value: `PKS ${commission.toFixed(2)}`, icon: DollarSign }].map(({ label, value, icon: Icon }) => <div key={label} className="bg-white border rounded-xl p-5"><Icon className="w-5 h-5 text-primary-600 mb-3" /><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-bold">{value}</p></div>)}</div>
    <div className="bg-white border rounded-xl overflow-hidden">{rows.length === 0 ? <p className="p-12 text-center text-sm text-gray-400">No referral records found.</p> : <table className="w-full"><thead className="bg-gray-50"><tr>{['Referrer', 'Referrals', 'Converted', 'Conversion', 'Commission'].map((heading) => <th key={heading} className="px-5 py-3 text-left text-xs uppercase text-gray-500">{heading}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.id}><td className="px-5 py-4"><p className="text-sm font-medium">{row.name}</p><p className="text-xs text-gray-500">{row.email}</p></td><td className="px-5 py-4 text-sm">{row.referrals}</td><td className="px-5 py-4 text-sm">{row.active}</td><td className="px-5 py-4 text-sm">{row.referrals ? ((row.active / row.referrals) * 100).toFixed(1) : 0}%</td><td className="px-5 py-4 text-sm font-semibold">PKS {row.commission.toFixed(2)}</td></tr>)}</tbody></table>}</div>
  </div>;
};

export default Referral;
