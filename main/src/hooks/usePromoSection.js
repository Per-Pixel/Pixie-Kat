import { useEffect, useState } from "react";

import { resolveMediaUrls, supabase } from "../lib/supabase";

// Fetches active promotional_items for a given homepage section
// ("trending" or "exclusive_offers"), ordered by sort_order.
export function usePromoSection(section) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: supaErr } = await supabase
        .from("promotional_items")
        .select("*")
        .eq("section", section)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (cancelled) return;

      if (supaErr) {
        setError(supaErr.message);
      } else {
        // Schedule filter (RLS enforces this too; kept here so items also
        // self-hide/self-publish if the schedule columns predate the row).
        const now = Date.now();
        const visible = (data ?? []).filter((item) => {
          if (item.starts_at && new Date(item.starts_at).getTime() > now) return false;
          if (item.ends_at && new Date(item.ends_at).getTime() <= now) return false;
          return true;
        });
        setItems(resolveMediaUrls(visible));
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [section]);

  return { items, loading, error };
}
