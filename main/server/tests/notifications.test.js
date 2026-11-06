import { test } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

const {
  isKindEnabled, renderNotification, processPending, isMailerConfigured,
  prepareDispatch, orderWasRefunded, isGroupSettled,
} = await import('../notifications.js');

const ORDER_ROW = {
  id: 1,
  user_id: 'u1',
  order_id: 'b3f9c2e1-1234-5678-9abc-def012345678',
  kind: 'order_completed',
  payload: {
    order_id: 'b3f9c2e1-1234-5678-9abc-def012345678',
    product_name: 'Weekly Pass',
    quantity: 2,
    total_amount: 199,
    currency: 'INR',
    payment_method: 'wallet',
  },
  attempts: 0,
};

test('isKindEnabled: missing settings row means defaults on', () => {
  assert.strictEqual(isKindEnabled(null, 'order_completed'), true);
  assert.strictEqual(isKindEnabled(null, 'login_alert'), true);
});

test('isKindEnabled: email_notifications=false mutes everything', () => {
  const s = { email_notifications: false, order_notifications: true, login_alerts: true };
  assert.strictEqual(isKindEnabled(s, 'order_completed'), false);
  assert.strictEqual(isKindEnabled(s, 'login_alert'), false);
});

test('isKindEnabled: per-kind flags respected independently', () => {
  const noOrders = { email_notifications: true, order_notifications: false, login_alerts: true };
  assert.strictEqual(isKindEnabled(noOrders, 'order_processing'), false);
  assert.strictEqual(isKindEnabled(noOrders, 'order_completed'), false);
  assert.strictEqual(isKindEnabled(noOrders, 'order_failed'), false);
  assert.strictEqual(isKindEnabled(noOrders, 'order_refunded'), false);
  assert.strictEqual(isKindEnabled(noOrders, 'login_alert'), true);

  const noLogin = { email_notifications: true, order_notifications: true, login_alerts: false };
  assert.strictEqual(isKindEnabled(noLogin, 'login_alert'), false);
  assert.strictEqual(isKindEnabled(noLogin, 'order_failed'), true);
});

test('renderNotification produces subject+html for every live kind and drops processing', () => {
  for (const kind of ['order_completed', 'order_failed', 'order_refunded', 'login_alert', 'cart_settled']) {
    const r = renderNotification({ ...ORDER_ROW, kind, payload: { ...ORDER_ROW.payload, ip: '1.2.3.4', device: 'Desktop', browser: 'Chrome' } });
    assert.ok(r && r.subject && r.html, `kind ${kind} should render`);
  }
  assert.strictEqual(renderNotification({ ...ORDER_ROW, kind: 'order_processing' }), null);
  assert.strictEqual(renderNotification({ ...ORDER_ROW, kind: 'bogus' }), null);
});

test('renderNotification renders leaderboard_winner with tier and perks', () => {
  const r = renderNotification({
    ...ORDER_ROW,
    kind: 'leaderboard_winner',
    payload: {
      period: '2026-09',
      rank: 1,
      order_count: 12,
      total_spent: 4800,
      tier: 'champion',
      tier_label: 'Champion',
      frame: 'champion',
      gif_avatar: true,
      wallet_bonus: 250,
    },
  });
  assert.ok(r && r.subject.includes('#1'));
  assert.ok(r.subject.includes('2026-09'));
  assert.ok(r.html.includes('₹4,800'));
  assert.ok(r.html.includes('Champion'));
  assert.ok(r.html.includes('GIF profile picture'));
  assert.ok(r.html.includes('250 PKS'));
});

test('isKindEnabled: leaderboard_winner rides order_notifications flag', () => {
  const off = { email_notifications: true, order_notifications: false };
  assert.strictEqual(isKindEnabled(off, 'leaderboard_winner'), false);
  assert.strictEqual(isKindEnabled(null, 'leaderboard_winner'), true);
});

test('renderNotification escapes payload HTML and includes order details', () => {
  const r = renderNotification({
    ...ORDER_ROW,
    payload: { ...ORDER_ROW.payload, product_name: '<script>alert(1)</script>' },
  });
  assert.ok(!r.html.includes('<script>alert(1)</script>'));
  assert.ok(r.html.includes('&lt;script&gt;'));
  assert.ok(r.html.includes('₹199'));
  assert.ok(r.subject.includes('#B3F9C2E1'));
});

test('isMailerConfigured is false without SMTP credentials', () => {
  const saved = { h: process.env.SMTP_HOST, u: process.env.SMTP_USER, p: process.env.SMTP_PASS };
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  assert.strictEqual(isMailerConfigured(), false);
  process.env.SMTP_HOST = saved.h ?? '';
  if (saved.u) process.env.SMTP_USER = saved.u;
  if (saved.p) process.env.SMTP_PASS = saved.p;
});

