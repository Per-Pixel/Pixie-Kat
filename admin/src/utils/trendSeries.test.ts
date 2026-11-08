import { describe, expect, it } from 'vitest';
import { buildRevenueProfitTrend, calendarSpanForPeriod } from './trendSeries';
import type { ReportOrder, ReportProduct } from '../services/reportingService';

function order(partial: Partial<ReportOrder> & Pick<ReportOrder, 'created_at'>): ReportOrder {
  return {
    id: '1',
    user_id: 'u1',
    product_name: 'Pack',
    quantity: 1,
    total_amount: 100,
    currency: 'INR',
    status: 'completed',
    unit_cost_price: 80,
    ...partial,
  };
}

describe('buildRevenueProfitTrend', () => {
  it('creates 30 daily points for 30d period', () => {
    const ref = new Date('2026-11-08T15:00:00+05:30');
    const { start, end } = calendarSpanForPeriod('30d', '', '', ref);
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    expect(days).toBe(30);
    const trend = buildRevenueProfitTrend([], [], '30d', '', '', ref);
    expect(trend).toHaveLength(30);
  });

  it('attributes profit to each local day in 7d', () => {
    const ref = new Date('2026-11-08T12:00:00');
    const products: ReportProduct[] = [];
    const orders: ReportOrder[] = [
      order({ id: 'a', created_at: '2026-11-07T18:00:00.000Z', total_amount: 50, unit_cost_price: 40 }),
      order({ id: 'b', created_at: '2026-11-06T18:00:00.000Z', total_amount: 80, unit_cost_price: 60 }),
    ];
    const trend = buildRevenueProfitTrend(orders, products, '7d', '', '', ref);
    const withProfit = trend.filter((t) => t.profit > 0);
    expect(withProfit.length).toBeGreaterThanOrEqual(2);
  });
});
