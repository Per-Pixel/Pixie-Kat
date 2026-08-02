import { useEffect, useState } from "react";

import { supabase } from "../../lib/supabase";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

async function fetchViaApi(slug) {
  const res = await fetch(`${API_BASE}/catalog/games/${encodeURIComponent(slug)}`);
  const body = await res.json().catch(() => ({}));
  if (res.status === 404) {
    return { notFound: true };
  }
  if (!res.ok || !body.ok) {
    throw new Error(body.error || `Catalog API failed (${res.status})`);
  }
  return {
    notFound: false,
    game: body.game,
    fields: body.fields ?? [],
    products: body.products ?? [],
  };
}

// Loads a single active game by slug, together with its dynamic
// player-identification fields and its top-up packages (products).
// Falls back to the Express catalog proxy when anon RLS helpers are broken.
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

      if (!error && data) {
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
        return;
      }

      if (!error && !data) {
        // Direct query returned empty — may be RLS hiding the row. Try proxy.
        try {
          const api = await fetchViaApi(slug);
          if (cancelled) return;
          if (api.notFound) {
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
          setState({
            loading: false,
            notFound: false,
            error: null,
            game: api.game,
            fields: api.fields,
            products: api.products,
          });
        } catch (apiErr) {
          if (cancelled) return;
          setState({
            loading: false,
            notFound: true,
            error: null,
            game: null,
            fields: [],
            products: [],
          });
        }
        return;
      }

      if (import.meta.env.DEV) {
        console.warn("[useGameCatalog] Supabase query failed, trying catalog API", error);
      }

      try {
        const api = await fetchViaApi(slug);
        if (cancelled) return;
        if (api.notFound) {
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
        setState({
          loading: false,
          notFound: false,
          error: null,
          game: api.game,
          fields: api.fields,
          products: api.products,
        });
      } catch (apiErr) {
        if (cancelled) return;
        setState({
          loading: false,
          notFound: false,
          error: apiErr.message || error.message,
          game: null,
          fields: [],
          products: [],
        });
      }
    }

    if (slug) load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return state;
}
