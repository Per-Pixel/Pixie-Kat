import { useEffect, useState } from "react";

import { supabase } from "../../lib/supabase";

// Loads a single active game by slug, together with its dynamic
// player-identification fields and its top-up packages (products).
export function useGameCatalog(slug) {
  const [state, setState] = useState({
    loading: true,
    notFound: false,
    error: null,
    game: null,
    fields: [],
    products: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase
        .from("games")
        .select("*, game_fields(*), products(*)")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setState({
          loading: false,
          notFound: false,
          error: error.message,
          game: null,
          fields: [],
          products: [],
        });
        return;
      }

      if (!data) {
        setState({
          loading: false,
          notFound: true,
          error: null,
          game: null,
          fields: [],
          products: [],
        });
        return;
      }

      const fields = (data.game_fields ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order);

      const products = (data.products ?? [])
        .filter((p) => p.status === "active")
        .sort((a, b) => a.sort_order - b.sort_order);

      setState({
        loading: false,
        notFound: false,
        error: null,
        game: data,
        fields,
        products,
      });
    }

    if (slug) load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return state;
}
