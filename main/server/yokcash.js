/**
 * Yokcash API client (yokcash.com game top-up provider).
 *
 * API style: plain HTTPS POST, application/json
 * Base URL:  https://api.yokcash.com/
 * Endpoints: service | order | status | saldo
 *
 * Auth: `api_key` field inside the JSON body. The account also enforces a
 * server-IP whitelist configured by Yokcash support — requests must originate
 * from the whitelisted IP (prod EB env EIP: 35.154.145.21). Local dev calls
 * will be rejected unless the dev machine's IP is whitelisted too.
 *
 * Order statuses: pending | processing | success | cancel | refund
 * Status callbacks POST {id, idtrx, keterangan, status} from 103.146.202.42.
 *
 * Env vars (main/server/.env or EB environment properties):
 *   YOKCASH_API_KEY           — required
 *   YOKCASH_API_URL           — optional override (default https://api.yokcash.com)
 *   YOKCASH_ALLOW_TEST_ORDER  — 'true' enables real order placement via the
 *                               super-admin route (default false). Deliberately
 *                               NOT gated to non-production like Smilecoin's:
 *                               the IP whitelist means only the server can call
 *                               Yokcash at all, so prod is where tests must run.
 *   YOKCASH_CALLBACK_IP       — expected callback source IP (default 103.146.202.42)
 */

import dotenv from 'dotenv';
dotenv.config(); // safe to call multiple times; won't override already-set vars

export const ALLOW_TEST_ORDER =
  String(process.env.YOKCASH_ALLOW_TEST_ORDER || 'false').toLowerCase() === 'true';

export const CALLBACK_IP = String(process.env.YOKCASH_CALLBACK_IP || '103.146.202.42').trim();

const BASE_URL = String(process.env.YOKCASH_API_URL || 'https://api.yokcash.com').replace(/\/+$/, '');

// ── Core request ─────────────────────────────────────────────────────────────

/**
 * POST JSON to a Yokcash endpoint and return the parsed body.
 * Response shape is { status: boolean, msg: string, data: any } — callers
 * inspect `status` themselves; we only throw on transport/parse failures.
 */
export async function call(endpoint, params = {}) {
  const apiKey = String(process.env.YOKCASH_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Yokcash not configured. Set YOKCASH_API_KEY in server env.');
  }

  const url = `${BASE_URL}/${endpoint.replace(/^\/+/, '')}`;
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ api_key: apiKey, ...params }),
    signal:  AbortSignal.timeout(15_000),
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    // IP-whitelist rejections typically come back as a non-JSON error page/block
    throw new Error(`Yokcash ${endpoint} returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  console.log(`[yokcash] ${endpoint} → HTTP ${res.status} status=${body?.status} msg=${JSON.stringify(body?.msg ?? '').slice(0, 120)}`);
  return body;
}

export function isConfigured() {
  return Boolean(String(process.env.YOKCASH_API_KEY || '').trim());
}

// ── Public helpers ────────────────────────────────────────────────────────────

/** Catalog of services: data[] = { id, nama_layanan, kategori, harga, harga_gold, harga_silver, harga_pro, status } (prices in IDR). */
export async function services() {
  return call('service');
}

/** Account balance: data.saldo (IDR). Doubles as the connectivity/auth check. */
export async function saldo() {
  return call('saldo');
}

/** Order status by Yokcash invoice id: data = { id, keterangan, status }. */
export async function orderStatus(orderId) {
  return call('status', { order_id: String(orderId) });
}

/**
 * Place a top-up order.
 * @param {object} o
 * @param {string} o.service_id  service code from /service (e.g. "ML86")
 * @param {string} o.target      "userId|zoneId" or bare "userId" when no zone
 * @param {string} o.kontak      buyer phone, e.g. "628888"
 * @param {string} o.idtrx       our unique order id — deduped by Yokcash
 * @param {string} [o.callback]  status callback URL
 */
export async function placeOrder({ service_id, target, kontak, idtrx, callback } = {}) {
  const params = {
    service_id: String(service_id),
    target:     String(target),
    kontak:     String(kontak),
    idtrx:      String(idtrx),
  };
  if (callback) params.callback = String(callback);
  return call('order', params);
}
