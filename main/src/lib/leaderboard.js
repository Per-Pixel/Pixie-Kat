import { API_BASE } from "./apiBase";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Fetchers — thin wrappers over main/server leaderboard endpoints.
// ---------------------------------------------------------------------------

export async function fetchLeaderboard(period = null, limit = 50) {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  params.set("limit", String(limit));

  const res = await fetch(`${API_BASE}/leaderboard?${params.toString()}`);
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok) {
    throw new Error(body?.error || "Failed to load leaderboard");
  }
  return body;
}

export async function fetchMyRankHistory(months = 12) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { history: [] };

  const res = await fetch(`${API_BASE}/leaderboard/me?months=${months}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok) {
    throw new Error(body?.error || "Failed to load rank history");
  }
  return body;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

// Mirror of SQL leaderboard_display_name(): username preferred, else masked name.
export function maskName(name, username) {
  const trimmed = (username || "").trim();
  if (trimmed) return trimmed;
  const n = (name || "").trim();
  if (!n) return "Player";
  if (n.length <= 2) return `${n[0]}***`;
  return `${n[0]}***${n[n.length - 1]}`;
}

// First matching tier for a rank, or null. Tiers come from
// store_settings.leaderboard_settings.tiers.
export function tierForRank(rank, settings) {
  const tiers = Array.isArray(settings?.tiers) ? settings.tiers : [];
  return tiers.find((t) => rank >= Number(t.min_rank) && rank <= Number(t.max_rank)) || null;
}

// Frame ring styles keyed by frame id. Kept intentionally simple — the
// visual pass can replace these with richer treatments later.
export const FRAME_STYLES = {
  champion: {
    ring: "bg-[conic-gradient(from_0deg,#f59e0b,#a855f7,#f59e0b)]",
    badge: "bg-amber-400 text-amber-950",
    label: "Champion",
  },
  diamond: {
    ring: "bg-gradient-to-br from-cyan-300 via-sky-400 to-blue-500",
    badge: "bg-sky-300 text-sky-950",
    label: "Diamond",
  },
  gold: {
    ring: "bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500",
    badge: "bg-yellow-300 text-yellow-950",
    label: "Gold",
  },
};

export function frameStyle(frameId) {
  return FRAME_STYLES[frameId] || {
    ring: "bg-gradient-to-br from-violet-300 to-violet-500",
    badge: "bg-violet-300 text-violet-950",
    label: frameId ? String(frameId) : "",
  };
}

// 'YYYY-MM' -> 'September 2026' (UTC-safe: parse as first of month UTC).
export function periodLabel(period) {
  if (!/^\d{4}-\d{2}$/.test(String(period || ""))) return String(period || "");
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function currentPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function rankForPeriod(history, period) {
  if (!Array.isArray(history)) return null;
  return history.find((row) => row.period === period) ?? null;
}