/** Minimal chainable supabase stub for the worker path. */
function fakeSupabase({ rows = [], settings = null, email = 'u@example.com' } = {}) {
  const updates = [];
  return {
    updates,
    auth: { admin: { getUserById: async () => ({ data: { user: { email } }, error: null }) } },
    from(table) {
      const chain = {
        _filters: {},
        _update: null,
        select() { return this; },
        eq(col, val) { this._filters[col] = val; return this; },
        order() { return this; },
        limit() { return this; },
        update(vals) { this._update = vals; return this; },
        maybeSingle() { return Promise.resolve({ data: settings, error: null }); },
        then(resolve) {
          if (this._update) {
            updates.push({ table, values: this._update, filters: this._filters });
            resolve({ data: this._update.status === 'sending' ? [{ id: this._filters.id }] : null, error: null });
          } else {
            resolve({ data: table === 'notification_outbox' ? rows : settings, error: null });
          }
        },
      };
      return chain;
    },
  };
}

test('processPending sends when toggles allow it', async () => {
  const sb = fakeSupabase({ rows: [ORDER_ROW], settings: { email_notifications: true, order_notifications: true, login_alerts: true } });
  const sent = [];
  const n = await processPending(sb, async (msg) => sent.push(msg));
  assert.strictEqual(n, 1);
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0].to, 'u@example.com');
  assert.ok(sb.updates.some((u) => u.values.status === 'sent'));
});

test('processPending marks skipped when user muted order notifications', async () => {
  const sb = fakeSupabase({ rows: [ORDER_ROW], settings: { email_notifications: true, order_notifications: false, login_alerts: true } });
  const sent = [];
  const n = await processPending(sb, async (msg) => sent.push(msg));
  assert.strictEqual(n, 0);
  assert.strictEqual(sent.length, 0);
  assert.ok(sb.updates.some((u) => u.values.status === 'skipped'));
});

test('processPending marks row failed after MAX_ATTEMPTS', async () => {
  const dying = { ...ORDER_ROW, attempts: 4 };
  const sb = fakeSupabase({ rows: [dying], settings: null });
  await processPending(sb, async () => { throw new Error('SMTP down'); });
  assert.ok(sb.updates.some((u) => u.values.status === 'failed' && u.values.last_error === 'SMTP down'));
});

test('processPending leaves row pending on transient send failure', async () => {
  const sb = fakeSupabase({ rows: [ORDER_ROW], settings: null });
  await processPending(sb, async () => { throw new Error('SMTP down'); });
  assert.ok(sb.updates.some((u) => u.values.status === 'pending'));
});

test('processPending does not send processing mail', async () => {
  const sb = fakeSupabase({
    rows: [{ ...ORDER_ROW, kind: 'order_processing' }],
    settings: null,
  });
  const sent = [];
  const n = await processPending(sb, async (msg) => sent.push(msg));
  assert.strictEqual(n, 0);
  assert.strictEqual(sent.length, 0);
  assert.ok(sb.updates.some((u) => u.values.status === 'skipped'));
});

test('isKindEnabled: cart receipts follow the order notifications toggle', () => {
  const off = { email_notifications: true, order_notifications: false };
  assert.strictEqual(isKindEnabled(off, 'cart_settled'), false);
  assert.strictEqual(isKindEnabled(null, 'cart_settled'), true);
});

test('order outcome mail states whether it was refunded', () => {
  const failed = renderNotification({ ...ORDER_ROW, kind: 'order_failed' });
  assert.ok(failed.subject.includes('#B3F9C2E1'));
  assert.ok(failed.html.includes('Refunded: No'));
  assert.ok(failed.html.includes('This order did not go through'));

  const refunded = renderNotification({
    ...ORDER_ROW,
    kind: 'order_failed',
    payload: { ...ORDER_ROW.payload, outcome: 'failed', refunded: true, refund_amount: 199 },
  });
  assert.ok(refunded.subject.startsWith('Refunded'));
  assert.ok(refunded.html.includes('Refunded: Yes · ₹199 back in your Pixie Wallet'));
  assert.ok(refunded.html.includes('PIXIEKAT'));
  assert.ok(refunded.html.includes('View your orders'));
});

test('cart receipt is one email listing every order', () => {
  const r = renderNotification({
    ...ORDER_ROW,
    kind: 'cart_settled',
    payload: {
      payment_group_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      currency: 'INR',
      payment_method: 'wallet',
      total_amount: 300,
      items: [
        { ...ORDER_ROW.payload, product_name: 'Weekly Pass', total_amount: 199, outcome: 'done', refunded: false },
        {
          order_id: 'cccccccc-1234-5678-9abc-def012345678',
          product_name: 'Twilight Pass',
          quantity: 1,
          total_amount: 101,
          currency: 'INR',
          payment_method: 'wallet',
          outcome: 'failed',
          refunded: true,
          refund_amount: 101,
        },
      ],
    },
  });
  assert.ok(r.subject.includes('2 orders'));
  assert.equal((r.html.match(/Weekly Pass/g) || []).length, 1);
  assert.ok(r.html.includes('Twilight Pass'));
  assert.ok(r.html.includes('Refunded: No'));
  assert.ok(r.html.includes('Refunded: Yes · ₹101 back in your Pixie Wallet'));
  assert.ok(r.text.includes('Weekly Pass'));
  assert.ok(r.text.includes('Twilight Pass'));
});

