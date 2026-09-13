import { test } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';

import {
  isConfigured,
  createOrder,
  checkOrderStatus,
  verifyWebhookSignature,
} from '../aluu.js';

function sign(payload, timestamp, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
}

test('detects if Aluu is configured', () => {
  const orig = process.env.ALUU_USER_TOKEN;
  try {
    delete process.env.ALUU_USER_TOKEN;
    assert.strictEqual(isConfigured(), false);
    process.env.ALUU_USER_TOKEN = 'test_token';
    assert.strictEqual(isConfigured(), true);
  } finally {
    if (orig !== undefined) process.env.ALUU_USER_TOKEN = orig;
    else delete process.env.ALUU_USER_TOKEN;
  }
});

test('createOrder rejects invalid parameters', async () => {
  const orig = process.env.ALUU_USER_TOKEN;
  process.env.ALUU_USER_TOKEN = 'test_token';
  try {
    await assert.rejects(() => createOrder({ amount: 0, orderId: '1', customerMobile: '9999999999', redirectUrl: 'http://test' }), /greater than zero/);
    await assert.rejects(() => createOrder({ amount: 10, orderId: '', customerMobile: '9999999999', redirectUrl: 'http://test' }), /order ID is required/);
    await assert.rejects(() => createOrder({ amount: 10, orderId: '1', customerMobile: '', redirectUrl: 'http://test' }), /customer mobile/);
    await assert.rejects(() => createOrder({ amount: 10, orderId: '1', customerMobile: '9999999999', redirectUrl: '' }), /redirect URL/);
  } finally {
    if (orig !== undefined) process.env.ALUU_USER_TOKEN = orig;
    else delete process.env.ALUU_USER_TOKEN;
  }
});

test('createOrder sends proper form-urlencoded payload and parses success response', async () => {
  const origFetch = globalThis.fetch;
  const origToken = process.env.ALUU_USER_TOKEN;
  process.env.ALUU_USER_TOKEN = 'token_abc123';
  let capturedRequest;

  globalThis.fetch = async (url, options) => {
    capturedRequest = { url, options };
    return {
      ok: true,
      text: async () => JSON.stringify({
        status: true,
        message: 'Order Created Successfully',
        result: {
          orderId: 'aluu_internal_999',
          payment_url: 'https://pay.aluu.in/pay/test999',
        },
      }),
    };
  };

  try {
    const result = await createOrder({
      amount: 199.50,
      orderId: 'my_order_123',
      customerMobile: '9876543210',
      redirectUrl: 'https://pixiekat.com/orders/my_order_123',
      remark1: 'Test remark',
    });

    assert.strictEqual(capturedRequest.url, 'https://pay.aluu.in/api/create-order');
    assert.strictEqual(capturedRequest.options.method, 'POST');
    assert.strictEqual(capturedRequest.options.headers['Content-Type'], 'application/x-www-form-urlencoded');

    const params = new URLSearchParams(capturedRequest.options.body);
    assert.strictEqual(params.get('customer_mobile'), '9876543210');
    assert.strictEqual(params.get('user_token'), 'token_abc123');
    assert.strictEqual(params.get('amount'), '199.5');
    assert.strictEqual(params.get('order_id'), 'my_order_123');
    assert.strictEqual(params.get('redirect_url'), 'https://pixiekat.com/orders/my_order_123');
    assert.strictEqual(params.get('remark1'), 'Test remark');

    assert.deepStrictEqual(result, {
      orderId: 'aluu_internal_999',
      paymentUrl: 'https://pay.aluu.in/pay/test999',
    });
  } finally {
    globalThis.fetch = origFetch;
    if (origToken !== undefined) process.env.ALUU_USER_TOKEN = origToken;
    else delete process.env.ALUU_USER_TOKEN;
  }
});

