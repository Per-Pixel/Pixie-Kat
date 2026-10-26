import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronDown, DollarSign, Download, RefreshCw, Search, Share2, Users } from 'lucide-react';
import clsx from 'clsx';
import { useAdminReport } from '../../hooks/useAdminReport';
import { useAdminCurrency } from '../../lib/currency';
import { ADMIN_PERIOD_OPTIONS, AdminPeriod, exportToCsv, matchesAdminPeriod } from '../../utils/dateRange';

type SortField = 'referrals' | 'active' | 'commission';

const Referral: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useAdminReport();
  const { formatMoney } = useAdminCurrency();

  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<AdminPeriod>('all');
  const [convFilter, setConvFilter] = useState<'all' | 'converted' | 'unconverted'>('all');
  const [sortField, setSortField] = useState<SortField>('referrals');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const scopedReferrals = useMemo(() => {
    if (!data) return [];
    return data.referrals.filter((r) => matchesAdminPeriod(r.created_at, period));
  }, [data, period]);

  const rows = useMemo(() => {
    if (!data) return [];
    const grouped = new Map<string, { id: string; name: string; email: string; referrals: number; active: number; commission: number }>();
    scopedReferrals.forEach((referral) => {
      const profile = data.profiles.find((item) => item.id === referral.referrer_id);
      const current = grouped.get(referral.referrer_id) ?? {
        id: referral.referrer_id,
        name: profile?.name || 'Unknown user',
        email: profile?.email || '',
        referrals: 0,
        active: 0,
        commission: 0,
      };
      current.referrals += 1;
      if (['active', 'rewarded'].includes(referral.status)) current.active += 1;
      current.commission += Number(referral.commission || 0);
      grouped.set(referral.referrer_id, current);
    });

    const term = search.trim().toLowerCase();
    return [...grouped.values()]
      .filter((row) => {
        if (convFilter === 'converted' && row.active === 0) return false;
        if (convFilter === 'unconverted' && row.active > 0) return false;
        if (term && !`${row.name} ${row.email}`.toLowerCase().includes(term)) return false;
        return true;
      })
      .sort((a, b) => {
        const diff = a[sortField] - b[sortField];
        return sortDir === 'asc' ? diff : -diff;
      });
  }, [data, scopedReferrals, search, convFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  if (loading && !data) return <div className="py-24 text-center text-gray-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3" />Loading referrals...</div>;
  if (error || !data) return <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700"><AlertCircle className="w-5 h-5 mb-2" />{error}<button onClick={refresh} className="btn btn-outline btn-sm ml-4">Retry</button></div>;

  const commission = scopedReferrals.reduce((sum, item) => sum + Number(item.commission || 0), 0);
  const converted = scopedReferrals.filter((item) => ['active', 'rewarded'].includes(item.status)).length;

  const handleExport = () => {
    exportToCsv(
      `referrals-${period}`,
      ['Referrer', 'Email', 'Total Referrals', 'Converted', 'Conversion %', 'Commission'],
      rows.map((r) => [
        r.name,
        r.email,
        r.referrals,
        r.active,
        r.referrals ? ((r.active / r.referrals) * 100).toFixed(1) : '0.0',
        r.commission.toFixed(2),
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Share2 className="w-7 h-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold">Referral Program</h1>
            <p className="text-sm text-gray-500">Live referral relationships and commissions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={!rows.length} className="btn btn-outline btn-sm">
            <Download className="w-4 h-4 mr-1.5" />Export CSV
          </button>
          <button onClick={refresh} className="btn btn-outline btn-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ADMIN_PERIOD_OPTIONS.filter((p) => p.value !== 'custom').map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              period === opt.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Referrals', value: scopedReferrals.length.toLocaleString(), icon: Users },
          { label: 'Converted', value: converted.toLocaleString(), icon: Share2 },
          { label: 'Commission Awarded', value: formatMoney(commission), icon: DollarSign },
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
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search referrer by name or email..."
            className="input pl-10 w-full"
          />
        </div>
        <select
          value={convFilter}
          onChange={(e) => setConvFilter(e.target.value as typeof convFilter)}
          className="input sm:w-52"
        >
          <option value="all">All Referrers</option>
          <option value="converted">Converted (&gt;0 active)</option>
          <option value="unconverted">No Conversions Yet</option>
        </select>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-12 text-center text-sm text-gray-400">No referral records match your filters.</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs uppercase text-gray-500">Referrer</th>
                {([
                  { label: 'Referrals', field: 'referrals' },
                  { label: 'Converted', field: 'active' },
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
                <th className="px-5 py-3 text-left text-xs uppercase text-gray-500">Conversion</th>
                <th
                  onClick={() => handleSort('commission')}
                  className="px-5 py-3 text-left text-xs uppercase text-gray-500 cursor-pointer hover:text-gray-900 select-none"
                >
                  <span className="inline-flex items-center gap-1">
                    Commission
                    {sortField === 'commission' && (
                      <ChevronDown className={clsx('w-3.5 h-3.5 text-primary-600 transition-transform', sortDir === 'asc' && 'rotate-180')} />
                    )}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} onClick={() => navigate(`/users/${row.id}`)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium">{row.name}</p>
                    <p className="text-xs text-gray-500">{row.email}</p>
                  </td>
                  <td className="px-5 py-4 text-sm tabular-nums">{row.referrals}</td>
                  <td className="px-5 py-4 text-sm tabular-nums">{row.active}</td>
                  <td className="px-5 py-4 text-sm tabular-nums">{row.referrals ? ((row.active / row.referrals) * 100).toFixed(1) : 0}%</td>
                  <td className="px-5 py-4 text-sm font-semibold tabular-nums">{formatMoney(row.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Referral;
