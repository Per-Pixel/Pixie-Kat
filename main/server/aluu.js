/**
 * Aluu Pay — UPI Gateway integration
 *
 * Redirect-based payment flow:
 *   1. Server calls createOrder() → gets a payment_url
 *   2. Frontend redirects user to payment_url (new tab)
 *   3. Webhook (or polling via checkOrderStatus) confirms payment
 *
 * Env vars:
 *   ALUU_USER_TOKEN          — API token from pay.aluu.in merchant dashboard
 *   ALUU_WEBHOOK_SECRET      — Webhook signing secret
 *   ALUU_API_URL             — (optional) Override base URL, defaults to https://pay.aluu.in
 */

import process from 'node:process';
import crypto from 'node:crypto';

const DEFAULT_API_URL = 'https://pay.aluu.in';
const REQUEST_TIMEOUT_MS = 15_000;

function getApiUrl() {
  return String(process.env.ALUU_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
}

function getToken() {
  const token = String(process.env.ALUU_USER_TOKEN ?? '').trim();
  if (!token) throw new Error('Aluu Pay is not configured. Set ALUU_USER_TOKEN.');
  return token;
}

export function isConfigured() {
  return Boolean(String(process.env.ALUU_USER_TOKEN ?? '').trim());
}

/**
 * Create a payment order on Aluu Pay.
 *
 * @param {object} params
 * @param {string|number} params.amount        — Payment amount (whole number or decimal)
 * @param {string}        params.orderId       — Your unique order ID (will be sent as order_id)
 * @param {string}        params.customerMobile — Customer phone number
 * @param {string}        params.redirectUrl   — URL to redirect user after payment
 * @param {string}       [params.remark1]      — Optional remark
 * @param {string}       [params.remark2]      — Optional remark
 * @returns {Promise<{ orderId: string, paymentUrl: string }>}
 */
export async function createOrder({ amount, orderId, customerMobile, redirectUrl, remark1, remark2 }) {
  const token = getToken();

  if (!amount || Number(amount) <= 0) throw new Error('Payment amount must be greater than zero.');
  if (!orderId) throw new Error('An order ID is required.');
  if (!customerMobile) throw new Error('A customer mobile number is required.');
  if (!redirectUrl) throw new Error('A redirect URL is required.');

  const body = new URLSearchParams();
  body.append('customer_mobile', String(customerMobile).trim());
  body.append('user_token', token);
  body.append('amount', String(amount));
  body.append('order_id', String(orderId).trim());
  body.append('redirect_url', String(redirectUrl).trim());
  if (remark1) body.append('remark1', String(remark1).slice(0, 256));
  if (remark2) body.append('remark2', String(remark2).slice(0, 256));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiUrl()}/api/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    });

    const raw = await response.text();
    let payload;
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = { message: raw.slice(0, 200) };
    }

    if (!response.ok || payload.status === false) {
      throw new Error(payload?.message || `Aluu API request failed: HTTP ${response.status}`);
    }

    const result = payload?.result;
    if (!result?.orderId || !result?.payment_url) {
      throw new Error('Aluu returned an incomplete order response.');
    }

    return {
      orderId: String(result.orderId),
      paymentUrl: String(result.payment_url),
    };
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Aluu API request timed out.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Check the status of an order on Aluu Pay.
 *
 * @param {string} orderId — The order_id used when creating the order
 * @returns {Promise<{ status: string, txnStatus: string, orderId: string, amount: string, utr: string|null, date: string|null }>}
 */
export async function checkOrderStatus(orderId) {
  const token = getToken();
  if (!orderId) throw new Error('An order ID is required.');

  const body = new URLSearchParams();
  body.append('user_token', token);
  body.append('order_id', String(orderId).trim());

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiUrl()}/api/check-order-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    });

    const raw = await response.text();
    let payload;
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = { message: raw.slice(0, 200) };
    }

    if (payload.status === 'ERROR') {
      throw new Error(payload?.message || 'Aluu order status check failed.');
    }

    const result = payload?.result;
    if (!result) {
      throw new Error('Aluu returned an incomplete status response.');
    }

    return {
      status: String(payload.status || result.txnStatus || '').toUpperCase(),
      txnStatus: String(result.txnStatus || '').toUpperCase(),
      orderId: String(result.orderId || orderId),
      amount: String(result.amount || '0'),
      utr: result.utr ? String(result.utr) : null,
      date: result.date ? String(result.date) : null,
    };
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Aluu API request timed out.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Verify Aluu webhook signature.
 *
 * The signature is HMAC-SHA256 of `${timestamp}.${rawBody}` using the webhook secret.
 * The header value is prefixed with "sha256=".
 *
 * @param {string|Buffer} rawBody   — The raw request body
 * @param {string}        signature — X-Webhook-Signature header value ("sha256=...")
 * @param {string}        timestamp — X-Webhook-Timestamp header value
 * @param {string}       [secret]   — Webhook secret (defaults to ALUU_WEBHOOK_SECRET env var)
 * @returns {boolean}
 */
export function verifyWebhookSignature(rawBody, signature, timestamp, secret = process.env.ALUU_WEBHOOK_SECRET) {
  if (!secret || !signature || !timestamp || !rawBody) return false;

  const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
  const expected = 'sha256=' + crypto.createHmac('sha256', String(secret)).update(`${timestamp}.${bodyString}`).digest('hex');
  const provided = String(signature).trim();

  // Constant-time comparison
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(provided, 'utf8');
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
