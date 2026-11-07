/**
 * Background jobs: auto-fulfill paid orders that never got a client-side /fulfill-order call
 * (common when the customer pays via shared UPI QR and closes the tab).
 */

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
