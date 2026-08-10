import { useEffect, useState } from "react";

import { supabase } from "../lib/supabase";

// Fetches all active games from the `games` table,
// ordered by sort_order then created_at.
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

      if (supaErr) {
        setError(supaErr.message);
      } else {
        setGames(
          (data ?? []).map((g) => ({
            id: g.slug,
            slug: g.slug,
            name: g.name,
            subtitle: g.subtitle ?? g.name,
            image: g.image_url ?? "/img/games/mobile-legends.webp",
            currency_label: g.currency_label,
          }))
        );
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
