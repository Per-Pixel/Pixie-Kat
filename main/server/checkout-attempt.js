/** Match a repeat Pay click to an unpaid UPI attempt so we do not insert a second order. */

export function accountFingerprint(metadata) {
  const fields = metadata?.account_fields && typeof metadata.account_fields === 'object'
    ? metadata.account_fields
    : {};
  return Object.keys(fields)
    .sort()
    .map((key) => `${key}=${String(fields[key] ?? '').trim()}`)
    .join('|');
}

export function sameUnpaidAttempt(order, { productId, totalAmount, metadata }) {
  if (!order || order.payment_id) return false;
  if (!['pending', 'failed'].includes(String(order.status || ''))) return false;
  if (String(order.product_id) !== String(productId)) return false;
  const paid = Number(order.total_amount);
  const want = Number(totalAmount);
  if (!Number.isFinite(paid) || !Number.isFinite(want) || Math.abs(paid - want) > 0.01) return false;
  const meta = order.metadata && typeof order.metadata === 'object' ? order.metadata : {};
  if (meta.payment_expired) return false;
  return accountFingerprint(meta) === accountFingerprint(metadata);
}

/** Aluu order ids max out at 50 characters and must change when the previous QR is dead. */
export function nextAluuExternalId(orderId) {
  const base = String(orderId).replace(/-/g, '').slice(0, 20);
  return `${base}${Date.now().toString(36)}`.slice(0, 50);
}

export function canReusePaymentUrl(order, { maxAgeMs = 20 * 60 * 1000, now = Date.now() } = {}) {
  if (!order || order.status !== 'pending' || order.payment_id) return false;
  const meta = order.metadata && typeof order.metadata === 'object' ? order.metadata : {};
  if (!meta.aluu_payment_url) return false;
  const updated = Date.parse(order.updated_at || order.created_at || '');
  if (!Number.isFinite(updated)) return false;
  return now - updated < maxAgeMs;
}