test('orderWasRefunded treats wallet failures and gateway refunds as returned', () => {
  assert.equal(orderWasRefunded({ status: 'failed', payment_method: 'wallet' }, 0), true);
  assert.equal(orderWasRefunded({ status: 'failed', payment_method: 'razorpay' }, 0), false);
  assert.equal(orderWasRefunded({ status: 'completed', payment_method: 'wallet', metadata: {} }, 40), true);
  assert.equal(orderWasRefunded({
    status: 'on_hold',
    payment_method: 'razorpay',
    metadata: { razorpay_refund: { status: 'failed' } },
  }, 0), false);
  assert.equal(isGroupSettled([
    { status: 'completed' },
    { status: 'processing' },
  ]), false);
  assert.equal(isGroupSettled([
    { status: 'completed' },
    { status: 'refunded' },
  ]), true);
});

test('prepareDispatch holds a cart until every item has landed, then sends one receipt', () => {
  const row = { ...ORDER_ROW, id: 11, order_id: 'order-a' };
  const open = prepareDispatch(row, {
    order: { id: 'order-a', status: 'completed', metadata: { payment_group_id: 'group-1' } },
    groupOrders: [
      { id: 'order-a', status: 'completed', metadata: { payment_group_id: 'group-1' } },
      { id: 'order-b', status: 'processing', metadata: { payment_group_id: 'group-1' } },
    ],
  });
  assert.equal(open.action, 'skip');

  const settled = prepareDispatch(row, {
    order: {
      id: 'order-a', status: 'completed', product_name: 'Weekly Pass', quantity: 1,
      total_amount: 199, currency: 'INR', payment_method: 'wallet',
      metadata: { payment_group_id: 'group-1' },
    },
    groupOrders: [
      {
        id: 'order-a', status: 'completed', product_name: 'Weekly Pass', quantity: 1,
        total_amount: 199, currency: 'INR', payment_method: 'wallet',
        metadata: { payment_group_id: 'group-1' },
      },
      {
        id: 'order-b', status: 'failed', product_name: 'Twilight Pass', quantity: 1,
        total_amount: 101, currency: 'INR', payment_method: 'wallet',
        metadata: { payment_group_id: 'group-1' },
      },
    ],
    refundTotals: { 'order-b': 101 },
    notices: [
      { id: 11, kind: 'order_completed', status: 'pending' },
      { id: 12, kind: 'order_failed', status: 'pending' },
      { id: 9, kind: 'order_processing', status: 'pending' },
    ],
  });
  assert.equal(settled.action, 'digest');
  assert.equal(settled.row.kind, 'cart_settled');
  assert.deepEqual(settled.skipIds, [12, 9]);
  assert.equal(settled.row.payload.items[0].outcome, 'done');
  assert.equal(settled.row.payload.items[0].refunded, false);
  assert.equal(settled.row.payload.items[1].refunded, true);
  assert.equal(settled.row.payload.total_amount, 300);
});

test('prepareDispatch marks a wallet failure as refunded from the live order', () => {
  const decision = prepareDispatch(
    { ...ORDER_ROW, kind: 'order_failed', payload: { order_id: ORDER_ROW.order_id, product_name: 'Weekly Pass' } },
    {
      order: {
        id: ORDER_ROW.order_id,
        status: 'failed',
        payment_method: 'wallet',
        product_name: 'Weekly Pass',
        quantity: 1,
        total_amount: 199,
        currency: 'INR',
      },
    },
  );
  assert.equal(decision.action, 'send');
  assert.equal(decision.row.payload.refunded, true);
  assert.equal(decision.row.payload.refund_amount, 199);
  const mail = renderNotification(decision.row);
  assert.ok(mail.html.includes('Refunded: Yes · ₹199 back in your Pixie Wallet'));
});

test('prepareDispatch does not send a second email when the failure mail already covers the refund', () => {
  const decision = prepareDispatch(
    { ...ORDER_ROW, id: 4, kind: 'order_refunded' },
    {
      order: { id: ORDER_ROW.order_id, status: 'refunded', payment_method: 'wallet', total_amount: 199 },
      notices: [{ id: 3, kind: 'order_failed', status: 'sent' }],
    },
  );
  assert.equal(decision.action, 'skip');
});
