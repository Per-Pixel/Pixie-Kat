/**
 * Pixie-Kat Admin Proxy Server
 *
 * Handles ONLY privileged operations requiring the Supabase service role key.
 * All regular data ops (user list, profile reads/writes, settings) now go
 * through the Supabase client directly with RLS enforcement.
 *
 * Endpoints:
 *   POST   /api/admin/users/:id/force-logout    Revoke all sessions
 *   POST   /api/admin/users/:id/disable-2fa     Unenroll all MFA factors
 *   POST   /api/admin/users/:id/reset-password  Send password reset email
 *   POST   /api/admin/users/:id/change-email    Override email in auth.users
 *   POST   /api/admin/users/:id/status          Update status + audit log
 *   DELETE /api/admin/users/:id                 Hard-delete from auth.users
 *   POST   /api/admin/wallet/adjust             Atomic wallet credit/debit
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { supabaseAdmin, verifyAdminRequest } from './supabase-admin.js';
import * as smileOne from './smileone.js';
import * as smileCoin from './smilecoin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(express.json());

const productionOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? productionOrigins
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

app.use(cors({ origin: allowedOrigins, credentials: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Auth middleware — verifies Supabase JWT and checks admin/support role
const requireAdmin = async (req, res, next) => {
  const { error, profile } = await verifyAdminRequest(req.headers.authorization);
  if (error) return res.status(401).json({ success: false, message: error });
  req.adminProfile = profile;
  next();
};

const requireSuperAdmin = async (req, res, next) => {
  const { error, profile } = await verifyAdminRequest(req.headers.authorization);
  if (error) return res.status(401).json({ success: false, message: error });
  if (profile.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Requires admin role' });
  }
  req.adminProfile = profile;
  next();
};

// Fire-and-forget audit log — failures must never abort a successful primary operation
function fireLog(params) {
  supabaseAdmin.rpc('log_activity', params).then(({ error }) => {
    if (error) console.error('[log_activity]', error.message);
  });
}

function findPlayerName(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const directKeys = [
    'username',
    'user_name',
    'userName',
    'nickname',
    'nickName',
    'name',
    'roleName',
    'rolename',
    'characterName',
    'playerName',
  ];

  for (const key of directKeys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = findPlayerName(item);
        if (nested) return nested;
      }
    } else if (value && typeof value === 'object') {
      const nested = findPlayerName(value);
      if (nested) return nested;
    }
  }

  return null;
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'pixiekat-admin-proxy', timestamp: new Date().toISOString() });
});

// Force logout all sessions for a user
app.post('/api/admin/users/:id/force-logout', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.auth.admin.signOut(id, 'global');
    if (error) throw error;

    fireLog({
      p_user_id: id,
      p_action: 'session_revoked',
      p_description: 'All sessions revoked by admin',
      p_actor_id: req.adminProfile.id,
      p_metadata: { reason: 'admin_force_logout' },
    });

    res.json({ success: true, message: 'All sessions revoked' });
  } catch (err) {
    console.error('force-logout error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to revoke sessions' });
  }
});

// Disable 2FA for a user
app.post('/api/admin/users/:id/disable-2fa', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || String(reason).trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Reason is required (min 5 chars)' });
    }

    const { data: factors, error: listError } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: id });
    if (listError) throw listError;

    for (const factor of factors?.all ?? []) {
      const { error: delError } = await supabaseAdmin.auth.admin.mfa.deleteFactor({ userId: id, id: factor.id });
      if (delError) throw delError;
    }

    await supabaseAdmin
      .from('user_2fa_config')
      .update({
        is_enabled: false,
        disabled_at: new Date().toISOString(),
        disabled_by: req.adminProfile.id,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', id);

    fireLog({
      p_user_id: id,
      p_action: '2fa_disabled',
      p_description: reason,
      p_actor_id: req.adminProfile.id,
    });

    res.json({ success: true, message: '2FA disabled for user' });
  } catch (err) {
    console.error('disable-2fa error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to disable 2FA' });
  }
});

// Send password reset email
app.post('/api/admin/users/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(id);
    if (getUserError || !authUser?.user) {
      return res.status(404).json({ success: false, message: 'User not found in auth' });
    }

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(
      authUser.user.email,
      { redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/account/security/change-password` }
    );
    if (error) throw error;

    fireLog({
      p_user_id: id,
      p_action: 'password_reset_requested',
      p_description: 'Password reset email sent by admin',
      p_actor_id: req.adminProfile.id,
    });

    res.json({ success: true, message: 'Password reset email sent' });
  } catch (err) {
    console.error('reset-password error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to send reset email' });
  }
});

// Admin override email change (super admin only)
app.post('/api/admin/users/:id/change-email', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newEmail } = req.body;

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      return res.status(400).json({ success: false, message: 'Valid new email is required' });
    }

    const email = newEmail.trim().toLowerCase();
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, { email });
    if (authError) {
      if (authError.message.includes('already registered')) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }
      throw authError;
    }

    await supabaseAdmin.from('profiles').update({ email, updated_at: new Date().toISOString() }).eq('id', id);

    fireLog({
      p_user_id: id,
      p_action: 'email_changed',
      p_description: `Email changed to ${email} by admin`,
      p_actor_id: req.adminProfile.id,
      p_metadata: { new_email: email },
    });

    res.json({ success: true, message: 'Email updated' });
  } catch (err) {
    console.error('change-email error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to change email' });
  }
});

// Update user status with audit log
app.post('/api/admin/users/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const allowed = ['active', 'inactive', 'suspended', 'banned'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(', ')}` });
    }
    if (!reason || String(reason).trim().length < 3) {
      return res.status(400).json({ success: false, message: 'reason is required (min 3 chars)' });
    }

    const { data, error } = await supabaseAdmin.rpc('update_user_status', {
      p_user_id: id,
      p_new_status: status,
      p_reason: reason.trim(),
      p_actor_id: req.adminProfile.id,
    });
    if (error) throw error;

    if (status === 'banned' || status === 'suspended') {
      await supabaseAdmin.auth.admin.signOut(id, 'global');
    }

    res.json({ success: true, profile: data });
  } catch (err) {
    console.error('status update error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update status' });
  }
});

// Hard delete user (super admin only — removes from auth.users + cascade)
app.delete('/api/admin/users/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmation } = req.body;

    if (confirmation !== 'DELETE') {
      return res.status(400).json({
        success: false,
        message: 'Body must include { "confirmation": "DELETE" } to proceed',
      });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;

    res.json({ success: true, message: 'User permanently deleted' });
  } catch (err) {
    console.error('delete user error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete user' });
  }
});

// Wallet adjustment — atomic, via Postgres function
app.post('/api/admin/wallet/adjust', requireAdmin, async (req, res) => {
  try {
    const { userId, amount, type, reference } = req.body;

    if (!userId || typeof amount !== 'number' || !type || !reference) {
      return res.status(400).json({
        success: false,
        message: 'userId, amount (number), type, and reference are all required',
      });
    }

    const allowedTypes = ['credit', 'debit', 'refund'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `type must be one of: ${allowedTypes.join(', ')}` });
    }

    if (Math.abs(amount) > 1_000_000) {
      return res.status(400).json({ success: false, message: 'Amount exceeds maximum (1,000,000)' });
    }

    const adjustedAmount = type === 'debit' ? -Math.abs(amount) : Math.abs(amount);

    const { data, error } = await supabaseAdmin.rpc('adjust_wallet_balance', {
      p_user_id: userId,
      p_amount: adjustedAmount,
      p_type: type,
      p_reference: reference.trim(),
      p_actor_id: req.adminProfile.id,
    });

    if (error) {
      if (error.message.includes('Insufficient wallet balance')) {
        return res.status(422).json({ success: false, message: error.message, code: 'INSUFFICIENT_BALANCE' });
      }
      throw error;
    }

    res.json({ success: true, transaction: data });
  } catch (err) {
    console.error('wallet adjust error:', err);
    res.status(500).json({ success: false, message: err.message || 'Wallet adjustment failed' });
  }
});

// ── SmileCode API routes ──────────────────────────────────────────────────────

// Provider status — GET /api/smileone/status
app.get('/api/smileone/status', async (req, res) => {
  if (!smileOne.isConfigured()) {
    return res.json({
      configured: false,
      connected:  false,
      message: 'Missing SMILECODE_API_KEY or SMILECODE_SECRET in server .env',
    });
  }
  try {
    const data      = await smileOne.balance();
    const connected = data.result?.code === 100000;
    res.json({
      configured:  true,
      connected,
      usd_balance: data.result?.usd_balance ?? null,
      message:     connected ? 'Connected' : (data.error?.message ?? 'Unknown error'),
    });
  } catch (err) {
    res.json({ configured: true, connected: false, message: err.message });
  }
});

// All products on the account — GET /api/smileone/product-list
app.get('/api/smileone/product-list', async (req, res) => {
  try {
    const data = await smileOne.productList();
    res.json({ success: true, productList: data.result?.productList ?? [] });
  } catch (err) {
    console.error('[smileone/product-list]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// SKU list for a product — GET /api/smileone/sku-list?apiGame=mobilelegends
app.get('/api/smileone/sku-list', async (req, res) => {
  try {
    const { apiGame } = req.query;
    if (!apiGame) return res.status(400).json({ success: false, message: 'apiGame is required' });
    const data = await smileOne.skuList(apiGame);
    const rawSkus = data.result?.skuList ?? [];
    res.json({
      success:         true,
      skuList:         rawSkus.map(s => ({ ...s, description: s.description || s.code || s.sku })),
      serverList:      data.result?.serverList      ?? [],
      isMultiPurchase: data.result?.isMultiPurchase ?? true,
    });
  } catch (err) {
    console.error('[smileone/sku-list]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Validate user account — POST /api/smileone/validate
// Body: { apiGame, userAccount: { user_id, server_id? } }
app.post('/api/smileone/validate', async (req, res) => {
  try {
    const { apiGame, userAccount } = req.body;
    if (!apiGame || !userAccount) {
      return res.status(400).json({ success: false, message: 'apiGame and userAccount are required' });
    }
    const data = await smileOne.validate(apiGame, userAccount);
    res.json({ success: true, result: data.result });
  } catch (err) {
    console.error('[smileone/validate]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Place order — POST /api/smileone/send-order
// Body: { apiGame, items: [{ sku, qty, pid }], userAccount }
app.post('/api/smileone/send-order', async (req, res) => {
  try {
    const { apiGame, items, userAccount } = req.body;
    if (!apiGame || !items?.length || !userAccount) {
      return res.status(400).json({ success: false, message: 'apiGame, items, and userAccount are required' });
    }
    const data = await smileOne.sendOrder(apiGame, items, userAccount);
    res.json({ success: true, result: data.result });
  } catch (err) {
    console.error('[smileone/send-order]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Order detail — GET /api/smileone/order-detail?orderId=SC...
app.get('/api/smileone/order-detail', async (req, res) => {
  try {
    const { orderId } = req.query;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId is required' });
    const data = await smileOne.orderDetail(orderId);
    res.json({ success: true, result: data.result });
  } catch (err) {
    console.error('[smileone/order-detail]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Smilecoin (smile.one Smilecoin API) routes ──────────────────────────────
// All routes require admin JWT. Credentials stay server-side (SC_* env vars).

app.get('/api/smilecoin/health', requireAdmin, (_req, res) => {
  res.json({
    ok:         smileCoin.isConfigured(),
    configured: smileCoin.isConfigured(),
    testOrders: smileCoin.ALLOW_TEST_ORDER,
    time:       Date.now(),
  });
});

app.get('/api/smilecoin/products', requireAdmin, async (_req, res) => {
  try {
    const body = await smileCoin.callSmileCoin('product', { product: 'mobilelegends' });
    res.json({ ok: true, products: Array.isArray(body) ? body : [] });
  } catch (err) {
    console.error('[smilecoin/products]', err.message);
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.get('/api/smilecoin/productlist', requireAdmin, async (req, res) => {
  const product = String(req.query.product || '').trim();
  if (!product) return res.status(400).json({ ok: false, error: 'Missing ?product=' });
  try {
    const body = await smileCoin.callSmileCoin('productlist', { product });
    res.json({ ok: true, product, ...body });
  } catch (err) {
    console.error('[smilecoin/productlist]', err.message);
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.get('/api/smilecoin/servers', requireAdmin, async (req, res) => {
  const product = String(req.query.product || '').trim();
  if (!product) return res.status(400).json({ ok: false, error: 'Missing ?product=' });
  try {
    const body = await smileCoin.callSmileCoin('getserver', { product });
    res.json({ ok: true, product, ...body });
  } catch (err) {
    console.error('[smilecoin/servers]', err.message);
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.get('/api/smilecoin/points', requireAdmin, async (_req, res) => {
  try {
    const body = await smileCoin.callSmileCoin('querypoints', { product: 'mobilelegends' });
    res.json({ ok: true, ...body });
  } catch (err) {
    console.error('[smilecoin/points]', err.message);
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.post('/api/smilecoin/rolecheck', requireAdmin, async (req, res) => {
  const { userid, zoneid, product, productid } = req.body || {};
  if (!userid || !product || !productid) {
    return res.status(400).json({ ok: false, error: 'Missing userid, product, or productid' });
  }
  try {
    const body = await smileCoin.callSmileCoin('getrole', {
      userid,
      zoneid: zoneid || userid,
      product,
      productid,
    });
    res.json({ ok: body.status === 200, ...body });
  } catch (err) {
    console.error('[smilecoin/rolecheck]', err.message);
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.post('/api/smilecoin/order', requireAdmin, async (req, res) => {
  if (!smileCoin.ALLOW_TEST_ORDER) {
    return res.status(403).json({
      ok:     false,
      dryRun: true,
      error:  'Test orders disabled (SC_ALLOW_TEST_ORDER=false). Set to true in main/server/.env to enable.',
    });
  }
  const { userid, zoneid, product, productid } = req.body || {};
  if (!userid || !product || !productid) {
    return res.status(400).json({ ok: false, error: 'Missing userid, product, or productid' });
  }
  try {
    const body = await smileCoin.callSmileCoin('createorder', {
      userid,
      zoneid: zoneid || userid,
      product,
      productid,
    });
    res.json({ ok: body.status === 200, ...body });
  } catch (err) {
    console.error('[smilecoin/order]', err.message);
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.post('/api/smilecoin/order/dry-run', requireAdmin, (req, res) => {
  const { userid, zoneid, product, productid } = req.body || {};
  if (!userid || !product || !productid) {
    return res.status(400).json({ ok: false, error: 'Missing userid / product / productid' });
  }
  const payload = smileCoin.buildPayload({ userid, zoneid: zoneid || userid, product, productid });
  delete payload.sign; // never send the actual sign in dry-run
  res.json({ ok: true, dryRun: true, wouldSend: payload, testOrdersEnabled: smileCoin.ALLOW_TEST_ORDER });
});

// Cache: product code → first valid productid from SmileCoin productlist
// Avoids a productlist call on every verify request after the first.
const scProductIdCache = {};

async function resolveScProductId(product) {
  if (scProductIdCache[product]) return scProductIdCache[product];
  try {
    const list = await smileCoin.callSmileCoin('productlist', { product });
    const firstId = list?.data?.product?.[0]?.id;
    if (firstId) {
      scProductIdCache[product] = String(firstId);
      console.log(`[verify-player] cached productid ${firstId} for product="${product}"`);
    }
    return scProductIdCache[product] ?? null;
  } catch {
    return null;
  }
}

// Public player verification — POST /api/verify-player
// No admin auth required (used by customer-facing game page).
// Body: { user_id, zone_id?, api_game?, product?, product_id?, smile_coin_product? }
// Tries SmileCode validate first, falls back to SmileCoin getrole.
app.post('/api/verify-player', async (req, res) => {
  const { user_id, zone_id, api_game, product, product_id, smile_coin_product } = req.body || {};
  if (!user_id) {
    return res.status(400).json({ success: false, message: 'user_id is required' });
  }

  // Try SmileCode API first (newer JSON-RPC validate)
  if (smileOne.isConfigured() && api_game) {
    try {
      const userAccount = { user_id: String(user_id) };
      if (zone_id) userAccount.server_id = String(zone_id);
      const data = await smileOne.validate(api_game, userAccount);
      const result = data.result;
      if (result) {
        const name = findPlayerName(result);
        if (name) {
          return res.json({ success: true, username: name, source: 'smilecode' });
        }
      }
      // SmileCode returned no error but no username — fall through to SmileCoin
    } catch (err) {
      console.error('[verify-player] SmileCode failed:', err.message);
      // Fall through to SmileCoin
    }
  }

  // Fall back to SmileCoin getrole API (older form-based API)
  // Use smile_coin_product if the admin configured one; otherwise fall back to provider_game_code.
  const scProduct = smile_coin_product || product;
  console.log('[verify-player] SmileCoin attempt:', { user_id, zone_id, api_game, product, product_id, smile_coin_product, scProduct });
  if (smileCoin.isConfigured() && scProduct) {
    try {
      // Auto-resolve a valid productid — '1' is never valid; fetch real ID from productlist.
      // Always use the base provider_game_code (product) for productlist lookup;
      // smile_coin_product is only an override for the getrole product param itself.
      const resolvedProductId = product_id && product_id !== '1'
        ? String(product_id)
        : (await resolveScProductId(product || scProduct)) ?? String(product_id || '1');

      console.log('[verify-player] SmileCoin getrole params:', { user_id, zone_id: String(zone_id || user_id), product: scProduct, productid: resolvedProductId });

      const body = await smileCoin.callSmileCoin('getrole', {
        userid: String(user_id),
        zoneid: String(zone_id || user_id),
        product: scProduct,
        productid: resolvedProductId,
      });
      if (body.status === 200 || body.ok === true) {
        const name = findPlayerName(body.data ?? body);
        if (name) {
          return res.json({ success: true, username: name, source: 'smilecoin' });
        }
      }
      // Surface SmileCoin's error only if it's a real player-not-found case;
      // product-config errors are treated as verification unavailable.
      const errMsg = body.message || body.msg || '';
      const isConfigError = /product does not exist|invalid product|not found/i.test(errMsg);
      return res.json({
        success: false,
        message: isConfigError
          ? 'Player verification is unavailable for this game. You can still place your order.'
          : (errMsg || 'Player not found. Check your User ID and Zone ID.'),
      });
    } catch (err) {
      console.error('[verify-player] SmileCoin failed:', err.message);
      // callSmileCoin throws when response is non-JSON; extract the raw text from the error message
      const rawMatch = err.message.match(/non-JSON[^:]*:\s*(.+)$/s);
      const rawText  = rawMatch?.[1]?.trim() ?? err.message;
      const isConfigError = /product does not exist|invalid product/i.test(rawText);
      return res.json({
        success: false,
        message: isConfigError
          ? 'Player verification is unavailable for this game. You can still place your order.'
          : 'Could not reach verification server. You can still place your order.',
      });
    }
  }

  res.status(500).json({
    success: false,
    message: 'No verification provider configured. Set either SMILECODE_* or SC_* credentials in server/.env',
  });
});

app.listen(PORT, () => {
  console.log(`Pixie-Kat Admin Proxy running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
