import process from 'node:process';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';

const RAZORPAY_API_URL = 'https://api.razorpay.com/v1';
const REQUEST_TIMEOUT_MS = 15_000;
const ZERO_DECIMAL_CURRENCIES = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
const THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);

function credentials() {
  const keyId = String(process.env.RAZORPAY_KEY_ID ?? '').trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET ?? '').trim();
  if (!keyId || !keySecret) {
    throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
  return { keyId, keySecret };
}

export function isConfigured() {
  return Boolean(String(process.env.RAZORPAY_KEY_ID ?? '').trim() && String(process.env.RAZORPAY_KEY_SECRET ?? '').trim());
}

export function getKeyId() {
  const keyId = String(process.env.RAZORPAY_KEY_ID ?? '').trim();
  if (!keyId) throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID.');
  return keyId;
}

export function normalizeCurrency(value) {
  const currency = String(value ?? '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('A valid three-letter currency is required.');
  return currency;
}

export function currencyDecimals(currency) {
  const normalized = normalizeCurrency(currency);
  if (ZERO_DECIMAL_CURRENCIES.has(normalized)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(normalized)) return 3;
  return 2;
}

export function toSubunits(amount, currency) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error('Payment amount must be greater than zero.');

  const normalizedCurrency = normalizeCurrency(currency);
  let subunits = Math.round(value * (10 ** currencyDecimals(normalizedCurrency)));
  if (THREE_DECIMAL_CURRENCIES.has(normalizedCurrency)) subunits = Math.round(subunits / 10) * 10;
  if (!Number.isSafeInteger(subunits) || subunits <= 0) throw new Error('Payment amount is out of range.');
  return subunits;
}

function safeNotes(notes) {
  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) return undefined;
  return Object.fromEntries(
    Object.entries(notes)
      .slice(0, 15)
      .map(([key, value]) => [String(key).slice(0, 40), String(value ?? '').slice(0, 256)])
  );
}

async function request(path, { method = 'GET', body } = {}) {
  const { keyId, keySecret } = credentials();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${RAZORPAY_API_URL}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const raw = await response.text();
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = { description: raw.slice(0, 200) };
    }

    if (!response.ok) {
      const description = payload?.error?.description || payload?.description || `HTTP ${response.status}`;
      throw new Error(`Razorpay API request failed: ${description}`);
    }

    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Razorpay API request timed out.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function createOrder({ amount, currency, receipt, notes }) {
  const normalizedCurrency = normalizeCurrency(currency);
  const normalizedReceipt = String(receipt ?? '').trim();
  if (!normalizedReceipt || normalizedReceipt.length > 40) throw new Error('A valid Razorpay receipt is required.');
  const normalizedNotes = safeNotes(notes);

  return request('/orders', {
    method: 'POST',
    body: {
      amount: toSubunits(amount, normalizedCurrency),
      currency: normalizedCurrency,
      receipt: normalizedReceipt,
      ...(normalizedNotes ? { notes: normalizedNotes } : {}),
    },
  });
}

export async function fetchPayment(paymentId) {
  const normalizedPaymentId = String(paymentId ?? '').trim();
  if (!/^pay_[A-Za-z0-9]+$/.test(normalizedPaymentId)) throw new Error('Invalid Razorpay payment ID.');
  return request(`/payments/${encodeURIComponent(normalizedPaymentId)}`);
}

export async function refundPayment(paymentId, amount, currency) {
  const normalizedPaymentId = String(paymentId ?? '').trim();
  if (!/^pay_[A-Za-z0-9]+$/.test(normalizedPaymentId)) throw new Error('Invalid Razorpay payment ID.');

  return request(`/payments/${encodeURIComponent(normalizedPaymentId)}/refund`, {
    method: 'POST',
    body: { amount: toSubunits(amount, currency) },
  });
}

function signaturesMatch(payload, signature, secret) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const provided = String(signature).trim();
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(provided, 'utf8');
  return expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

export function verifyPaymentSignature(orderId, paymentId, signature, secret = process.env.RAZORPAY_KEY_SECRET) {
  if (!orderId || !paymentId) return false;
  return signaturesMatch(`${orderId}|${paymentId}`, signature, secret);
}

export function verifyWebhookSignature(rawBody, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  if (!rawBody) return false;
  return signaturesMatch(rawBody, signature, secret);
}
