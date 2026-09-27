import { test } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

const { isKindEnabled, renderNotification, processPending, isMailerConfigured } =
  await import('../notifications.js');

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

test('renderNotification produces subject+html for every kind', () => {
  for (const kind of ['order_processing', 'order_completed', 'order_failed', 'order_refunded', 'login_alert']) {
    const r = renderNotification({ ...ORDER_ROW, kind, payload: { ...ORDER_ROW.payload, ip: '1.2.3.4', device: 'Desktop', browser: 'Chrome' } });
    assert.ok(r && r.subject && r.html, `kind ${kind} should render`);
  }
  assert.strictEqual(renderNotification({ ...ORDER_ROW, kind: 'bogus' }), null);
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
