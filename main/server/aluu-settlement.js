/**
 * Shared Aluu payment settlement + background reconciliation for UPI/QR checkouts.
 * Customers often close the payment tab after scanning a QR; client polling stops,
 * so the API must confirm with Aluu and flip orders to processing without the browser.
 */

import * as aluu from './aluu.js';

const AMOUNT_TOLERANCE = 0.01;

export function paidAmountMatches(expected, paidRaw) {
  const paid = Number(paidRaw);
  const want = Number(expected);
  if (!Number.isFinite(paid) || paid <= 0 || !Number.isFinite(want)) return false;
  return Math.abs(paid - want) <= AMOUNT_TOLERANCE;
}

export function aluuStatusCompleted(statusResult) {
  const txn = String(statusResult?.txnStatus || '').toUpperCase();
  const status = String(statusResult?.status || '').toUpperCase();
  return txn === 'COMPLETED' || status === 'COMPLETED';
}

export function aluuStatusFailed(statusResult) {
  const txn = String(statusResult?.txnStatus || '').toUpperCase();
  const status = String(statusResult?.status || '').toUpperCase();
  return txn === 'FAILED' || status === 'FAILED';
}

export function externalAluuOrderKey(order) {
  const meta = order?.metadata && typeof order.metadata === 'object' ? order.metadata : {};
  return String(meta.payment_group_id || order.id);
}

/** Id Aluu was given for this checkout. Retries use a new provider id on the same row. */
export function aluuLookupId(order) {
  const meta = order?.metadata && typeof order.metadata === 'object' ? order.metadata : {};
  if (meta.payment_group_id) return String(meta.payment_group_id);
  if (order?.aluu_order_id) return String(order.aluu_order_id);
  if (meta.aluu_order_id) return String(meta.aluu_order_id);
  return String(order?.id || '');
}

export function statusOrderIdMatches(statusResult, externalKey, order) {
  const got = String(statusResult?.orderId || '');
  if (!got) return true;
  if (got === String(externalKey)) return true;
  if (got === String(order?.id)) return true;
  if (order?.aluu_order_id && got === String(order.aluu_order_id)) return true;
  const meta = order?.metadata && typeof order.metadata === 'object' ? order.metadata : {};
  if (meta.aluu_order_id && got === String(meta.aluu_order_id)) return true;
  return false;
}

export async function settleAluuOrderPaid(supabaseAdmin, order, statusResult, source) {
  if (!aluuStatusCompleted(statusResult)) return { ok: false, reason: 'not_completed' };
  if (!paidAmountMatches(order.total_amount, statusResult.amount)) {
    return { ok: false, reason: 'amount_mismatch', paid: statusResult.amount, expected: order.total_amount };
  }
  const externalKey = externalAluuOrderKey(order);
  if (!statusOrderIdMatches(statusResult, externalKey, order)) {
    return { ok: false, reason: 'order_id_mismatch', providerOrderId: statusResult.orderId };
  }

  const paymentId = statusResult.utr ? String(statusResult.utr) : `aluu_${externalKey}`;
  const aluuMeta = {
    aluu_txn_status: statusResult.txnStatus,
    aluu_utr: statusResult.utr || null,
    aluu_amount: statusResult.amount || null,
    aluu_date: statusResult.date || null,
    verified_at: new Date().toISOString(),
    source,
  };

  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'processing',
      payment_id: paymentId,
      updated_at: new Date().toISOString(),
      metadata: { ...(order.metadata || {}), aluu_payment: aluuMeta },
    })
    .eq('id', order.id)
    .eq('status', 'pending');

  if (error) throw error;
  return { ok: true, paymentId, orderId: order.id };
}

export async function markAluuOrderFailed(supabaseAdmin, order) {
  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
      metadata: { ...(order.metadata || {}), aluu_status: 'FAILED', failed_at: new Date().toISOString() },
    })
    .eq('id', order.id)
    .eq('status', 'pending');
  if (error) throw error;
}

