import React, { useMemo, useState } from 'react';
import { AlertCircle, RefreshCw, Search, UserCheck, Users, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminReport } from '../hooks/useAdminReport';

const Resellers: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useAdminReport();
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.profiles
      .filter((profile) => profile.role === 'reseller')
      .map((profile) => ({
        ...profile,
        referrals: data.referrals.filter((item) => item.referrer_id === profile.id).length,
        commission: data.referrals.filter((item) => item.referrer_id === profile.id).reduce((sum, item) => sum + Number(item.commission || 0), 0),
      }))
      .filter((profile) => !term || [profile.name, profile.email, profile.status].some((value) => value.toLowerCase().includes(term)));
  }, [data, search]);

  if (loading && !data) return <div className="py-24 text-center text-gray-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3" />Loading resellers...</div>;
  if (error || !data) return <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700"><AlertCircle className="w-5 h-5 mb-2" />{error}<button onClick={refresh} className="btn btn-outline btn-sm ml-4">Retry</button></div>;

  return <div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Resellers</h1><p className="text-sm text-gray-500">Accounts whose Supabase profile role is reseller</p></div><button onClick={refresh} className="btn btn-outline btn-sm"><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh</button></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[{ label: 'Resellers', value: data.profiles.filter((p) => p.role === 'reseller').length, icon: UserCheck }, { label: 'Active', value: data.profiles.filter((p) => p.role === 'reseller' && p.status === 'active').length, icon: Users }, { label: 'Combined Wallet Balance', value: `PKS ${data.profiles.filter((p) => p.role === 'reseller').reduce((sum, p) => sum + Number(p.wallet_balance || 0), 0).toFixed(2)}`, icon: Wallet }].map(({ label, value, icon: Icon }) => <div key={label} className="bg-white border rounded-xl p-5"><Icon className="w-5 h-5 text-primary-600 mb-3" /><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-bold">{value}</p></div>)}</div>
    <div className="bg-white border rounded-xl p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="input pl-10 w-full" placeholder="Search resellers..." /></div></div>
    <div className="bg-white border rounded-xl overflow-hidden">{rows.length === 0 ? <p className="p-12 text-center text-sm text-gray-400">No reseller profiles found.</p> : <table className="w-full"><thead className="bg-gray-50"><tr>{['Reseller', 'Status', 'Wallet', 'Referrals', 'Commission', 'Joined'].map((heading) => <th key={heading} className="px-5 py-3 text-left text-xs uppercase text-gray-500">{heading}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.id} onClick={() => navigate(`/users/${row.id}`)} className="cursor-pointer hover:bg-gray-50"><td className="px-5 py-4"><p className="text-sm font-medium">{row.name}</p><p className="text-xs text-gray-500">{row.email}</p></td><td className="px-5 py-4"><span className={`px-2 py-1 rounded-full text-xs capitalize ${row.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{row.status}</span></td><td className="px-5 py-4 text-sm">PKS {Number(row.wallet_balance || 0).toFixed(2)}</td><td className="px-5 py-4 text-sm">{row.referrals}</td><td className="px-5 py-4 text-sm">PKS {row.commission.toFixed(2)}</td><td className="px-5 py-4 text-sm text-gray-500">{new Date(row.created_at).toLocaleDateString()}</td></tr>)}</tbody></table>}</div>
  </div>;
};

export default Resellers;
