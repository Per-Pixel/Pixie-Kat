/**
 * SmileCode API Client  (SmileOne SmileCode API v3.0.5)
 *
 * API style: JSON-RPC 2.0 over HTTPS POST
 * Base URL:  https://www.smile.one/smilecode/api/
 *
 * Authentication:
 *   Every request is signed as a JWT (HS256).
 *   JWT header:  { alg, typ, sc-api-key, sc-api-version }
 *   JWT payload: the full JSON-RPC request body (includes iat)
 *   JWT secret:  SMILECODE_SECRET env var
 *
 * HTTP Headers sent with every request:
 *   Sc-Api-Key:     <SMILECODE_API_KEY>
 *   Sc-Api-Version: 2.0
 *   Authorization:  Bearer <JWT>
 *   Content-Type:   application/json
 *
 * Credentials are read from env vars:
 *   SMILECODE_API_KEY, SMILECODE_CLIENT_ID, SMILECODE_SECRET
 *
 * Note: ClientId is encoded inside the JWT header only (not in HTTP headers),
 * as required by the SmileCode spec.
 */

import crypto from 'crypto';

const BASE_URL = 'https://www.smile.one/smilecode/api/';

// ── JWT helpers ───────────────────────────────────────────────────────────────

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

/**
 * Generate a HS256 JWT where the payload IS the full JSON-RPC request body.
 * The API key is embedded in the JWT header as required by the SmileCode spec.
 */
function buildJWT(payload) {
  const apiKey    = process.env.SMILECODE_API_KEY;
  const clientId  = process.env.SMILECODE_CLIENT_ID;
  const secret    = process.env.SMILECODE_SECRET;

  // ClientId must NEVER appear in HTTP headers (per SmileCode spec) but MUST
  // be encoded inside the JWT. Docs are ambiguous about header vs payload,
  // so we include it in BOTH the JWT header and the JWT payload as a claim.
  const header = {
    alg: 'HS256',
    typ: 'JWT',
    'sc-api-key':     apiKey,
    'sc-api-version': '2.0',
    'sc-client-id':   clientId,
  };

  const fullPayload = {
    ...payload,
    'sc-client-id': clientId,
    client_id:      clientId,
  };

  const unsigned  = `${b64url(header)}.${b64url(fullPayload)}`;
  const signature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

// ── Core request ─────────────────────────────────────────────────────────────

/**
 * Execute a JSON-RPC 2.0 call against the SmileCode API.
 * @param {string} method   JSON-RPC method name
 * @param {object} params   method-specific params (iat is added automatically)
 * @returns {object}        parsed response body
 */
async function call(method, params = {}) {
  const apiKey   = process.env.SMILECODE_API_KEY;
  const clientId = process.env.SMILECODE_CLIENT_ID;
  const secret   = process.env.SMILECODE_SECRET;

  if (!apiKey || !clientId || !secret) {
    const missing = [
      !apiKey   && 'SMILECODE_API_KEY',
      !clientId && 'SMILECODE_CLIENT_ID',
      !secret   && 'SMILECODE_SECRET',
    ].filter(Boolean).join(', ');
    throw new Error(
      `SmileCode credentials incomplete. Missing: ${missing}. ` +
      'All three MUST be set in main/server/.env. Without CLIENT_ID the API ' +
      'silently returns only a partial product catalogue.',
    );
  }

  const iat     = Math.floor(Date.now() / 1000);
  const exp     = iat + 7200;              // 2-hour expiry required by SmileCode spec
  const payload = {
    jsonrpc: '2.0',
    id:      `SC-TEST-${iat}`,
    method,
    iat,
    exp,
    params:  { ...params, iat },
  };

  const jwt = buildJWT(payload);

  console.log(`[SmileCode] ${method} iat=${iat} id=${payload.id}`);
  console.log(`[SmileCode] JWT header:`, JSON.stringify(JSON.parse(Buffer.from(jwt.split('.')[0], 'base64url').toString())));

  const res = await fetch(BASE_URL, {
    method:  'POST',
    headers: {
      'Content-Type':   'application/json',
      'Sc-Api-Key':     apiKey,
      'Sc-Api-Version': '2.0',
      'Authorization':  `Bearer ${jwt}`,
    },
    body:   JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  const text = await res.text();
  console.log(`[SmileCode] HTTP ${res.status} response:`, text.slice(0, 500));

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`SmileCode returned non-JSON (${res.status}): ${text.slice(0, 300)}`);
  }

  if (data.error) {
    const code = data.error.code;
    const msg  = data.error.message || 'Unknown SmileCode error';
    if (code === -32001 || code === -32002 || code === -32019) {
      throw new Error(`SmileCode auth error (${code}): ${msg}. Check SMILECODE_API_KEY / SMILECODE_SECRET.`);
    }
    throw new Error(`SmileCode error (${code}): ${msg}`);
  }

  return data;
}

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Returns true if all required credentials are present in env.
 */
export function isConfigured() {
  return Boolean(
    process.env.SMILECODE_API_KEY &&
    process.env.SMILECODE_CLIENT_ID &&
    process.env.SMILECODE_SECRET,
  );
}

/**
 * Get the full list of products available on the account.
 * Returns result.productList[]  { name, type, subType, apiGame, isMultiPurchase, params }
 */
export async function productList() {
  return call('productlist');
}

/**
 * Get SKU list for a specific product (apiGame identifier).
 * Returns result.skuList[]  { sku, description, price, disprice, currency, pid, inventory }
 * Also returns result.serverList (for subType 2 products).
 * @param {string} apiGame  e.g. "mobilelegends", "honkaibr"
 */
export async function skuList(apiGame) {
  return call('skuList', { apiGame });
}

/**
 * Validate a player account before placing an order.
 * @param {string} apiGame
 * @param {object} userAccount  e.g. { user_id: "...", server_id: "..." }
 */
export async function validate(apiGame, userAccount) {
  return call('validate', { apiGame, userAccount });
}

/**
 * Place a top-up / voucher order.
 * @param {string} apiGame
 * @param {Array}  items        [{ sku, qty, pid }]
 * @param {object} userAccount  e.g. { user_id: "...", server_id: "..." }
 */
export async function sendOrder(apiGame, items, userAccount) {
  return call('sendOrder', { apiGame, items, userAccount });
}

/**
 * Get the status / code list for a previously placed order.
 * Docs (Image 1, methods table) name this RPC method `getOrder`.
 * @param {string} orderId  e.g. "SC25052705300825 0D"
 */
export async function orderDetail(orderId) {
  return call('getOrder', { orderId });
}

/**
 * Check the account's USD balance.
 * Returns result.usd_balance (Float)
 */
export async function balance() {
  return call('balance');
}
