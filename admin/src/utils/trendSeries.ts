import type { AdminPeriod } from './dateRange';
import type { ReportOrder, ReportProduct } from '../services/reportingService';
import { isSaleOrderForAnalytics, orderKnownGrossProfit } from './orderFinance';
import { localDayKey, startOfLocalDay } from './localDate';

export interface TrendPoint {
  date: string;
  label: string;
  revenue: number;
  profit: number;
  orders: number;
}

function parseCustomDay(s: string): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Inclusive local-calendar span for the dashboard period control. */
export function calendarSpanForPeriod(
  period: AdminPeriod,
  customStart = '',
  customEnd = '',
  reference: Date = new Date(),
): { start: Date; end: Date; useMonthly: boolean } {
  const end = startOfLocalDay(reference);

  if (period === 'custom') {
    const start = parseCustomDay(customStart) ?? new Date(end.getTime() - 6 * 86_400_000);
    const endDay = parseCustomDay(customEnd) ?? end;
    return { start: startOfLocalDay(start), end: startOfLocalDay(endDay), useMonthly: false };
  }

  if (period === 'all' || period === '1y') {
    return { start: new Date(end.getFullYear(), end.getMonth() - (period === '1y' ? 11 : 0), 1), end, useMonthly: true };
  }

  if (period === '6m') {
    const start = new Date(end);
    start.setMonth(start.getMonth() - 5);
    start.setDate(1);
    return { start, end, useMonthly: true };
  }

  const daysBack =
    period === 'today' ? 0
    : period === '7d' ? 6
    : period === '30d' ? 29
    : period === '90d' ? 89
    : 6;

  const start = new Date(end);
  start.setDate(start.getDate() - daysBack);
  return { start, end, useMonthly: false };
}

function enumerateLocalDays(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    out.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function toNumber(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

export function buildRevenueProfitTrend(
  orders: ReportOrder[],
  products: ReportProduct[],
  period: AdminPeriod,
  customStart = '',
  customEnd = '',
  reference: Date = new Date(),
): TrendPoint[] {
  const productsById = new Map(products.map((p) => [p.id, p]));
  const productsByName = new Map(products.map((p) => [p.name, p]));
  const { start, end, useMonthly } = calendarSpanForPeriod(period, customStart, customEnd, reference);

  if (useMonthly) {
    const bucketMap = new Map<string, TrendPoint>();
    orders.forEach((o) => {
      const d = new Date(o.created_at);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const existing = bucketMap.get(key) ?? {
        date: key,
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: 0,
        profit: 0,
        orders: 0,
      };
      existing.orders += 1;
      if (o.status === 'completed' && isSaleOrderForAnalytics(o)) {
        existing.revenue += toNumber(o.total_amount);
        const pl = orderKnownGrossProfit(o, productsById, productsByName);
        if (pl) existing.profit += pl.profit;
      }
      bucketMap.set(key, existing);
    });
    return Array.from(bucketMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  const dayList = enumerateLocalDays(start, end);
  const map = new Map<string, TrendPoint>();
  dayList.forEach((d) => {
    const key = localDayKey(d);
    map.set(key, {
      date: key,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: 0,
      profit: 0,
      orders: 0,
    });
  });

  orders.forEach((o) => {
    const key = localDayKey(o.created_at);
    const bucket = map.get(key);
    if (!bucket) return;
    bucket.orders += 1;
    if (o.status === 'completed' && isSaleOrderForAnalytics(o)) {
      bucket.revenue += toNumber(o.total_amount);
      const pl = orderKnownGrossProfit(o, productsById, productsByName);
      if (pl) bucket.profit += pl.profit;
    }
  });

  return Array.from(map.values());
}
