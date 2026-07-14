import { supabase } from '../lib/supabase';

export type AnalyticsPeriod = 'today' | '7d' | '30d' | '6m' | '1y' | 'all' | 'custom';

export interface AnalyticsMetrics {
  total_orders: number;
  completed_orders: number;
  failed_orders: number;
  refunded_orders: number;
  pending_orders: number;
  processing_orders: number;
  cancelled_orders: number;
  revenue: number;
  refunds: number;
  known_cost: number;
  known_profit: number;
  profit_unknown_orders: number;
  units_sold: number;
  ordering_customers: number;
}

export interface AdminAnalytics {
  metrics: AnalyticsMetrics;
  customers: {
    total_customers: number;
    new_customers: number;
    customer_wallet_balance: number;
    new: number;
    returning: number;
  };
  wallet: {
    wallet_spend: number;
    wallet_refunds: number;
    wallet_credits: number;
  };
  statuses: Array<{ status: string; count: number }>;
  trend: Array<{ bucket: string; orders: number; revenue: number; profit: number }>;
  products: Array<{ product_id: string | null; name: string; units: number; revenue: number; profit: number }>;
}

export function analyticsRange(period: AnalyticsPeriod, customStart?: string, customEnd?: string) {
  const end = customEnd && period === 'custom' ? new Date(`${customEnd}T23:59:59.999`) : new Date();
  let start: Date | null = null;

  if (period === 'custom' && customStart) start = new Date(`${customStart}T00:00:00`);
  if (period === 'today') start = new Date(new Date().setHours(0, 0, 0, 0));
  if (period === '7d') start = new Date(Date.now() - 6 * 86_400_000);
  if (period === '30d') start = new Date(Date.now() - 29 * 86_400_000);
  if (period === '6m') start = new Date(new Date().setMonth(new Date().getMonth() - 6));
  if (period === '1y') start = new Date(new Date().setFullYear(new Date().getFullYear() - 1));

  const bucket = period === '6m' || period === '1y' || period === 'all' ? 'month' : 'day';
  return { start, end, bucket };
}

export async function getAdminAnalytics(
  period: AnalyticsPeriod,
  customStart?: string,
  customEnd?: string,
  paymentMethod?: string | null,
): Promise<AdminAnalytics> {
  const { start, end, bucket } = analyticsRange(period, customStart, customEnd);
  const { data, error } = await supabase.rpc('get_admin_analytics', {
    p_start: start?.toISOString() ?? null,
    p_end: end.toISOString(),
    p_bucket: bucket,
    p_payment_method: paymentMethod ?? null,
  });
  if (error) throw error;
  return data as AdminAnalytics;
}
