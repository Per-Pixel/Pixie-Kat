import { test } from 'node:test';
import assert from 'node:assert';

// Mirror of the price extraction helpers in ../index.js
function normalizeProviderPrice(raw) {
  if (raw == null) return null;
  const str = String(raw).trim().toUpperCase();
  const cleaned = str
    .replace(/^(BRL|USD|EUR|PHP|MYR|IDR|PKR|INR|PKS)\s*/i, '')
    .replace(/[A-Za-z$₹€£¥]/g, '')
    .replace(/\s+/g, '')
    .replace(',', '.');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function extractReturnedPrice(result) {
  if (!result || typeof result !== 'object') return null;
  const candidates = [
    result.price,
    result?.data?.price,
    result.product_price,
    result.amount,
    result.total_amount,
  ];
  for (const candidate of candidates) {
    const price = normalizeProviderPrice(candidate);
    if (price != null) return price;
  }
  return null;
}

test('normalizeProviderPrice strips currency codes and symbols', () => {
  assert.strictEqual(normalizeProviderPrice('BRL 3.90'), 3.9);
  assert.strictEqual(normalizeProviderPrice('  BRL 4.00  '), 4);
  assert.strictEqual(normalizeProviderPrice('R$ 5,50'), 5.5);
  assert.strictEqual(normalizeProviderPrice('₹100'), 100);
});

test('extractReturnedPrice checks common response paths', () => {
  assert.strictEqual(extractReturnedPrice({ price: 'BRL 3.90' }), 3.9);
  assert.strictEqual(extractReturnedPrice({ data: { price: '4.00' } }), 4);
  assert.strictEqual(extractReturnedPrice({ product_price: 'BRL 3.90' }), 3.9);
  assert.strictEqual(extractReturnedPrice({ amount: 3.9, price: null }), 3.9);
  assert.strictEqual(extractReturnedPrice({ total_amount: '7.80 BRL' }), 7.8);
  assert.strictEqual(extractReturnedPrice({}), null);
});

test('refund ratio is correct for cheaper provider price', () => {
  const orderTotal = 155;
  const returned = 39;
  const expected = 76;
  const ratio = 1 - (returned / expected);
  const refund = Math.round(orderTotal * ratio * 100) / 100;
  assert.strictEqual(refund, 75.46);
});

// ── Fulfillment guards: provider product id + Smile Points pre-flight ─────────
// Mirrors of the pure helpers in ../index.js (resolveOrderProductId,
// extractPointsBalance, extractSkuPrice, pointsDeficiency).

function resolveOrderProductId(product) {
  const id = String(
    product?.metadata?.secondary_provider_product_id ||
    product?.provider_product_id ||
    product?.sku || ''
  ).trim();
  return (!id || id === '1') ? null : id;
}

function extractPointsBalance(body) {
  if (!body) return NaN;
  const flat = body.smile_points ?? body.points ?? body.balance;
  const nested = body?.data?.smile_points ?? body?.data?.points ?? body?.data?.balance;
  const v = flat ?? nested;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function extractSkuPrice(skus, productid) {
  if (!Array.isArray(skus)) return NaN;
  const sku = skus.find(s => s && String(s.id) === String(productid));
  if (!sku) return NaN;
  const candidates = [sku.price, sku.point, sku.points, sku.smile_price, sku.sell_price, sku.amount];
  for (const c of candidates) {
    if (c == null) continue;
    const n = parseFloat(String(c));
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}

function pointsDeficiency(balance, cost) {
  if (!Number.isFinite(balance)) return null;
  if (balance <= 0) {
    return `Insufficient Smile Points: balance is ${balance}. Top up the merchant balance and re-fulfill.`;
  }
  if (Number.isFinite(cost) && balance < cost) {
    return `Insufficient Smile Points: need ${cost}, have ${balance}. Top up the merchant balance and re-fulfill.`;
  }
  return null;
}

test('resolveOrderProductId never falls back to a placeholder/lowest SKU', () => {
  assert.strictEqual(resolveOrderProductId({ provider_product_id: 'mobilelegends_100' }), 'mobilelegends_100');
  assert.strictEqual(resolveOrderProductId({ metadata: { secondary_provider_product_id: 'ml_weekly' } }), 'ml_weekly');
  assert.strictEqual(resolveOrderProductId({ sku: 'MLBB-100D' }), 'MLBB-100D');
  // Missing / '1' placeholder / whitespace → null (must NOT fall back to productlist[0])
  assert.strictEqual(resolveOrderProductId({}), null);
  assert.strictEqual(resolveOrderProductId({ provider_product_id: '1' }), null);
  assert.strictEqual(resolveOrderProductId({ provider_product_id: '   ' }), null);
  assert.strictEqual(resolveOrderProductId(null), null);
});

test('extractPointsBalance handles flat, nested, and zero balances', () => {
  assert.strictEqual(extractPointsBalance({ smile_points: '500' }), 500);
  assert.strictEqual(extractPointsBalance({ points: 500 }), 500);
  assert.strictEqual(extractPointsBalance({ balance: '500.5' }), 500.5);
  assert.strictEqual(extractPointsBalance({ data: { smile_points: 0 } }), 0);
  assert.ok(Number.isNaN(extractPointsBalance({})));
  assert.ok(Number.isNaN(extractPointsBalance(null)));
});

test('extractSkuPrice matches SKU by id and parses the price', () => {
  const skus = [
    { id: 1, price: '5' },        // lowest denomination
    { id: 42, price: 100 },
    { id: 99, price: 'BRL 4.00' },// non-numeric price
  ];
  assert.strictEqual(extractSkuPrice(skus, '42'), 100);
  assert.strictEqual(extractSkuPrice(skus, 1), 5);          // numeric vs string id
  assert.ok(Number.isNaN(extractSkuPrice(skus, '999')));     // not found
  assert.ok(Number.isNaN(extractSkuPrice(skus, '99')));      // non-numeric price
  assert.ok(Number.isNaN(extractSkuPrice(null, '1')));
});

test('pointsDeficiency blocks zero/insufficient balance, fails open when unknown', () => {
  // Zero balance → blocked even when the SKU cost is unknown (the "no points" case)
  assert.ok(pointsDeficiency(0, NaN)?.startsWith('Insufficient Smile Points: balance is 0'));
  assert.ok(pointsDeficiency(0, 100)?.startsWith('Insufficient Smile Points: balance is 0'));
  // Positive but below cost → blocked
  assert.strictEqual(
    pointsDeficiency(5, 100),
    'Insufficient Smile Points: need 100, have 5. Top up the merchant balance and re-fulfill.'
  );
  // Exactly enough / plenty → allowed
  assert.strictEqual(pointsDeficiency(100, 100), null);
  assert.strictEqual(pointsDeficiency(500, 100), null);
  // Positive balance, unknown cost → fail-open (let createorder decide)
  assert.strictEqual(pointsDeficiency(50, NaN), null);
  // Unknown balance → fail-open
  assert.strictEqual(pointsDeficiency(NaN, 100), null);
});

// ── Expected price fallback chain ──────────────────────────────────────────────
// Mirrors the logic in ../index.js: the live productlist SKU price (Smile
// Points, from pre-flight) first, then metadata.expected_provider_price as a
// fallback, then null. Productlist is preferred because it's fetched live from
// the provider in the same unit as createorder — it can never be a wrong-unit
// value the way a manually-entered BRL metadata amount was.

function resolveExpectedPrice(metadataExpected, preFlightSkuPrice) {
  if (Number.isFinite(preFlightSkuPrice)) return preFlightSkuPrice;
  if (metadataExpected != null) return Number(metadataExpected);
  return null;
}

test('resolveExpectedPrice prefers live productlist (Smile Points), then metadata, then null', () => {
  // Productlist (live Smile Points) available → always wins, even over metadata.
  // Unit-safety: a manually-entered BRL metadata value (e.g. 4) must never
  // override the provider's live Smile Points price (e.g. 39) — that exact case
  // fired the false "expected 4, got 39" mismatch.
  assert.strictEqual(resolveExpectedPrice(4, 39), 39);
  assert.strictEqual(resolveExpectedPrice(76, 39), 39);
  // No productlist price (lookup failed) → fall back to metadata
  assert.strictEqual(resolveExpectedPrice(76, NaN), 76);
  assert.strictEqual(resolveExpectedPrice('76', undefined), 76);
  // Neither → null (skipped_no_expected_price)
  assert.strictEqual(resolveExpectedPrice(null, NaN), null);
  assert.strictEqual(resolveExpectedPrice(undefined, undefined), null);
});

test('proportional refund is near-full when wrong (cheap) product is delivered', () => {
  // Customer orders 10000 diamonds (expected 76 Smile Points), provider delivers elite pass (3.9 Smile Points)
  const orderTotal = 500;
  const returned = 3.9;
  const expected = 76;
  const ratio = 1 - (returned / expected);
  const refund = Math.round(orderTotal * ratio * 100) / 100;
  // ~94.9% refund — effectively a full refund for a clearly wrong product
  assert.ok(refund > 470, `refund ${refund} should be near-full for wrong product`);
  assert.ok(refund < 500, `refund ${refund} should not exceed order total`);
});
