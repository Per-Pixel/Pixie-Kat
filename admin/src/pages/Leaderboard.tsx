import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, RefreshCw, Lock, CheckCircle2,
  EyeOff, Plus, Trash2, Save, Medal,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  previewPeriod, finalizePeriod, getSettings, saveSettings,
  listPeriods, setExcluded, periodLabel, currentPeriod, previousPeriod,
  DEFAULT_LEADERBOARD_SETTINGS,
} from '../services/leaderboardService';
import type {
  LeaderboardSettings, LeaderboardTier, PreviewResponse, PeriodRow,
} from '../services/leaderboardService';

type Tab = 'standings' | 'history' | 'settings';

const FRAME_OPTIONS = ['', 'champion', 'diamond', 'gold'];

function errMsg(err: unknown, fallback: string) {
  const e = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
  return e?.response?.data?.error || e?.response?.data?.message || e?.message || fallback;
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Avatar({ url, name }: { url?: string | null; name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-primary-600 font-bold text-xs overflow-hidden">
      {url ? <img src={url} className="w-full h-full object-cover" alt={name} /> : initials}
    </div>
  );
}

// ── Standings tab ─────────────────────────────────────────────────────────────

function StandingsTab({ periods, onChanged }: { periods: PeriodRow[]; onChanged: () => void }) {
  const [period, setPeriod] = useState<string>('');
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const finalizedSet = useMemo(() => new Set(periods.map((p) => p.period)), [periods]);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try {
      setData(await previewPeriod(p || undefined));
    } catch (err) {
      toast.error(errMsg(err, 'Failed to load standings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const canFinalize = Boolean(
    data && !data.finalized && /^\d{4}-\d{2}$/.test(data.period) && data.period < currentPeriod(),
  );

  const handleFinalize = async () => {
    if (!data) return;
    const label = periodLabel(data.period);
    if (!window.confirm(
      `Finalize ${label}?\n\nThis freezes the standings permanently, grants tier perks, pays wallet bonuses, and emails winners. It cannot be undone.`,
    )) return;
    setFinalizing(true);
    try {
      const res = await finalizePeriod(data.period);
      toast.success(`${label} finalized — ${res.participants} participants, ${res.winners} winners`);
      await load(period);
      onChanged();
    } catch (err) {
      toast.error(errMsg(err, 'Failed to finalize period'));
    } finally {
      setFinalizing(false);
    }
  };

  const toggleExclude = async (userId: string, excluded: boolean) => {
    setToggling(userId);
    try {
      await setExcluded(userId, excluded);
      toast.success(excluded ? 'User excluded from leaderboard' : 'User re-included');
      await load(period);
    } catch (err) {
      toast.error(errMsg(err, 'Failed to update exclusion'));
    } finally {
      setToggling(null);
    }
  };

  const periodChoices = useMemo(() => {
    const all = [currentPeriod(), previousPeriod(), ...periods.map((p) => p.period)];
    return [...new Set(all)].sort().reverse();
  }, [periods]);

  return (
    <div className="space-y-6">
      <Card
        title="Standings"
        action={
          <div className="flex items-center gap-2">
            <select className="input !w-auto !py-1.5 text-sm" value={period || data?.period || ''} onChange={(e) => setPeriod(e.target.value)}>
              {periodChoices.map((p) => (
                <option key={p} value={p}>
                  {periodLabel(p)}{p === currentPeriod() ? ' (live)' : ''}{finalizedSet.has(p) ? ' (final)' : ''}
                </option>
              ))}
            </select>
            <button onClick={() => load(period)} className="btn btn-outline btn-sm" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      >
        {data && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${data.finalized ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              {data.finalized ? 'Finalized — frozen standings' : 'Live preview — not finalized'}
            </span>
            <span className="text-xs text-gray-400">Metric: {data.metric.replace(/_/g, ' ')}</span>
            {canFinalize && (
              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="btn btn-primary btn-sm ml-auto"
              >
                {finalizing ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <Lock className="w-4 h-4 mr-1.5" />}
                Finalize {periodLabel(data.period)}
              </button>
            )}
          </div>
        )}

        {loading ? (
          <p className="py-10 text-center text-sm text-gray-400">Loading standings…</p>
        ) : !data || data.rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No completed orders in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-3 font-semibold">Rank</th>
                  <th className="py-2 pr-3 font-semibold">Player</th>
                  <th className="py-2 pr-3 font-semibold text-right">Orders</th>
                  <th className="py-2 pr-3 font-semibold text-right">Spent</th>
                  <th className="py-2 pr-3 font-semibold">{data.finalized ? 'Tier awarded' : 'Tier preview'}</th>
                  <th className="py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.rows.map((row) => (
                  <tr key={row.user_id} className="hover:bg-gray-50/60">
                    <td className="py-3 pr-3">
                      <span className={`inline-flex w-8 h-8 items-center justify-center rounded-full text-xs font-black ${
                        row.rank === 1 ? 'bg-amber-100 text-amber-700'
                        : row.rank === 2 ? 'bg-gray-200 text-gray-700'
                        : row.rank === 3 ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-50 text-gray-500'
                      }`}>
                        {row.rank}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <Avatar url={row.avatar_url} name={row.display_name} />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{row.display_name}</p>
                          <p className="text-xs text-gray-400 truncate">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-right font-semibold text-gray-900">{row.order_count}</td>
                    <td className="py-3 pr-3 text-right text-gray-500">
                      {row.total_spent != null ? Number(row.total_spent).toFixed(2) : '—'}
                    </td>
                    <td className="py-3 pr-3">
                      {row.tier ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-600 capitalize">{row.tier}</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {!data.finalized && (
                        <button
                          onClick={() => toggleExclude(row.user_id, true)}
                          disabled={toggling === row.user_id}
                          className="btn btn-outline btn-sm text-xs"
                          title="Hide this user from the leaderboard"
                        >
                          {toggling === row.user_id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
                          Exclude
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data && data.excluded.length > 0 && (
        <Card title={`Filtered out (${data.excluded.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-3 font-semibold">Player</th>
                  <th className="py-2 pr-3 font-semibold text-right">Orders</th>
                  <th className="py-2 pr-3 font-semibold">Reason</th>
                  <th className="py-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.excluded.map((row) => (
                  <tr key={row.user_id} className="hover:bg-gray-50/60">
                    <td className="py-3 pr-3">
                      <p className="font-medium text-gray-900">{row.display_name}</p>
                      <p className="text-xs text-gray-400">{row.email}</p>
                    </td>
                    <td className="py-3 pr-3 text-right text-gray-600">{row.order_count}</td>
                    <td className="py-3 pr-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                        {row.reason.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {row.reason === 'excluded' && (
                        <button
                          onClick={() => toggleExclude(row.user_id, false)}
                          disabled={toggling === row.user_id}
                          className="btn btn-outline btn-sm text-xs"
                        >
                          {toggling === row.user_id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                          Re-include
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Staff and opted-out users are filtered automatically. Use Exclude to hide a user manually — it takes effect on live standings and future finalizations.
          </p>
        </Card>
      )}
    </div>
  );
}

// ── History tab ───────────────────────────────────────────────────────────────

function HistoryTab({ periods, loading }: { periods: PeriodRow[]; loading: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  const drill = async (period: string) => {
    setSelected(period);
    setDrillLoading(true);
    try {
      setData(await previewPeriod(period));
    } catch (err) {
      toast.error(errMsg(err, 'Failed to load awards'));
      setSelected(null);
    } finally {
      setDrillLoading(false);
    }
  };

  if (selected) {
    return (
      <Card
        title={`${periodLabel(selected)} — final standings`}
        action={<button onClick={() => { setSelected(null); setData(null); }} className="btn btn-outline btn-sm">Back to periods</button>}
      >
        {drillLoading || !data ? (
          <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-3 font-semibold">Rank</th>
                  <th className="py-2 pr-3 font-semibold">Player</th>
                  <th className="py-2 pr-3 font-semibold text-right">Orders</th>
                  <th className="py-2 pr-3 font-semibold text-right">Spent</th>
                  <th className="py-2 font-semibold">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.rows.map((row) => (
                  <tr key={row.user_id}>
                    <td className="py-3 pr-3 font-bold text-gray-700">#{row.rank}</td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <Avatar url={row.avatar_url} name={row.display_name} />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{row.display_name}</p>
                          <p className="text-xs text-gray-400 truncate">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-right font-semibold text-gray-900">{row.order_count}</td>
                    <td className="py-3 pr-3 text-right text-gray-500">
                      {row.total_spent != null ? Number(row.total_spent).toFixed(2) : '—'}
                    </td>
                    <td className="py-3">
                      {row.tier ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-600 capitalize">{row.tier}</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card title="Finalized periods">
      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
      ) : periods.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">
          Nothing finalized yet. Open Standings on a past month and click Finalize.
        </p>
      ) : (
        <div className="divide-y divide-gray-50">
          {periods.map((p) => (
            <button
              key={p.period}
              onClick={() => drill(p.period)}
              className="w-full flex items-center justify-between py-3 text-left hover:bg-gray-50/60 px-2 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-900">{periodLabel(p.period)}</p>
                <p className="text-xs text-gray-400">
                  {p.participant_count} participants · finalized {new Date(p.finalized_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <Medal className="w-4 h-4 text-gray-300" />
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Settings tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  const [settings, setSettings] = useState<LeaderboardSettings>(DEFAULT_LEADERBOARD_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch((err) => toast.error(errMsg(err, 'Failed to load settings')))
      .finally(() => setLoading(false));
  }, []);

  const setField = <K extends keyof LeaderboardSettings>(key: K, value: LeaderboardSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const setTier = (index: number, patch: Partial<LeaderboardTier>) =>
    setSettings((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }));

  const addTier = () =>
    setSettings((prev) => ({
      ...prev,
      tiers: [
        ...prev.tiers,
        {
          id: `tier_${prev.tiers.length + 1}`,
          min_rank: (prev.tiers[prev.tiers.length - 1]?.max_rank ?? 0) + 1,
          max_rank: (prev.tiers[prev.tiers.length - 1]?.max_rank ?? 0) + 5,
          label: 'New tier',
          frame: '',
          gif_avatar: false,
          wallet_bonus: 0,
        },
      ],
    }));

  const removeTier = (index: number) =>
    setSettings((prev) => ({ ...prev, tiers: prev.tiers.filter((_, i) => i !== index) }));

  const save = async () => {
    // Basic validation — overlapping/invalid ranges would silently mis-assign tiers.
    const sorted = [...settings.tiers].sort((a, b) => a.min_rank - b.min_rank);
    for (const t of sorted) {
      if (!t.id.trim() || !t.label.trim()) { toast.error('Every tier needs an id and label'); return; }
      if (t.min_rank < 1 || t.max_rank < t.min_rank) { toast.error(`Tier "${t.label}" has an invalid rank range`); return; }
    }
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].min_rank <= sorted[i - 1].max_rank) {
        toast.error(`Rank ranges overlap: "${sorted[i - 1].label}" and "${sorted[i].label}"`);
        return;
      }
    }
    setSaving(true);
    try {
      await saveSettings(settings);
      toast.success('Leaderboard settings saved');
    } catch (err) {
      toast.error(errMsg(err, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Card title="Settings"><p className="py-10 text-center text-sm text-gray-400">Loading…</p></Card>;
  }

  return (
    <div className="space-y-6">
      <Card title="General">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
            <span className="text-sm font-medium text-gray-700">Leaderboard enabled</span>
            <input
              type="checkbox"
              className="w-4 h-4 accent-primary-600"
              checked={settings.enabled}
              onChange={(e) => setField('enabled', e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
            <span className="text-sm font-medium text-gray-700">Show spend amounts publicly</span>
            <input
              type="checkbox"
              className="w-4 h-4 accent-primary-600"
              checked={settings.show_amounts}
              onChange={(e) => setField('show_amounts', e.target.checked)}
            />
          </label>
          <div>
            <label className="label block mb-1.5">Homepage teaser count</label>
            <input
              type="number" min={1} max={20} className="input"
              value={settings.teaser_count}
              onChange={(e) => setField('teaser_count', Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div>
            <label className="label block mb-1.5">Rank history months</label>
            <input
              type="number" min={1} max={36} className="input"
              value={settings.history_months}
              onChange={(e) => setField('history_months', Math.max(1, Math.min(36, Number(e.target.value) || 12)))}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Ranking metric is completed order count per calendar month (UTC). Stored in <code className="text-xs bg-gray-100 px-1 rounded">store_settings.leaderboard_settings</code>.
        </p>
      </Card>

      <Card
        title="Reward tiers"
        action={<button onClick={addTier} className="btn btn-outline btn-sm"><Plus className="w-4 h-4 mr-1" />Add tier</button>}
      >
        <div className="space-y-4">
          {settings.tiers.map((tier, index) => (
            <div key={index} className="rounded-lg border border-gray-200 p-4">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="label block mb-1">Label</label>
                  <input className="input" value={tier.label} onChange={(e) => setTier(index, { label: e.target.value })} />
                </div>
                <div>
                  <label className="label block mb-1">ID</label>
                  <input className="input" value={tier.id} onChange={(e) => setTier(index, { id: e.target.value.trim() })} />
                </div>
                <div>
                  <label className="label block mb-1">Rank from</label>
                  <input type="number" min={1} className="input" value={tier.min_rank} onChange={(e) => setTier(index, { min_rank: Number(e.target.value) || 1 })} />
                </div>
                <div>
                  <label className="label block mb-1">Rank to</label>
                  <input type="number" min={1} className="input" value={tier.max_rank} onChange={(e) => setTier(index, { max_rank: Number(e.target.value) || 1 })} />
                </div>
                <div>
                  <label className="label block mb-1">Avatar frame</label>
                  <select className="input" value={tier.frame ?? ''} onChange={(e) => setTier(index, { frame: e.target.value })}>
                    {FRAME_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f === '' ? 'None' : f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label block mb-1">Wallet bonus (PKS)</label>
                  <input type="number" min={0} className="input" value={tier.wallet_bonus ?? 0} onChange={(e) => setTier(index, { wallet_bonus: Math.max(0, Number(e.target.value) || 0) })} />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary-600"
                    checked={Boolean(tier.gif_avatar)}
                    onChange={(e) => setTier(index, { gif_avatar: e.target.checked })}
                  />
                  GIF avatar privilege
                </label>
                <button onClick={() => removeTier(index)} className="btn btn-outline btn-sm text-red-600">
                  <Trash2 className="w-4 h-4 mr-1" />Remove
                </button>
              </div>
            </div>
          ))}
          {settings.tiers.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400">No tiers — finalized months grant no perks.</p>
          )}
        </div>
      </Card>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn btn-primary btn-md">
          {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('standings');
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);

  const loadPeriods = useCallback(async () => {
    setPeriodsLoading(true);
    try {
      setPeriods(await listPeriods());
    } catch (err) {
      toast.error(errMsg(err, 'Failed to load finalized periods'));
    } finally {
      setPeriodsLoading(false);
    }
  }, []);

  useEffect(() => { loadPeriods(); }, [loadPeriods]);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'standings', label: 'Standings' },
    { id: 'history', label: 'History' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <div className="p-2.5 bg-amber-50 rounded-xl">
          <Trophy className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leaderboard</h1>
          <p className="text-sm text-gray-500">
            Monthly order-count rankings. Finalize a past month to freeze standings and grant perks.
          </p>
        </div>
      </motion.div>

      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'standings' && <StandingsTab periods={periods} onChanged={loadPeriods} />}
      {tab === 'history' && <HistoryTab periods={periods} loading={periodsLoading} />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}
