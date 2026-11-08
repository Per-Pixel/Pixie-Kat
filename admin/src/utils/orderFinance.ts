import type { ReportOrder, ReportProduct } from '../services/reportingService';

type ProductMeta = {
  currencies?: Record<string, { cost_price?: number | string }>;
};

function productCatalogUnitCost(product: ReportProduct, orderCurrency: string): number | null {
  const primary = product.currency || 'INR';
  const costCol = product.cost_price;
  if (costCol != null && Number(costCol) > 0) {
    if (!orderCurrency || orderCurrency === primary) return Number(costCol);
  }
  const meta = product.metadata as ProductMeta | null | undefined;
  const fromMeta = meta?.currencies?.[orderCurrency]?.cost_price;
  if (fromMeta != null && Number(fromMeta) > 0) return Number(fromMeta);
  if (costCol != null && Number(costCol) > 0) return Number(costCol);
  return null;
}

/** Wallet top-ups credit customer balance — they are not product revenue or gross profit. */
export function isWalletTopupOrder(
  order: Pick<ReportOrder, 'metadata' | 'product_name' | 'product_id'>,
): boolean {
  const meta = order.metadata ?? {};
  if (meta.wallet_topup === true || meta.wallet_topup === 'true') return true;
  if (meta.source === 'wallet_topup') return true;
  const name = (order.product_name || '').trim().toLowerCase();
  if (/wallet\s*top[- ]?up/.test(name)) return true;
  // Service order: coins field + no catalogue product (legacy rows without wallet_topup flag)
  if (
    order.product_id == null
    && meta.coins != null
    && !meta.pricing
  ) {
    return true;
  }
  return false;
}

export function resolveOrderUnitCost(
  order: ReportOrder,
  productsById: Map<string, ReportProduct>,
  productsByName: Map<string, ReportProduct>,
): number | null {
  if (order.unit_cost_price != null && Number(order.unit_cost_price) > 0) {
    return Number(order.unit_cost_price);
  }
  const product =
    (order.product_id ? productsById.get(order.product_id) : undefined)
    ?? productsByName.get(order.product_name);
  if (product) {
    const fromCatalog = productCatalogUnitCost(product, order.currency || 'INR');
    if (fromCatalog != null) return fromCatalog;
  }
  return null;
}

/** Orders that should affect revenue, COGS, and margin metrics. */
export function isSaleOrderForAnalytics(order: ReportOrder): boolean {
  return !isWalletTopupOrder(order);
}

/** Gross profit for a line when unit cost is known (order snapshot or product catalog). */
export function orderKnownGrossProfit(
  order: ReportOrder,
  productsById: Map<string, ReportProduct>,
  productsByName: Map<string, ReportProduct>,
): { revenue: number; profit: number } | null {
  if (order.status !== 'completed' || !isSaleOrderForAnalytics(order)) return null;
  const unitCost = resolveOrderUnitCost(order, productsById, productsByName);
  if (unitCost == null) return null;
  const revenue = Number(order.total_amount || 0);
  const profit = revenue - unitCost * (order.quantity || 1);
  return { revenue, profit };
}
