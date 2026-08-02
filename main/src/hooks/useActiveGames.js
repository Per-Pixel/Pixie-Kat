import { useEffect, useState } from "react";

import { supabase } from "../lib/supabase";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

function mapGameRow(g) {
  return {
    id: g.slug,
    slug: g.slug,
    name: g.name,
    subtitle: g.subtitle ?? g.name,
    image: g.image_url ?? "/img/games/mobile-legends.webp",
    currency_label: g.currency_label,
  };
}

async function fetchViaApi() {
  const res = await fetch(`${API_BASE}/catalog/games`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) {
    throw new Error(body.error || `Catalog API failed (${res.status})`);
  }
  return (body.games ?? []).map(mapGameRow);
}

// Fetches all active games from the `games` table,
// ordered by sort_order then created_at.
// Falls back to the Express catalog proxy when anon RLS helpers are broken.
export function useActiveGames() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: supaErr } = await supabase
        .from("games")
        .select("id, slug, name, subtitle, image_url, banner_url, category, currency_label, is_featured, sort_order")
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (!supaErr) {
        if (import.meta.env.DEV) {
          const rows = data ?? [];
          console.info(
            `[useActiveGames] Supabase returned ${rows.length} active game(s): ${
              rows.map((game) => game.slug).join(", ") || "none"
            }`,
            rows
          );
        }
        setGames((data ?? []).map(mapGameRow));
        setLoading(false);
        return;
      }

      if (import.meta.env.DEV) {
        console.warn("[useActiveGames] Supabase query failed, trying catalog API", supaErr);
      }

      try {
        const apiGames = await fetchViaApi();
        if (cancelled) return;
        if (import.meta.env.DEV) {
          console.info(
            `[useActiveGames] Catalog API returned ${apiGames.length} game(s): ${
              apiGames.map((game) => game.slug).join(", ") || "none"
            }`
          );
        }
        setGames(apiGames);
      } catch (apiErr) {
        if (cancelled) return;
        console.error("[useActiveGames] Catalog API also failed", apiErr);
        setError(apiErr.message || supaErr.message);
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { games, loading, error };
}
