import type {
  AdminReportData,
  ReportOrder,
  ReportProduct,
} from '../services/reportingService';

export type DashboardPeriod = 'today' | '7d' | '30d' | 'lifetime';

function dayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function startOfDay(value: Date) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function periodStart(period: DashboardPeriod, reference: Date = new Date()): Date | null {
  if (period === 'lifetime') return null;
  const now = new Date(reference);
  if (period === 'today') return startOfDay(now);
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 0;
  return new Date(startOfDay(now).getTime() - (days - 1) * 86_400_000);
}

export function isInPeriod(dateStr: string, period: DashboardPeriod, reference: Date = new Date()): boolean {
  if (period === 'lifetime') return true;
  const start = periodStart(period, reference);
  if (!start) return true;
  const date = new Date(dateStr);
  return date >= start && date <= reference;
}

export function money(value: number, currency = 'INR') {
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export function toNumber(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

export interface FinancialSnapshot {
  revenue: number;
  cogs: number;
  grossProfit: number;
  refunds: number;
  paymentFees: number;
  otherExpenses: number;
  netProfit: number;
  profitMargin: number;
  successfulOrders: number;
  successfulValue: number;
  failedOrders: number;
  failedValue: number;
  pendingOrders: number;
  pendingValue: number;
  refundedOrders: number;
  lostRevenue: number;
  aov: number;
  avgProfitPerOrder: number;
}

export function computeFinancials(
  orders: ReportOrder[],
  options: { paymentFees?: number; otherExpenses?: number } = {},
): FinancialSnapshot {
  const successful = orders.filter((o) => o.status === 'completed');
  const failed = orders.filter((o) => o.status === 'failed');
  const pending = orders.filter((o) => ['pending', 'processing', 'on_hold'].includes(o.status));
  const refunded = orders.filter((o) => o.status === 'refunded');
  const lost = orders.filter((o) => ['failed', 'cancelled'].includes(o.status));

  const revenue = successful.reduce((sum, o) => sum + toNumber(o.total_amount), 0);
  const cogs = successful.reduce((sum, o) => sum + toNumber(o.unit_cost_price) * (o.quantity || 1), 0);
  const grossProfit = revenue - cogs;
  const refunds = refunded.reduce((sum, o) => sum + toNumber(o.total_amount), 0);
  const paymentFees = options.paymentFees ?? 0;
  const otherExpenses = options.otherExpenses ?? 0;
  const netProfit = grossProfit - refunds - paymentFees - otherExpenses;
  const profitMargin = revenue ? (grossProfit / revenue) * 100 : 0;
  const aov = successful.length ? revenue / successful.length : 0;
  const avgProfitPerOrder = successful.length ? grossProfit / successful.length : 0;

  return {
    revenue,
    cogs,
    grossProfit,
    refunds,
    paymentFees,
    otherExpenses,
    netProfit,
    profitMargin,
    successfulOrders: successful.length,
    successfulValue: revenue,
    failedOrders: failed.length,
    failedValue: failed.reduce((sum, o) => sum + toNumber(o.total_amount), 0),
    pendingOrders: pending.length,
    pendingValue: pending.reduce((sum, o) => sum + toNumber(o.total_amount), 0),
    refundedOrders: refunded.length,
    lostRevenue: lost.reduce((sum, o) => sum + toNumber(o.total_amount), 0),
    aov,
    avgProfitPerOrder,
  };
}

export interface TodayVsYesterday {
  revenue: { today: number; yesterday: number; change: number };
  profit: { today: number; yesterday: number; change: number };
}

export function computeTodayVsYesterday(orders: ReportOrder[], reference: Date = new Date()): TodayVsYesterday {
  const today = dayKey(reference);
  const yesterdayDate = new Date(reference);
  yesterdayDate.setDate(reference.getDate() - 1);
  const yesterday = dayKey(yesterdayDate);

  const completed = orders.filter((o) => o.status === 'completed');
  const revenueToday = completed
    .filter((o) => dayKey(new Date(o.created_at)) === today)
    .reduce((sum, o) => sum + toNumber(o.total_amount), 0);
  const revenueYesterday = completed
    .filter((o) => dayKey(new Date(o.created_at)) === yesterday)
    .reduce((sum, o) => sum + toNumber(o.total_amount), 0);

  const profitToday = completed
    .filter((o) => dayKey(new Date(o.created_at)) === today)
    .reduce((sum, o) => sum + (toNumber(o.total_amount) - toNumber(o.unit_cost_price) * (o.quantity || 1)), 0);
  const profitYesterday = completed
    .filter((o) => dayKey(new Date(o.created_at)) === yesterday)
    .reduce((sum, o) => sum + (toNumber(o.total_amount) - toNumber(o.unit_cost_price) * (o.quantity || 1)), 0);

  return {
    revenue: {
      today: revenueToday,
      yesterday: revenueYesterday,
      change: percentChange(revenueToday, revenueYesterday),
    },
    profit: {
      today: profitToday,
      yesterday: profitYesterday,
      change: percentChange(profitToday, profitYesterday),
    },
  };
}

export interface ProductPerformance {
  id: string;
  name: string;
  gameName: string;
  provider: string;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
}

export function computeProductPerformance(
  orders: ReportOrder[],
  products: ReportProduct[],
): ProductPerformance[] {
  const map = new Map<string, ProductPerformance>();
  const productById = new Map(products.map((p) => [p.id, p]));

  orders
    .filter((o) => o.status === 'completed')
    .forEach((o) => {
      const key = o.product_id || o.product_name;
      const product = o.product_id ? productById.get(o.product_id) : undefined;
      const existing = map.get(key);
      if (existing) {
        existing.units += o.quantity || 1;
        existing.revenue += toNumber(o.total_amount);
        existing.cost += toNumber(o.unit_cost_price) * (o.quantity || 1);
        existing.profit = existing.revenue - existing.cost;
      } else {
        map.set(key, {
          id: key,
          name: o.product_name,
          gameName: product?.game?.name || '—',
          provider: product?.game?.provider || 'manual',
          units: o.quantity || 1,
          revenue: toNumber(o.total_amount),
          cost: toNumber(o.unit_cost_price) * (o.quantity || 1),
          profit: toNumber(o.total_amount) - toNumber(o.unit_cost_price) * (o.quantity || 1),
        });
      }
    });

  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export interface GamePerformance {
  id: string;
  name: string;
  orders: number;
  units: number;
  revenue: number;
  profit: number;
}

export function computeGamePerformance(
  orders: ReportOrder[],
  products: ReportProduct[],
): GamePerformance[] {
  const productById = new Map(products.map((p) => [p.id, p]));
  const map = new Map<string, GamePerformance>();

  orders
    .filter((o) => o.status === 'completed')
    .forEach((o) => {
      const product = o.product_id ? productById.get(o.product_id) : undefined;
      const gameId = product?.game_id || 'unknown';
      const gameName = product?.game?.name || 'Unknown Game';
      const existing = map.get(gameId);
      const revenue = toNumber(o.total_amount);
      const cost = toNumber(o.unit_cost_price) * (o.quantity || 1);
      if (existing) {
        existing.orders += 1;
        existing.units += o.quantity || 1;
        existing.revenue += revenue;
        existing.profit += revenue - cost;
      } else {
        map.set(gameId, {
          id: gameId,
          name: gameName,
          orders: 1,
          units: o.quantity || 1,
          revenue,
          profit: revenue - cost,
        });
      }
    });

  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export interface SupplierPerformance {
  provider: string;
  label: string;
  orders: number;
  successful: number;
  failed: number;
  revenue: number;
  spend: number;
  successRate: number;
}

const PROVIDER_LABELS: Record<string, string> = {
  manual: 'Manual',
  smile_one: 'Smile One',
  other: 'Other API',
};

export function computeSupplierPerformance(
  orders: ReportOrder[],
  products: ReportProduct[],
): SupplierPerformance[] {
  const productById = new Map(products.map((p) => [p.id, p]));
  const map = new Map<string, SupplierPerformance>();

  orders.forEach((o) => {
    const product = o.product_id ? productById.get(o.product_id) : undefined;
    const provider = product?.game?.provider || 'manual';
    const existing = map.get(provider) || {
      provider,
      label: PROVIDER_LABELS[provider] || provider,
      orders: 0,
      successful: 0,
      failed: 0,
      revenue: 0,
      spend: 0,
      successRate: 0,
    };
    existing.orders += 1;
    existing.revenue += toNumber(o.total_amount);
    if (o.status === 'completed') {
      existing.successful += 1;
      existing.spend += toNumber(o.unit_cost_price) * (o.quantity || 1);
    }
    if (o.status === 'failed') existing.failed += 1;
    map.set(provider, existing);
  });

  const result = Array.from(map.values());
  result.forEach((s) => {
    s.successRate = s.orders ? (s.successful / s.orders) * 100 : 0;
  });
  return result.sort((a, b) => b.spend - a.spend);
}

export interface CustomerInsight {
  id: string;
  name: string;
  email: string;
  orders: number;
  spent: number;
  profit: number;
  firstOrder: string | null;
  lastOrder: string | null;
}

export function computeCustomerInsights(
  orders: ReportOrder[],
  profiles: AdminReportData['profiles'],
): CustomerInsight[] {
  const map = new Map<string, CustomerInsight>();

  orders
    .filter((o) => !['admin'].includes(profiles.find((p) => p.id === o.user_id)?.role || ''))
    .forEach((o) => {
      const profile = profiles.find((p) => p.id === o.user_id);
      const existing = map.get(o.user_id);
      const revenue = toNumber(o.total_amount);
      const cost = o.status === 'completed' ? toNumber(o.unit_cost_price) * (o.quantity || 1) : 0;
      if (existing) {
        existing.orders += 1;
        existing.spent += revenue;
        existing.profit += revenue - cost;
        existing.lastOrder = o.created_at;
      } else {
        map.set(o.user_id, {
          id: o.user_id,
          name: profile?.name || o.profiles?.name || 'Unknown',
          email: profile?.email || o.profiles?.email || '',
          orders: 1,
          spent: revenue,
          profit: revenue - cost,
          firstOrder: o.created_at,
          lastOrder: o.created_at,
        });
      }
    });

  return Array.from(map.values()).sort((a, b) => b.spent - a.spent);
}

export interface RepeatCustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  repeatPurchaseRate: number;
}

export function computeRepeatMetrics(
  orders: ReportOrder[],
  profiles: AdminReportData['profiles'],
  period: DashboardPeriod,
  reference: Date = new Date(),
): RepeatCustomerMetrics {
  const periodOrders = orders.filter((o) => isInPeriod(o.created_at, period, reference));
  const insights = computeCustomerInsights(periodOrders, profiles);
  const newCustomers = insights.filter((c) => c.orders === 1).length;
  const returningCustomers = insights.filter((c) => c.orders > 1).length;
  const totalCustomers = insights.length;
  const repeatPurchaseRate = totalCustomers ? (returningCustomers / totalCustomers) * 100 : 0;

  return {
    totalCustomers,
    newCustomers,
    returningCustomers,
    repeatPurchaseRate,
  };
}

export interface PaymentMethodBreakdown {
  method: string;
  orders: number;
  revenue: number;
}

export function computePaymentMethodBreakdown(orders: ReportOrder[]): PaymentMethodBreakdown[] {
  const map = new Map<string, PaymentMethodBreakdown>();
  orders
    .filter((o) => o.status === 'completed')
    .forEach((o) => {
      const method = o.payment_method || 'Unknown';
      const existing = map.get(method) || { method, orders: 0, revenue: 0 };
      existing.orders += 1;
      existing.revenue += toNumber(o.total_amount);
      map.set(method, existing);
    });
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export interface PeakSales {
  hourly: Array<{ hour: string; orders: number; revenue: number }>;
  daily: Array<{ day: string; orders: number; revenue: number }>;
}

export function computePeakSales(orders: ReportOrder[]): PeakSales {
  const hourMap = new Map<string, { hour: string; orders: number; revenue: number }>();
  const dayMap = new Map<string, { day: string; orders: number; revenue: number }>();

  orders
    .filter((o) => o.status === 'completed')
    .forEach((o) => {
      const date = new Date(o.created_at);
      const hour = `${String(date.getHours()).padStart(2, '0')}:00`;
      const day = date.toLocaleDateString('en-US', { weekday: 'short' });

      const h = hourMap.get(hour) || { hour, orders: 0, revenue: 0 };
      h.orders += 1;
      h.revenue += toNumber(o.total_amount);
      hourMap.set(hour, h);

      const d = dayMap.get(day) || { day, orders: 0, revenue: 0 };
      d.orders += 1;
      d.revenue += toNumber(o.total_amount);
      dayMap.set(day, d);
    });

  const hourly = Array.from({ length: 24 }, (_, i) => {
    const hour = `${String(i).padStart(2, '0')}:00`;
    return hourMap.get(hour) || { hour, orders: 0, revenue: 0 };
  });

  const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daily = dayOrder.map((day) => dayMap.get(day) || { day, orders: 0, revenue: 0 });

  return { hourly, daily };
}

export interface ProcessingTimeMetrics {
  averageMinutes: number;
  medianMinutes: number;
  samples: number;
}

export function computeProcessingTime(orders: ReportOrder[]): ProcessingTimeMetrics {
  const times = orders
    .filter((o) => o.status === 'completed' && o.updated_at)
    .map((o) => {
      const start = new Date(o.created_at).getTime();
      const end = new Date(o.updated_at!).getTime();
      return Math.max(0, end - start) / 60000;
    })
    .filter((m) => Number.isFinite(m));

  if (times.length === 0) return { averageMinutes: 0, medianMinutes: 0, samples: 0 };

  const averageMinutes = times.reduce((a, b) => a + b, 0) / times.length;
  const sorted = [...times].sort((a, b) => a - b);
  const medianMinutes = sorted[Math.floor(sorted.length / 2)];
  return { averageMinutes, medianMinutes, samples: times.length };
}

export interface RefundReason {
  reason: string;
  count: number;
  value: number;
}

export interface FailureReason {
  reason: string;
  count: number;
  providers: string[];
}

export function computeFailureReasons(
  orders: ReportOrder[],
  products: ReportProduct[],
): FailureReason[] {
  const productById = new Map(products.map((p) => [p.id, p]));
  const map = new Map<string, FailureReason>();

  orders
    .filter((o) => o.status === 'failed')
    .forEach((o) => {
      const product = o.product_id ? productById.get(o.product_id) : undefined;
      const provider = product?.game?.provider || 'manual';
      const raw =
        (o.metadata && (o.metadata.fulfill_error as string)) ||
        (o.metadata && (o.metadata.error as string)) ||
        'Unknown error';
      const reason = String(raw).slice(0, 120);
      const existing = map.get(reason) || { reason, count: 0, providers: [] };
      existing.count += 1;
      if (!existing.providers.includes(provider)) existing.providers.push(provider);
      map.set(reason, existing);
    });

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function computeRefundReasons(orders: ReportOrder[]): RefundReason[] {
  const map = new Map<string, RefundReason>();
  orders
    .filter((o) => o.status === 'refunded')
    .forEach((o) => {
      const reason =
        (o.metadata && typeof o.metadata.reason === 'string' && o.metadata.reason) || 'No reason recorded';
      const existing = map.get(reason) || { reason, count: 0, value: 0 };
      existing.count += 1;
      existing.value += toNumber(o.total_amount);
      map.set(reason, existing);
    });
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

export interface DashboardMetrics {
  period: DashboardPeriod;
  financial: FinancialSnapshot;
  todayVsYesterday: TodayVsYesterday;
  productPerformance: ProductPerformance[];
  gamePerformance: GamePerformance[];
  supplierPerformance: SupplierPerformance[];
  customerInsights: CustomerInsight[];
  repeatMetrics: RepeatCustomerMetrics;
  paymentMethods: PaymentMethodBreakdown[];
  peakSales: PeakSales;
  processingTime: ProcessingTimeMetrics;
  refundReasons: RefundReason[];
  failureReasons: FailureReason[];
  trend: Array<{ label: string; revenue: number; profit: number; orders: number }>;
}

export function computeDashboardMetrics(
  data: AdminReportData,
  period: DashboardPeriod,
  reference: Date = new Date(),
  paymentMethod?: string,
): DashboardMetrics {
  const adminIds = new Set(data.profiles.filter((p) => p.role === 'admin').map((p) => p.id));
  const periodOrders = data.orders.filter(
    (o) => !adminIds.has(o.user_id) && isInPeriod(o.created_at, period, reference) && (!paymentMethod || o.payment_method === paymentMethod),
  );

  const financial = computeFinancials(periodOrders);
  const todayVsYesterday = computeTodayVsYesterday(periodOrders, reference);
  const productPerformance = computeProductPerformance(periodOrders, data.products);
  const gamePerformance = computeGamePerformance(periodOrders, data.products);
  const supplierPerformance = computeSupplierPerformance(periodOrders, data.products);
  const customerInsights = computeCustomerInsights(periodOrders, data.profiles);
  const repeatMetrics = computeRepeatMetrics(periodOrders, data.profiles, period, reference);
  const paymentMethods = computePaymentMethodBreakdown(periodOrders);
  const peakSales = computePeakSales(periodOrders);
  const processingTime = computeProcessingTime(periodOrders);
  const refundReasons = computeRefundReasons(periodOrders);
  const failureReasons = computeFailureReasons(periodOrders, data.products);

  const trend: DashboardMetrics['trend'] = [];
  if (period === 'today') {
    // Hourly buckets for today
    Array.from({ length: 24 }, (_, i) => {
      const hour = `${String(i).padStart(2, '0')}:00`;
      const bucketOrders = periodOrders.filter((o) => {
        const d = new Date(o.created_at);
        return d.getHours() === i;
      });
      const completed = bucketOrders.filter((o) => o.status === 'completed');
      const revenue = completed.reduce((sum, o) => sum + toNumber(o.total_amount), 0);
      const cogs = completed.reduce((sum, o) => sum + toNumber(o.unit_cost_price) * (o.quantity || 1), 0);
      trend.push({ label: hour, revenue, profit: revenue - cogs, orders: bucketOrders.length });
    });
  } else {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 30;
    const start = periodStart(period, reference) || new Date(reference.getTime() - 29 * 86_400_000);
    Array.from({ length: days }, (_, i) => {
      const date = new Date(start.getTime() + i * 86_400_000);
      const key = dayKey(date);
      const bucketOrders = periodOrders.filter((o) => dayKey(new Date(o.created_at)) === key);
      const completed = bucketOrders.filter((o) => o.status === 'completed');
      const revenue = completed.reduce((sum, o) => sum + toNumber(o.total_amount), 0);
      const cogs = completed.reduce((sum, o) => sum + toNumber(o.unit_cost_price) * (o.quantity || 1), 0);
      trend.push({
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue,
        profit: revenue - cogs,
        orders: bucketOrders.length,
      });
    });
  }

  return {
    period,
    financial,
    todayVsYesterday,
    productPerformance,
    gamePerformance,
    supplierPerformance,
    customerInsights,
    repeatMetrics,
    paymentMethods,
    peakSales,
    processingTime,
    refundReasons,
    failureReasons,
    trend,
  };
}
