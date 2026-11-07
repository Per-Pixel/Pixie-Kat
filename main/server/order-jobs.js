/**
 * Background jobs: auto-fulfill paid orders that never got a client-side /fulfill-order call
 * (common when the customer pays via shared UPI QR and closes the tab), and expire
 * abandoned gateway checkouts.
 */

import * as aluu from './aluu.js';
import {
  aluuStatusCompleted,
  settleAluuCartGroupPaid,
  settleAluuOrderPaid,
} from './aluu-settlement.js';

const DEFAULT_PENDING_TTL_HOURS = 24;

async function markPendingOrderFailed(supabaseAdmin, order) {
  const meta = order.metadata && typeof order.metadata === 'object' ? order.metadata : {};
  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
      metadata: {
        ...meta,
        payment_expired: true,
        expired_at: new Date().toISOString(),
        expire_reason: 'unpaid_after_24h',
        aluu_status: order.payment_method === 'aluu' ? 'EXPIRED' : meta.aluu_status,
      },
    })
    .eq('id', order.id)
    .eq('status', 'pending');
  if (error) throw error;
}

/**
 * Flip gateway orders still pending after the TTL to failed (with a last-chance Aluu status check).
 */
export async function expireStalePendingOrders(
  supabaseAdmin,
  { ttlHours = DEFAULT_PENDING_TTL_HOURS, batchSize = 100 } = {},
) {
  const cutoff = new Date(Date.now() - ttlHours * 3_600_000).toISOString();
  const { data: stale, error } = await supabaseAdmin
    .from('orders')
    .select('id, payment_method, metadata, created_at, user_id, product_id, total_amount, currency, status, payment_id, aluu_order_id')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .in('payment_method', ['aluu', 'razorpay'])
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (error) throw error;
  if (!stale?.length) return { expired: 0, recovered: 0 };

  const unitKeys = new Map();
  for (const order of stale) {
    const meta = order.metadata && typeof order.metadata === 'object' ? order.metadata : {};
    const groupId = meta.payment_group_id ? String(meta.payment_group_id) : null;
    const key = groupId ? `group:${groupId}` : `order:${order.id}`;
    if (!unitKeys.has(key)) unitKeys.set(key, { groupId, order });
  }

  let expired = 0;
  let recovered = 0;

  for (const { groupId, order: sample } of unitKeys.values()) {
    let orders;
    if (groupId) {
      const { data, error: groupErr } = await supabaseAdmin
        .from('orders')
        .select('id, payment_method, metadata, created_at, user_id, product_id, total_amount, currency, status, payment_id, aluu_order_id')
        .eq('metadata->>payment_group_id', groupId)
        .eq('status', 'pending');
      if (groupErr) throw groupErr;
      orders = (data ?? []).filter((o) => o.created_at < cutoff);
    } else {
      orders = [sample];
    }
    if (!orders.length) continue;

    const paymentMethod = orders[0].payment_method;
    if (paymentMethod === 'aluu' && aluu.isConfigured()) {
      const externalKey = groupId || orders[0].id;
      try {
        const statusResult = await aluu.checkOrderStatus(externalKey);
        if (aluuStatusCompleted(statusResult)) {
          const result = groupId
            ? await settleAluuCartGroupPaid(supabaseAdmin, orders, statusResult, 'expire_guard')
            : await settleAluuOrderPaid(supabaseAdmin, orders[0], statusResult, 'expire_guard');
          if (result.ok) {
            recovered += orders.length;
            continue;
          }
        }
      } catch (err) {
        console.warn(`[order-jobs] expire guard Aluu check failed for ${externalKey}:`, err.message);
      }
    }

    for (const row of orders) {
      await markPendingOrderFailed(supabaseAdmin, row);
      expired += 1;
    }
  }

  if (expired || recovered) {
    console.log(`[order-jobs] expire pending: ttl=${ttlHours}h expired=${expired} recovered=${recovered}`);
  }
  return { expired, recovered };
}

export async function provisionStuckProcessingOrders(supabaseAdmin, invokeFulfill, { batchSize = 12, minAgeSec = 45 } = {}) {
  const notBefore = new Date(Date.now() - minAgeSec * 1000).toISOString();
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('id, status, payment_method, metadata')
    .eq('status', 'processing')
    .not('product_id', 'is', null)
    .in('payment_method', ['aluu', 'razorpay'])
    .not('payment_id', 'is', null)
    .lte('updated_at', notBefore)
    .order('updated_at', { ascending: true })
    .limit(batchSize);

  if (error) throw error;
  if (!orders?.length) return { attempted: 0 };

  let attempted = 0;
  for (const order of orders) {
    const meta = order.metadata && typeof order.metadata === 'object' ? order.metadata : {};
    if (meta.fulfill_result || meta.fulfilled_at || meta.manual_fulfillment_note) continue;
    if (meta.wallet_topup === true) continue;
    attempted += 1;
    try {
      await invokeFulfill(order.id);
    } catch (err) {
      console.warn(`[order-jobs] auto-fulfill ${order.id}:`, err.message);
    }
  }
  return { attempted };
}

export function startProvisionWorker(supabaseAdmin, invokeFulfill, { intervalMs = 60_000 } = {}) {
  if (!invokeFulfill) return () => {};
  const tick = () => {
    provisionStuckProcessingOrders(supabaseAdmin, invokeFulfill).catch((err) => {
      console.error('[order-jobs] provision worker error:', err.message);
    });
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  setTimeout(tick, 15_000);
  console.log(`[order-jobs] auto-fulfill worker started (every ${intervalMs / 1000}s)`);
  return () => clearInterval(timer);
}

export function startExpirePendingWorker(supabaseAdmin, { intervalMs = 15 * 60_000, ttlHours = DEFAULT_PENDING_TTL_HOURS } = {}) {
  const tick = () => {
    expireStalePendingOrders(supabaseAdmin, { ttlHours }).catch((err) => {
      console.error('[order-jobs] expire-pending worker error:', err.message);
    });
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  setTimeout(tick, 30_000);
  console.log(`[order-jobs] expire-pending worker started (every ${intervalMs / 1000}s, ttl=${ttlHours}h)`);
  return () => clearInterval(timer);
}
