import { useCallback, useEffect, useState } from 'react';
import {
  getAdminAnalytics,
  type AdminAnalytics,
  type AnalyticsPeriod,
} from '../services/adminAnalyticsService';
import type { AdminPeriod } from '../utils/dateRange';
import { localDayKey } from '../utils/localDate';

function toAnalyticsPeriod(period: AdminPeriod): AnalyticsPeriod {
  if (period === '90d' || period === '6m' || period === '1y' || period === 'all' || period === 'custom') return period;
  return period;
}

/** Same backend RPC as Deep Analytics — customer orders, SQL profit snapshots. */
export function useAdminPeriodAnalytics(
  period: AdminPeriod,
  customStart: string,
  customEnd: string,
  paymentMethod: string | null,
) {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (period === 'custom' && (!customStart || !customEnd)) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const analyticsPeriod = toAnalyticsPeriod(period);
      setData(
        await getAdminAnalytics(
          analyticsPeriod,
          period === 'custom' ? customStart : undefined,
          period === 'custom' ? customEnd : undefined,
          paymentMethod,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd, paymentMethod]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useTodayYesterdayAnalytics(paymentMethod: string | null) {
  const [today, setToday] = useState<AdminAnalytics | null>(null);
  const [yesterday, setYesterday] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yKey = localDayKey(y);
      const [todayRes, yesterdayRes] = await Promise.all([
        getAdminAnalytics('today', undefined, undefined, paymentMethod),
        getAdminAnalytics('custom', yKey, yKey, paymentMethod),
      ]);
      setToday(todayRes);
      setYesterday(yesterdayRes);
    } finally {
      setLoading(false);
    }
  }, [paymentMethod]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { today, yesterday, loading, refresh };
}
