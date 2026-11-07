import { describe, expect, it } from 'vitest';
import { computeFinancials } from './dashboardMetrics';
import type { ReportOrder } from '../services/reportingService';

function order(partial: Partial<ReportOrder> & Pick<ReportOrder, 'total_amount'>): ReportOrder {
  return {
    id: '1',
    user_id: 'u1',
    product_name: 'Test pack',
    quantity: 1,
    currency: 'INR',
    status: 'completed',
    created_at: new Date().toISOString(),
    ...partial,
  };
}

describe('computeFinancials', () => {
  it('excludes wallet top-ups from revenue and profit', () => {
    const orders: ReportOrder[] = [
      order({ id: 'sale', total_amount: 100, unit_cost_price: 80, product_name: 'Diamonds' }),
      order({
        id: 'topup',
        total_amount: 500,
        product_name: 'Wallet top-up — 500 coins',
        metadata: { wallet_topup: true },
      }),
    ];
    const fin = computeFinancials(orders);
    expect(fin.revenue).toBe(100);
    expect(fin.grossProfit).toBe(20);
    expect(fin.successfulOrders).toBe(1);
    expect(fin.profitMargin).toBe(20);
  });

  it('matches prod-like mix: ~11% margin when top-ups are excluded', () => {
    const orders: ReportOrder[] = [
      order({ id: 's1', total_amount: 4000, unit_cost_price: 3600 }),
      order({ id: 's2', total_amount: 150, unit_cost_price: 130 }),
      order({ id: 't1', total_amount: 2370, product_name: 'Wallet top-up — 100 coins', metadata: { wallet_topup: true } }),
    ];
    const fin = computeFinancials(orders);
    expect(fin.revenue).toBe(4150);
    expect(fin.walletTopupRevenueExcluded).toBe(2370);
    expect(fin.profitMargin).toBeCloseTo((420 / 4150) * 100, 1);
  });
});