export async function settleAluuCartGroupPaid(supabaseAdmin, orders, statusResult, source) {
  const pending = orders.filter((o) => o.status === 'pending');
  if (!pending.length) return { ok: true, already: true };
  const groupKey = externalAluuOrderKey(pending[0]);
  const expectedTotal = orders.reduce((s, o) => s + Number(o.total_amount), 0);
  if (!aluuStatusCompleted(statusResult)) return { ok: false, reason: 'not_completed' };
  if (!paidAmountMatches(expectedTotal, statusResult.amount)) {
    return { ok: false, reason: 'amount_mismatch', paid: statusResult.amount, expected: expectedTotal };
  }
  if (!statusOrderIdMatches(statusResult, groupKey, pending[0])) {
    return { ok: false, reason: 'order_id_mismatch', providerOrderId: statusResult.orderId };
  }

  const paymentId = statusResult.utr ? String(statusResult.utr) : `aluu_${groupKey}`;
  const aluuMeta = {
    aluu_txn_status: statusResult.txnStatus,
    aluu_utr: statusResult.utr || null,
    aluu_amount: statusResult.amount || null,
    aluu_date: statusResult.date || null,
    verified_at: new Date().toISOString(),
    source,
  };

  await Promise.all(pending.map((o) => supabaseAdmin
    .from('orders')
    .update({
      status: 'processing',
      payment_id: paymentId,
      updated_at: new Date().toISOString(),
      metadata: { ...(o.metadata || {}), aluu_payment: aluuMeta },
    })
    .eq('id', o.id)
    .eq('status', 'pending')));

  return { ok: true, paymentId, orderIds: orders.map((o) => o.id) };
}

/**
 * Poll Aluu for pending orders and settle groups/singles server-side.
 */
export async function reconcilePendingAluuPayments(supabaseAdmin, { maxAgeHours = 48, batchSize = 40 } = {}) {
  if (!aluu.isConfigured()) return { checked: 0, settled: 0, failed: 0 };

  const since = new Date(Date.now() - maxAgeHours * 3_600_000).toISOString();
  const { data: pending, error } = await supabaseAdmin
    .from('orders')
    .select('id, user_id, product_id, total_amount, currency, status, payment_method, payment_id, aluu_order_id, metadata, created_at')
    .eq('payment_method', 'aluu')
    .eq('status', 'pending')
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (error) throw error;
  if (!pending?.length) return { checked: 0, settled: 0, failed: 0 };

  const groups = new Map();
  const singles = [];

  for (const order of pending) {
    const meta = order.metadata && typeof order.metadata === 'object' ? order.metadata : {};
    const groupId = meta.payment_group_id ? String(meta.payment_group_id) : null;
    if (groupId) {
      const list = groups.get(groupId) || [];
      list.push(order);
      groups.set(groupId, list);
    } else {
      singles.push(order);
    }
  }

  let settled = 0;
  let failed = 0;
  let checked = 0;

  const handleStatus = async (orders, externalKey) => {
    checked += 1;
    let statusResult;
    try {
      statusResult = await aluu.checkOrderStatus(externalKey);
    } catch (err) {
      console.warn(`[aluu-reconcile] status check failed for ${externalKey}:`, err.message);
      return;
    }

    if (aluuStatusFailed(statusResult)) {
      for (const o of orders.filter((x) => x.status === 'pending')) {
        await markAluuOrderFailed(supabaseAdmin, o);
        failed += 1;
      }
      return;
    }

    if (!aluuStatusCompleted(statusResult)) return;

    if (orders.length > 1) {
      const result = await settleAluuCartGroupPaid(supabaseAdmin, orders, statusResult, 'reconcile_worker');
      if (result.ok && !result.already) settled += orders.filter((o) => o.status === 'pending').length;
    } else {
      const result = await settleAluuOrderPaid(supabaseAdmin, orders[0], statusResult, 'reconcile_worker');
      if (result.ok) settled += 1;
    }
  };

  for (const [groupId, orders] of groups) {
    await handleStatus(orders, groupId);
  }
  for (const order of singles) {
    await handleStatus([order], aluuLookupId(order));
  }

  if (settled || failed) {
    console.log(`[aluu-reconcile] checked=${checked} settled=${settled} failed=${failed}`);
  }
  return { checked, settled, failed };
}

export function startAluuReconcileWorker(supabaseAdmin, { intervalMs = 45_000 } = {}) {
  const tick = () => {
    reconcilePendingAluuPayments(supabaseAdmin).catch((err) => {
      console.error('[aluu-reconcile] worker error:', err.message);
    });
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  tick();
  console.log(`[aluu-reconcile] worker started (every ${intervalMs / 1000}s)`);
  return () => clearInterval(timer);
}