test('createOrder surfaces API error when Aluu returns status:"false" (string)', async () => {
  const origFetch = globalThis.fetch;
  const origToken = process.env.ALUU_USER_TOKEN;
  process.env.ALUU_USER_TOKEN = 'token_abc123';

  globalThis.fetch = async () => ({
    ok: true,
    text: async () => JSON.stringify({ status: 'false', message: 'Merchant Not Linked' }),
  });

  try {
    await assert.rejects(
      () => createOrder({ amount: 1, orderId: 'o1', customerMobile: '9999999999', redirectUrl: 'https://example.com' }),
      /Merchant Not Linked/,
    );
  } finally {
    globalThis.fetch = origFetch;
    if (origToken !== undefined) process.env.ALUU_USER_TOKEN = origToken;
    else delete process.env.ALUU_USER_TOKEN;
  }
});

test('checkOrderStatus surfaces API error when Aluu returns status:"false" (string)', async () => {
  const origFetch = globalThis.fetch;
  const origToken = process.env.ALUU_USER_TOKEN;
  process.env.ALUU_USER_TOKEN = 'token_abc123';

  globalThis.fetch = async () => ({
    ok: true,
    text: async () => JSON.stringify({ status: 'false', message: 'Order not found' }),
  });

  try {
    await assert.rejects(
      () => checkOrderStatus('o1'),
      /Order not found/,
    );
  } finally {
    globalThis.fetch = origFetch;
    if (origToken !== undefined) process.env.ALUU_USER_TOKEN = origToken;
    else delete process.env.ALUU_USER_TOKEN;
  }
});

test('checkOrderStatus sends order_id and parses SUCCESS status', async () => {
  const origFetch = globalThis.fetch;
  const origToken = process.env.ALUU_USER_TOKEN;
  process.env.ALUU_USER_TOKEN = 'token_abc123';
  let capturedRequest;

  globalThis.fetch = async (url, options) => {
    capturedRequest = { url, options };
    return {
      ok: true,
      text: async () => JSON.stringify({
        status: 'COMPLETED',
        result: {
          txnStatus: 'SUCCESS',
          orderId: 'my_order_123',
          amount: '199.50',
          utr: 'UTR1234567890',
          date: '2026-09-13 15:00:00',
        },
      }),
    };
  };

  try {
    const status = await checkOrderStatus('my_order_123');
    assert.strictEqual(capturedRequest.url, 'https://pay.aluu.in/api/check-order-status');
    const params = new URLSearchParams(capturedRequest.options.body);
    assert.strictEqual(params.get('order_id'), 'my_order_123');
    assert.strictEqual(params.get('user_token'), 'token_abc123');

    assert.strictEqual(status.txnStatus, 'SUCCESS');
    assert.strictEqual(status.utr, 'UTR1234567890');
    assert.strictEqual(status.amount, '199.50');
  } finally {
    globalThis.fetch = origFetch;
    if (origToken !== undefined) process.env.ALUU_USER_TOKEN = origToken;
    else delete process.env.ALUU_USER_TOKEN;
  }
});

test('verifyWebhookSignature validates HMAC-SHA256 signature', () => {
  const secret = 'webhook_secret_key_123';
  const timestamp = '1726220000';
  const rawBody = JSON.stringify({
    status: 'COMPLETED',
    order_id: 'my_order_123',
    utr: 'UTR99887766',
    amount: '199.50',
  });
  const validSig = sign(rawBody, timestamp, secret);

  // Valid
  assert.strictEqual(verifyWebhookSignature(rawBody, validSig, timestamp, secret), true);
  assert.strictEqual(verifyWebhookSignature(Buffer.from(rawBody), validSig, timestamp, secret), true);

  // Wrong secret
  assert.strictEqual(verifyWebhookSignature(rawBody, validSig, timestamp, 'wrong_secret'), false);

  // Wrong timestamp
  assert.strictEqual(verifyWebhookSignature(rawBody, validSig, '1726220001', secret), false);

  // Tampered body
  assert.strictEqual(verifyWebhookSignature(rawBody + ' ', validSig, timestamp, secret), false);

  // Missing values
  assert.strictEqual(verifyWebhookSignature(rawBody, undefined, timestamp, secret), false);
  assert.strictEqual(verifyWebhookSignature(rawBody, validSig, undefined, secret), false);
  assert.strictEqual(verifyWebhookSignature(rawBody, validSig, timestamp, ''), false);
});
