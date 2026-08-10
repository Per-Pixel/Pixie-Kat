import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  getAdminReportData,
  type AdminReportData,
} from '../services/reportingService';

const reportTables = [
  'profiles',
  'orders',
  'products',
  'wallet_transactions',
  'referrals',
  'user_activity_log',
  'user_kyc',
] as const;

export function useAdminReport() {
  const [data, setData] = useState<AdminReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAdminReportData());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const channel = supabase.channel('admin-report-live');
    reportTables.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => void refresh(),
      );
    });
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { data, loading, error, refresh };
}

