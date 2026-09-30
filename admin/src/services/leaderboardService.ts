import { api } from './api';
import { supabase } from '../lib/supabase';

export interface LeaderboardTier {
  id: string;
  min_rank: number;
  max_rank: number;
  label: string;
  frame?: string;
  gif_avatar?: boolean;
  wallet_bonus?: number;
}

export interface LeaderboardSettings {
  enabled: boolean;
  metric: string;
  show_amounts: boolean;
  teaser_count: number;
  history_months: number;
  tiers: LeaderboardTier[];
}

export const DEFAULT_LEADERBOARD_SETTINGS: LeaderboardSettings = {
  enabled: true,
  metric: 'completed_orders',
  show_amounts: false,
  teaser_count: 5,
  history_months: 12,
  tiers: [
    { id: 'champion', min_rank: 1, max_rank: 1,  label: 'Champion', frame: 'champion', gif_avatar: true,  wallet_bonus: 250 },
    { id: 'diamond',  min_rank: 2, max_rank: 3,  label: 'Diamond',  frame: 'diamond',  gif_avatar: true,  wallet_bonus: 100 },
    { id: 'gold',     min_rank: 4, max_rank: 10, label: 'Gold',     frame: 'gold',     gif_avatar: false, wallet_bonus: 50 },
  ],
};

export interface StandingRow {
  rank: number;
  user_id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  avatar_frame: string | null;
  order_count: number;
  total_spent: number | null;
  tier: string | null;
  opted_out: boolean;
  excluded: boolean;
}

export interface ExcludedRow {
  user_id: string;
  email: string | null;
  display_name: string;
  order_count: number;
  reason: 'staff' | 'inactive' | 'excluded' | 'opted_out' | 'other';
}

export interface PreviewResponse {
  ok: boolean;
  period: string;
  finalized: boolean;
  metric: string;
  rows: StandingRow[];
  excluded: ExcludedRow[];
  tiers: LeaderboardTier[];
}

export interface PeriodRow {
  period: string;
  metric: string;
  participant_count: number;
  finalized_at: string;
  finalized_by: string | null;
}

export interface UserPerk {
  id: string;
  user_id: string;
  perk: string;
  value: string | null;
  source: 'leaderboard' | 'admin';
  source_period: string | null;
  expires_at: string | null;
  granted_by: string | null;
  created_at: string;
}

export async function previewPeriod(period?: string): Promise<PreviewResponse> {
  const { data } = await api.get<PreviewResponse>('/admin/leaderboard/preview', {
    params: period ? { period } : {},
  });
  return data;
}

export async function finalizePeriod(period: string) {
  const { data } = await api.post<{ ok: boolean; period: string; participants: number; winners: number }>(
    '/admin/leaderboard/finalize',
    { period },
  );
  return data;
}

export async function getSettings(): Promise<LeaderboardSettings> {
  const { data, error } = await supabase
    .from('store_settings')
    .select('leaderboard_settings')
    .maybeSingle();
  if (error) throw error;
  const saved = (data?.leaderboard_settings ?? {}) as Partial<LeaderboardSettings>;
  return {
    ...DEFAULT_LEADERBOARD_SETTINGS,
    ...saved,
    tiers: Array.isArray(saved.tiers) && saved.tiers.length > 0
      ? saved.tiers
      : DEFAULT_LEADERBOARD_SETTINGS.tiers,
  };
}

export async function saveSettings(settings: LeaderboardSettings): Promise<void> {
  const { error } = await supabase
    .from('store_settings')
    .upsert({ id: true, leaderboard_settings: settings, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) throw error;
}

export async function listPeriods(): Promise<PeriodRow[]> {
  const { data, error } = await supabase
    .from('leaderboard_periods')
    .select('period, metric, participant_count, finalized_at, finalized_by')
    .order('period', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PeriodRow[];
}

export async function setExcluded(userId: string, excluded: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ leaderboard_exclude: excluded, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

// ── Manual perk management (user detail card) ────────────────────────────────

export async function listUserPerks(userId: string): Promise<UserPerk[]> {
  const { data, error } = await supabase
    .from('user_perks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserPerk[];
}

export async function grantPerk(userId: string, perk: string, value?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('user_perks')
    .upsert(
      {
        user_id: userId,
        perk,
        value: value ?? null,
        source: 'admin',
        source_period: null,
        expires_at: null,
        granted_by: user?.id ?? null,
      },
      { onConflict: 'user_id,perk' },
    );
  if (error) throw error;
  const { error: rpcError } = await supabase.rpc('refresh_user_perks', { p_user_id: userId });
  if (rpcError) throw rpcError;
}

export async function revokePerk(userId: string, perk: string): Promise<void> {
  const { error } = await supabase
    .from('user_perks')
    .delete()
    .eq('user_id', userId)
    .eq('perk', perk);
  if (error) throw error;
  const { error: rpcError } = await supabase.rpc('refresh_user_perks', { p_user_id: userId });
  if (rpcError) throw rpcError;
}

export function periodLabel(period: string): string {
  if (!/^\d{4}-\d{2}$/.test(period)) return period;
  const [y, m] = period.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function previousPeriod(): string {
  const now = new Date();
  return `${new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).getUTCFullYear()}-${String(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).getUTCMonth() + 1,
  ).padStart(2, '0')}`;
}
