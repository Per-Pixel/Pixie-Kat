import { test } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';

import {
  createOrder,
  currencyDecimals,
  toSubunits,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../razorpay.js';

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

test('converts Razorpay amounts to currency subunits', () => {
  assert.strictEqual(currencyDecimals('INR'), 2);
  assert.strictEqual(currencyDecimals('JPY'), 0);
  assert.strictEqual(currencyDecimals('KWD'), 3);
  assert.strictEqual(toSubunits('222.25', 'INR'), 22225);
  assert.strictEqual(toSubunits(295.991, 'KWD'), 295990);
  assert.strictEqual(toSubunits(295, 'JPY'), 295);
});

test('rejects invalid or non-positive payment amounts', () => {
  assert.throws(() => toSubunits(0, 'INR'), /greater than zero/);
  assert.throws(() => toSubunits(-1, 'INR'), /greater than zero/);
  assert.throws(() => toSubunits('not-a-number', 'INR'), /greater than zero/);
  assert.throws(() => toSubunits(10, 'invalid'), /three-letter currency/);
});

test('creates a Razorpay order with smallest-unit amount and bounded notes', async () => {
  const originalFetch = globalThis.fetch;
  const originalKeyId = process.env.RAZORPAY_KEY_ID;
  const originalKeySecret = process.env.RAZORPAY_KEY_SECRET;
  let request;
  process.env.RAZORPAY_KEY_ID = 'rzp_test_example';
  process.env.RAZORPAY_KEY_SECRET = 'test_secret';
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      text: async () => JSON.stringify({ id: 'order_test123', amount: 22225, currency: 'INR' }),
    };
  };

  try {
    const result = await createOrder({
      amount: 222.25,
      currency: 'INR',
      receipt: 'internal-order-id',
      notes: { source: 'checkout', amount: 222.25 },
    });
    const body = JSON.parse(request.options.body);
    assert.strictEqual(result.id, 'order_test123');
    assert.strictEqual(request.url, 'https://api.razorpay.com/v1/orders');
    assert.strictEqual(request.options.method, 'POST');
    assert.match(request.options.headers.Authorization, /^Basic /);
    assert.deepStrictEqual(body, {
      amount: 22225,
      currency: 'INR',
      receipt: 'internal-order-id',
      notes: { source: 'checkout', amount: '222.25' },
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKeyId === undefined) delete process.env.RAZORPAY_KEY_ID;
    else process.env.RAZORPAY_KEY_ID = originalKeyId;
    if (originalKeySecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
    else process.env.RAZORPAY_KEY_SECRET = originalKeySecret;
  }
});

test('verifies the Standard Checkout payment signature', () => {
  const secret = 'test-key-secret';
  const orderId = 'order_test123';
  const paymentId = 'pay_test123';
  const signature = sign(`${orderId}|${paymentId}`, secret);

  assert.strictEqual(verifyPaymentSignature(orderId, paymentId, signature, secret), true);
  assert.strictEqual(verifyPaymentSignature(orderId, paymentId, sign('different', secret), secret), false);
  assert.strictEqual(verifyPaymentSignature(orderId, 'pay_other', signature, secret), false);
  assert.strictEqual(verifyPaymentSignature(orderId, paymentId, signature, 'other-secret'), false);
});

test('verifies webhooks against the raw request body', () => {
  const secret = 'test-webhook-secret';
  const rawBody = JSON.stringify({ event: 'payment.captured', payload: { id: 'pay_test123' } });
  const signature = sign(rawBody, secret);

  assert.strictEqual(verifyWebhookSignature(Buffer.from(rawBody), signature, secret), true);
  assert.strictEqual(verifyWebhookSignature(Buffer.from(`${rawBody}\n`), signature, secret), false);
  assert.strictEqual(verifyWebhookSignature(Buffer.from(rawBody), signature, 'other-secret'), false);
  assert.strictEqual(verifyWebhookSignature(Buffer.from(rawBody), undefined, secret), false);
});
