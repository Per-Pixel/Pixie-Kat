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
// Mirrors of the pure helpers in ../index.js (resolveOrderProductIds,
// extractPointsBalance, extractSkuPrice, pointsDeficiency, balanceDeficiency,
// extractYokcashSaldo, extractSmileOneBalance, extractProviderOrderId).

function normalizeProviderProductId(value) {
  const id = String(value ?? '').trim();
  return (!id || id === '1') ? null : id;
}

function resolveOrderProductIds(product) {
  const primary = normalizeProviderProductId(product?.provider_product_id)
    || normalizeProviderProductId(product?.sku);
  const secondary = normalizeProviderProductId(product?.metadata?.secondary_provider_product_id);
  const ids = [];
  if (primary) ids.push(primary);
  if (secondary && secondary !== primary) ids.push(secondary);
  return ids;
}

function resolveOrderProductId(product) {
  return resolveOrderProductIds(product)[0] ?? null;
}

function bookedCombinedSkus(metadata, productIds) {
  const rows = Array.isArray(metadata?.combined_sku_results) ? metadata.combined_sku_results : [];
  const allowed = new Set(productIds.map((id) => String(id)));
  const booked = [];
  const seen = new Set();
  for (const row of rows) {
    const productid = String(row?.productid ?? '').trim();
    if (!allowed.has(productid) || seen.has(productid) || row?.result == null) continue;
    booked.push({ productid, result: row.result, at: row.at || null });
    seen.add(productid);
  }
  return booked;
}

function yokcashIdtrx(orderId, index) {
  return index === 0 ? String(orderId) : `${orderId}:${index + 1}`;
}

function orderIdFromYokcashIdtrx(idtrx) {
  const raw = String(idtrx || '').trim();
  if (!raw) return null;
  const head = raw.split(':')[0];
  return head || null;
}

function smileOneOrderItems(product) {
  const ids = resolveOrderProductIds(product);
  if (!ids.length) return [];
  const primaryPid = normalizeProviderProductId(product?.provider_product_id);
  const primarySku = normalizeProviderProductId(product?.sku);
  return ids.map((id, index) => {
    if (index === 0) {
      return { sku: primarySku || primaryPid || id, qty: 1, pid: primaryPid || primarySku || id };
    }
    return { sku: id, qty: 1, pid: id };
  });
}

