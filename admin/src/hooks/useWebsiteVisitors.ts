import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AdminPeriod, adminPeriodBounds } from '../utils/dateRange';

export type WebsiteVisitorStats = {
  people: number;
  devices: Array<{ name: string; people: number }>;
  places: Array<{ name: string; people: number }>;
};

function parseVisitSummary(summary: unknown): WebsiteVisitorStats {
  const row = (summary ?? {}) as {
    people?: number;
    devices?: Array<{ name?: string; people?: number }>;
    places?: Array<{ name?: string; people?: number }>;
  };
  const slices = (rows: Array<{ name?: string; people?: number }> | undefined) =>
    (Array.isArray(rows) ? rows : [])
      .map((item) => ({ name: String(item?.name || 'Unknown'), people: Number(item?.people) || 0 }))
      .filter((item) => item.people > 0);
  return {
    people: Number(row.people) || 0,
    devices: slices(row.devices),
    places: slices(row.places),
  };
}

export function useWebsiteVisitors(period: AdminPeriod, customStart = '', customEnd = '') {
  const [visits, setVisits] = useState<WebsiteVisitorStats | null>(null);
  const [visitsNote, setVisitsNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const { start, end } = adminPeriodBounds(period, customStart, customEnd);
    supabase.rpc('get_visit_summary', { p_start: start, p_end: end }).then(({ data: summary, error: rpcError }) => {
      if (cancelled) return;
      setLoading(false);
      if (rpcError) {
        setVisits(null);
        setVisitsNote(`Could not load visitor stats: ${rpcError.message}`);
        return;
      }
      setVisits(parseVisitSummary(summary));
      setVisitsNote(null);
    });
    return () => {
      cancelled = true;
    };
  }, [period, customStart, customEnd]);

  return { visits, visitsNote, loading };
}
