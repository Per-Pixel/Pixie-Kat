import React, { useMemo, useState } from 'react';
import { Activity, AlertCircle, Download, RefreshCw, Search } from 'lucide-react';
import { useAdminReport } from '../hooks/useAdminReport';

function downloadCsv(rows: Array<Record<string, string>>) {
  const headers = ['timestamp', 'actor', 'user', 'action', 'description', 'ip'];
  const csv = [headers, ...rows.map((row) => headers.map((key) => row[key] || ''))]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `activity-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const ActivityLogs: React.FC = () => {
  const { data, loading, error, refresh } = useAdminReport();
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');

  const rows = useMemo(() => {
    if (!data) return [];
    const profiles = new Map(data.profiles.map((profile) => [profile.id, profile]));
    const term = search.trim().toLowerCase();
    return data.activities.map((item) => {
      const actor = item.actor_id ? profiles.get(item.actor_id) : undefined;
      const user = profiles.get(item.user_id);
      return { ...item, actor, user };
    }).filter((item) => {
      if (action !== 'all' && item.action !== action) return false;
      return !term || [item.action, item.description || '', item.ip_address || '', item.actor?.name || '', item.actor?.email || '', item.user?.name || '', item.user?.email || ''].some((value) => value.toLowerCase().includes(term));
    });
  }, [action, data, search]);

  if (loading && !data) return <div className="py-24 text-center text-gray-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3" />Loading activity...</div>;
  if (error || !data) return <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700"><AlertCircle className="w-5 h-5 mb-2" />{error}<button onClick={refresh} className="btn btn-outline btn-sm ml-4">Retry</button></div>;

  const actions = [...new Set(data.activities.map((item) => item.action))].sort();
  return <div className="space-y-6">
    <div className="flex items-center justify-between"><div className="flex items-center gap-3"><Activity className="w-7 h-7 text-primary-600" /><div><h1 className="text-2xl font-bold">Activity Logs</h1><p className="text-sm text-gray-500">{data.activities.length} real events from user_activity_log</p></div></div><div className="flex gap-2"><button onClick={refresh} className="btn btn-outline btn-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={() => downloadCsv(rows.map((item) => ({ timestamp: item.created_at, actor: item.actor?.email || '', user: item.user?.email || item.user_id, action: item.action, description: item.description || '', ip: item.ip_address || '' })))} disabled={!rows.length} className="btn btn-outline btn-sm"><Download className="w-4 h-4 mr-2" />Export</button></div></div>
    <div className="bg-white border rounded-xl p-4 flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="input pl-10 w-full" placeholder="Search people, actions, descriptions or IP..." /></div><select value={action} onChange={(event) => setAction(event.target.value)} className="input sm:w-56"><option value="all">All actions</option>{actions.map((item) => <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>)}</select></div>
    <div className="bg-white border rounded-xl overflow-hidden">{rows.length === 0 ? <p className="p-12 text-center text-sm text-gray-400">No recorded activity matches these filters.</p> : <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50"><tr>{['Time', 'Actor', 'Customer', 'Action', 'Description', 'IP'].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs uppercase text-gray-500">{heading}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.id} className="hover:bg-gray-50"><td className="px-4 py-3 text-xs whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td><td className="px-4 py-3"><p className="text-sm font-medium">{row.actor?.name || 'System'}</p><p className="text-xs text-gray-500">{row.actor?.email}</p></td><td className="px-4 py-3"><p className="text-sm">{row.user?.name || 'Unknown'}</p><p className="text-xs text-gray-500">{row.user?.email || row.user_id}</p></td><td className="px-4 py-3"><span className="px-2 py-1 rounded bg-primary-50 text-primary-700 text-xs capitalize">{row.action.replace(/_/g, ' ')}</span></td><td className="px-4 py-3 text-sm text-gray-600 max-w-sm">{row.description || 'No description'}</td><td className="px-4 py-3 text-xs font-mono text-gray-500">{row.ip_address || '-'}</td></tr>)}</tbody></table></div>}</div>
  </div>;
};

export default ActivityLogs;