function sumProviderCharges(prices) {
  if (!Array.isArray(prices) || prices.length === 0 || prices.some((price) => price == null || !Number.isFinite(price))) {
    return null;
  }
  return Math.round(prices.reduce((sum, price) => sum + price, 0) * 100) / 100;
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

function extractSkuPoints(skus, productid) {
  if (!Array.isArray(skus)) return NaN;
  const sku = skus.find(s => s && String(s.id) === String(productid));
  if (!sku) return NaN;
  const candidates = [sku.smile_points, sku.smile_point, sku.point, sku.points, sku.smile_price];
  for (const c of candidates) {
    if (c == null) continue;
    const n = parseFloat(String(c));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return NaN;
}

function resolvePointsCost(product, skus, productid) {
  if (product?.metadata?.expected_provider_price != null) {
    const n = Number(product.metadata.expected_provider_price);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const skuPoints = extractSkuPoints(skus, productid);
  if (Number.isFinite(skuPoints) && skuPoints > 0) return skuPoints;
  return NaN;
}

function resolveBundlePointsCost(product, skus, productIds) {
  if (product?.metadata?.expected_provider_price != null) {
    const n = Number(product.metadata.expected_provider_price);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const ids = (Array.isArray(productIds) ? productIds : [productIds])
    .map((id) => String(id ?? '').trim())
    .filter(Boolean);
  if (!ids.length) return NaN;
  let total = 0;
  for (const id of ids) {
    const pts = extractSkuPoints(skus, id);
    if (!Number.isFinite(pts) || pts <= 0) return NaN;
    total += pts;
  }
  return total;
}

function balanceDeficiency(label, balance, cost) {
  if (!Number.isFinite(balance)) return null;
  if (balance <= 0) {
    return `Insufficient ${label}: balance is ${balance}. Top up the merchant balance and re-fulfill.`;
  }
  if (Number.isFinite(cost) && balance < cost) {
    return `Insufficient ${label}: need ${cost}, have ${balance}. Top up the merchant balance and re-fulfill.`;
  }
  return null;
}

function pointsDeficiency(balance, cost) {
  return balanceDeficiency('Smile Points', balance, cost);
}

function extractYokcashSaldo(body) {
  if (!body) return NaN;
  const v = body?.data?.saldo ?? body?.saldo;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function extractSmileOneBalance(body) {
  if (!body) return NaN;
  const v = body?.result?.usd_balance ?? body?.usd_balance;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function extractProviderOrderId(body) {
  if (!body || typeof body !== 'object') return null;
  const id = body.order_id ?? body.orderid ?? body.orderId
    ?? body?.data?.order_id ?? body?.data?.orderid ?? body?.data?.orderId
    ?? body?.data?.id ?? null;
  if (id == null) return null;
  const s = String(id).trim();
  return s || null;
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

test('resolveOrderProductIds delivers the primary SKU and a different combined SKU', () => {
  assert.deepStrictEqual(
    resolveOrderProductIds({ provider_product_id: '22590', metadata: { secondary_provider_product_id: '13' } }),
    ['22590', '13']
  );
  // Same code twice is one delivery, not two.
  assert.deepStrictEqual(
    resolveOrderProductIds({ provider_product_id: '25', metadata: { secondary_provider_product_id: ' 25 ' } }),
    ['25']
  );
  // Placeholder primary falls through to the real secondary.
  assert.deepStrictEqual(
    resolveOrderProductIds({ provider_product_id: '1', metadata: { secondary_provider_product_id: '13' } }),
    ['13']
  );
  assert.deepStrictEqual(
    resolveOrderProductIds({ sku: 'MLBB-100D', metadata: { secondary_provider_product_id: '1' } }),
    ['MLBB-100D']
  );
  // When both are set, the first id is the primary — fulfillment used to send only the secondary.
  assert.strictEqual(
    resolveOrderProductId({ provider_product_id: '22590', metadata: { secondary_provider_product_id: '13' } }),
    '22590'
  );
});

test('resolveBundlePointsCost sums both SKUs unless the admin set a bundle total', () => {
  const skus = [
    { id: '22590', smile_points: 50 },
    { id: '13', smile_points: 26 },
  ];
  const bundle = { provider_product_id: '22590', metadata: { secondary_provider_product_id: '13' } };
  assert.strictEqual(resolveBundlePointsCost(bundle, skus, ['22590', '13']), 76);
  assert.strictEqual(
    resolveBundlePointsCost(
      { ...bundle, metadata: { secondary_provider_product_id: '13', expected_provider_price: 80 } },
      skus,
      ['22590', '13']
    ),
    80
  );
  assert.ok(Number.isNaN(resolveBundlePointsCost(bundle, [{ id: '22590', smile_points: 50 }], ['22590', '13'])));
});

test('yokcash idtrx keeps the order uuid and a stable suffix for the second SKU', () => {
  const orderId = '11111111-1111-1111-1111-111111111111';
  assert.strictEqual(yokcashIdtrx(orderId, 0), orderId);
  assert.strictEqual(yokcashIdtrx(orderId, 1), `${orderId}:2`);
  assert.strictEqual(orderIdFromYokcashIdtrx(`${orderId}:2`), orderId);
  assert.strictEqual(orderIdFromYokcashIdtrx(orderId), orderId);
  assert.strictEqual(orderIdFromYokcashIdtrx(''), null);
});

test('smileOneOrderItems keeps sku and pid on the primary line and adds the second SKU', () => {
  assert.deepStrictEqual(
    smileOneOrderItems({
      sku: 'SKU-A',
      provider_product_id: 'PID-A',
      metadata: { secondary_provider_product_id: 'PID-B' },
    }),
    [
      { sku: 'SKU-A', qty: 1, pid: 'PID-A' },
      { sku: 'PID-B', qty: 1, pid: 'PID-B' },
    ]
  );
  assert.deepStrictEqual(
    smileOneOrderItems({ sku: 'SKU-A', provider_product_id: 'PID-A' }),
    [{ sku: 'SKU-A', qty: 1, pid: 'PID-A' }]
  );
});

test('bookedCombinedSkus skips ids that are no longer on the product', () => {
  const metadata = {
    combined_sku_results: [
      { productid: '22590', result: { order_id: 'S1' } },
      { productid: '999', result: { order_id: 'S2' } },
      { productid: '22590', result: { order_id: 'S1-dup' } },
    ],
  };
  assert.deepStrictEqual(
    bookedCombinedSkus(metadata, ['22590', '13']).map((row) => row.productid),
    ['22590']
  );
});

test('sumProviderCharges adds both booked prices and refuses a partial sum', () => {
  assert.strictEqual(sumProviderCharges([50, 26]), 76);
  assert.strictEqual(sumProviderCharges([39.1, 36.9]), 76);
  assert.strictEqual(sumProviderCharges([50, null]), null);
  assert.strictEqual(sumProviderCharges([]), null);
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

test('extractSkuPoints extracts points-only fields and ignores fiat price', () => {
  const skus = [
    { id: '1', price: '4.00', smile_points: '39' },
    { id: '2', price: '8.00', points: 76 },
    { id: '3', price: '4.00' }, // fiat price only — no points field
  ];
  assert.strictEqual(extractSkuPoints(skus, '1'), 39);
  assert.strictEqual(extractSkuPoints(skus, '2'), 76);
  assert.ok(Number.isNaN(extractSkuPoints(skus, '3'))); // ignores fiat price 4.00
  assert.ok(Number.isNaN(extractSkuPoints(skus, '999')));
});

test('resolvePointsCost prioritizes product metadata Smile Points over SKU fields', () => {
  const productWithMeta = { metadata: { expected_provider_price: 39 } };
  const productWithoutMeta = { metadata: {} };
  const skus = [
    { id: '10', price: '4.00', smile_points: 35 },
    { id: '20', price: '4.00' }, // fiat only
  ];

  // Metadata wins when present
  assert.strictEqual(resolvePointsCost(productWithMeta, skus, '10'), 39);
  // SKU points used when no metadata
  assert.strictEqual(resolvePointsCost(productWithoutMeta, skus, '10'), 35);
  // Returns NaN when neither metadata nor SKU points exist (fiat price ignored)
  assert.ok(Number.isNaN(resolvePointsCost(productWithoutMeta, skus, '20')));
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

test('balanceDeficiency uses the provider label in messages', () => {
  assert.ok(balanceDeficiency('Yokcash saldo (IDR)', 0, NaN)?.startsWith('Insufficient Yokcash saldo (IDR): balance is 0'));
  assert.strictEqual(
    balanceDeficiency('SmileOne USD balance', 2, 8),
    'Insufficient SmileOne USD balance: need 8, have 2. Top up the merchant balance and re-fulfill.'
  );
  assert.strictEqual(balanceDeficiency('Yokcash saldo (IDR)', 100000, 5000), null);
  assert.strictEqual(balanceDeficiency('Yokcash saldo (IDR)', NaN, 5000), null);
});

test('extractYokcashSaldo parses nested and flat saldo', () => {
  assert.strictEqual(extractYokcashSaldo({ status: true, data: { saldo: 125000 } }), 125000);
  assert.strictEqual(extractYokcashSaldo({ status: true, data: { saldo: '0' } }), 0);
  assert.strictEqual(extractYokcashSaldo({ saldo: 42.5 }), 42.5);
  assert.ok(Number.isNaN(extractYokcashSaldo({ status: false, msg: 'bad key' })));
  assert.ok(Number.isNaN(extractYokcashSaldo(null)));
});

test('extractSmileOneBalance parses result.usd_balance', () => {
  assert.strictEqual(extractSmileOneBalance({ result: { usd_balance: 12.5 } }), 12.5);
  assert.strictEqual(extractSmileOneBalance({ result: { usd_balance: '0' } }), 0);
  assert.strictEqual(extractSmileOneBalance({ usd_balance: 7 }), 7);
  assert.ok(Number.isNaN(extractSmileOneBalance({ result: {} })));
  assert.ok(Number.isNaN(extractSmileOneBalance(null)));
});

test('extractProviderOrderId finds booked-order ids across provider shapes', () => {
  // SmileCoin success + award-failure shapes (top-level order_id, data.orderid)
  assert.strictEqual(extractProviderOrderId({ status: 200, order_id: 'S123' }), 'S123');
  assert.strictEqual(extractProviderOrderId({ status: 201, order_id: 'S456', price: 76 }), 'S456');
  assert.strictEqual(extractProviderOrderId({ status: 200, data: { orderid: 'S789' } }), 'S789');
  // Yokcash acceptance shape: {status:true, data:{id, status:"pending"}}
  assert.strictEqual(extractProviderOrderId({ status: true, data: { id: 987654, status: 'pending' } }), '987654');
  // Rejections carry no order id → null (the refund signal)
  assert.strictEqual(extractProviderOrderId({ status: 210, message: 'Insufficient balance' }), null);
  assert.strictEqual(extractProviderOrderId({ status: false, msg: 'Saldo tidak mencukupi' }), null);
  // A bare top-level `id` (e.g. a JSON-RPC request-id echo) is NOT an order id
  assert.strictEqual(extractProviderOrderId({ id: 'SC-TEST-123', error: { code: -1 } }), null);
  assert.strictEqual(extractProviderOrderId(null), null);
  assert.strictEqual(extractProviderOrderId({}), null);
});

// ── Expected price resolution ─────────────────────────────────────────────────
// Mirrors ../index.js: the ONLY valid expected price is
// metadata.expected_provider_price, and it must be in Smile Points — the unit
// createorder returns. The productlist SKU `price` field is BRL (a different
// unit), so it is never used as an expected value; the earlier auto-fallback to
// the productlist price fired the false "expected 4, got 39" mismatch. No
// metadata → null (the substitution check is skipped, no false positive).

function resolveExpectedPrice(metadataExpected) {
  return metadataExpected != null ? Number(metadataExpected) : null;
}

test('resolveExpectedPrice uses metadata (Smile Points) only, else null', () => {
  // Metadata set → used as the Smile Points expected price
  assert.strictEqual(resolveExpectedPrice(39), 39);
  assert.strictEqual(resolveExpectedPrice('76'), 76);
  assert.strictEqual(resolveExpectedPrice(0), 0);
  // No metadata → null (substitution check skipped — no cross-unit false positive)
  assert.strictEqual(resolveExpectedPrice(null), null);
  assert.strictEqual(resolveExpectedPrice(undefined), null);
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
