import React, { useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, Download, RefreshCw, Search, UserCheck, Users, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useAdminReport } from '../hooks/useAdminReport';
import { useAdminCurrency } from '../lib/currency';
import { exportToCsv } from '../utils/dateRange';

type SortField = 'wallet' | 'referrals' | 'commission' | 'created_at';

const Resellers: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useAdminReport();
  const { formatMoney } = useAdminCurrency();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('wallet');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const rows = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.profiles
      .filter((profile) => profile.role === 'reseller')
      .filter((profile) => statusFilter === 'all' || profile.status === statusFilter)
      .map((profile) => ({
        ...profile,
        wallet: Number(profile.wallet_balance || 0),
        referrals: data.referrals.filter((item) => item.referrer_id === profile.id).length,
        commission: data.referrals.filter((item) => item.referrer_id === profile.id).reduce((sum, item) => sum + Number(item.commission || 0), 0),
      }))
      .filter((profile) => !term || [profile.name, profile.email, profile.status].some((value) => value.toLowerCase().includes(term)))
      .sort((a, b) => {
        if (sortField === 'created_at') {
          const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          return sortDir === 'asc' ? diff : -diff;
        }
        const diff = a[sortField] - b[sortField];
        return sortDir === 'asc' ? diff : -diff;
      });
  }, [data, search, statusFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  if (loading && !data) return <div className="py-24 text-center text-gray-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3" />Loading resellers...</div>;
  if (error || !data) return <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700"><AlertCircle className="w-5 h-5 mb-2" />{error}<button onClick={refresh} className="btn btn-outline btn-sm ml-4">Retry</button></div>;

  const allResellers = data.profiles.filter((p) => p.role === 'reseller');
  const totalWallet = allResellers.reduce((sum, p) => sum + Number(p.wallet_balance || 0), 0);

  const handleExport = () => {
    exportToCsv(
      'resellers',
      ['Name', 'Email', 'Status', 'Wallet Balance', 'Referrals', 'Commission', 'Joined'],
      rows.map((r) => [r.name, r.email, r.status, r.wallet.toFixed(2), r.referrals, r.commission.toFixed(2), r.created_at])
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Resellers</h1>
          <p className="text-sm text-gray-500">Accounts whose Supabase profile role is reseller</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={!rows.length} className="btn btn-outline btn-sm">
            <Download className="w-4 h-4 mr-1.5" />Export CSV
          </button>
          <button onClick={refresh} className="btn btn-outline btn-sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Resellers', value: allResellers.length, icon: UserCheck },
          { label: 'Active', value: allResellers.filter((p) => p.status === 'active').length, icon: Users },
          { label: 'Combined Wallet Balance', value: formatMoney(totalWallet), icon: Wallet },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white border rounded-xl p-5">
            <Icon className="w-5 h-5 text-primary-600 mb-3" />
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input pl-10 w-full"
            placeholder="Search resellers..."
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input sm:w-48"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-12 text-center text-sm text-gray-400">No reseller profiles match your filters.</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs uppercase text-gray-500">Reseller</th>
                <th className="px-5 py-3 text-left text-xs uppercase text-gray-500">Status</th>
                {([
                  { label: 'Wallet', field: 'wallet' },
                  { label: 'Referrals', field: 'referrals' },
                  { label: 'Commission', field: 'commission' },
                  { label: 'Joined', field: 'created_at' },
                ] as const).map((col) => (
                  <th
                    key={col.label}
                    onClick={() => handleSort(col.field)}
                    className="px-5 py-3 text-left text-xs uppercase text-gray-500 cursor-pointer hover:text-gray-900 select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortField === col.field && (
                        <ChevronDown className={clsx('w-3.5 h-3.5 text-primary-600 transition-transform', sortDir === 'asc' && 'rotate-180')} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} onClick={() => navigate(`/users/${row.id}`)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium">{row.name}</p>
                    <p className="text-xs text-gray-500">{row.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs capitalize ${row.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm tabular-nums">{formatMoney(row.wallet)}</td>
                  <td className="px-5 py-4 text-sm tabular-nums">{row.referrals}</td>
                  <td className="px-5 py-4 text-sm tabular-nums">{formatMoney(row.commission)}</td>
                  <td className="px-5 py-4 text-sm text-gray-500 tabular-nums">{new Date(row.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Resellers;
