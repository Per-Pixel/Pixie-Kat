/**
 * Smilecoin (smile.one) API helper for the Pixie-Kat server.
 *
 * Signs requests server-side using double-MD5 and proxies them to smile.one.
 * Ported from ZCodeProject/server.cjs
 *
 * Required env vars (in main/server/.env):
 *   SC_EMAIL    — email registered with Smile One
 *   SC_UID      — your Smile One UID (get from Smile One team)
 *   SC_KEY      — your merchant key
 *   SC_COUNTRY  — two-letter country code (default: 'in' for India — matches ZCodeProject)
 *
 * Optional:
 *   SC_ALLOW_TEST_ORDER — set to 'true' to enable real order creation (default: false)
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config(); // safe to call multiple times; won't override already-set vars

export const ALLOW_TEST_ORDER =
  String(process.env.SC_ALLOW_TEST_ORDER || 'false').toLowerCase() === 'true';

// ── Signing ──────────────────────────────────────────────────────────────────

function md5(str) {
  return crypto.createHash('md5').update(str, 'utf8').digest('hex');
}

/**
 * Build the Smilecoin signature for a params object.
 * Algorithm: sort keys ascending → join "k=v&" → append KEY → md5(md5(str))
 */
function sign(params) {
  const key   = String(process.env.SC_KEY || '').trim();
  const keys  = Object.keys(params).sort();
  const pairs = keys.map(k => `${k}=${params[k]}&`).join('');
  return md5(md5(pairs + key));
}

/** Build the signed form payload, adding uid / email / time / sign. */
export function buildPayload(methodParams) {
  const time = Math.floor(Date.now() / 1000);
  const payload = {
    uid:   String(process.env.SC_UID   || '').trim(),
    email: String(process.env.SC_EMAIL || '').trim(),
    time,
    ...methodParams,
  };
  payload.sign = sign(payload);
  return payload;
}

// ── HTTP ─────────────────────────────────────────────────────────────────────

/** POST form-data to a Smilecoin endpoint and return the parsed JSON body. */
export async function callSmileCoin(endpoint, methodParams = {}) {
  // Read country at call time so SC_COUNTRY from .env is always respected
  const country = String(process.env.SC_COUNTRY || 'in').trim().toLowerCase();
  const apiUrl  = `https://www.smile.one/${country}/smilecoin/api/`;

  const payload = buildPayload(methodParams);
  const form    = new URLSearchParams(payload).toString(); // matches ZCodeProject exactly

  if (process.env.DEBUG_SC === '1') {
    console.log(`[smilecoin] POST ${apiUrl}${endpoint}`);
    console.log('[smilecoin] payload:', JSON.stringify({ ...payload, sign: payload.sign.slice(0, 8) + '...' }));
  }

  const res = await fetch(apiUrl + endpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    form,
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(
      `Smilecoin ${endpoint} returned non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`
    );
  }
  if (process.env.DEBUG_SC === '1') {
    console.log('[smilecoin] response:', JSON.stringify(body).slice(0, 400));
  }
  return body;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function isConfigured() {
  return Boolean(
    String(process.env.SC_EMAIL || '').trim() &&
    String(process.env.SC_UID   || '').trim() &&
    String(process.env.SC_KEY   || '').trim()
  );
}
