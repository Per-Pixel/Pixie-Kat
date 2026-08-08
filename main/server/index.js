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
 *
 * Provider / Catalog:
 *   GET    /api/smileone/status                 SmileCode config check
 *   GET    /api/smileone/product-list           All products on account
 *   GET    /api/smileone/sku-list               SKUs for a game
 *   POST   /api/smileone/validate               Validate player account
 *   POST   /api/smileone/send-order             Place SmileCode top-up
 *   GET    /api/smileone/order-detail           SmileCode order status
 *   POST   /api/verify-player                  Public player ID verification
 *
 * Fulfillment:
 *   POST   /api/fulfill-order                  Auto-deliver wallet order via provider
 *
 * Storefront catalog (service_role — bypasses broken anon RLS helper grants):
 *   GET    /api/catalog/games                  Active games list
 *   GET    /api/catalog/games/:slug            Active game + fields + products
 *
 * Proxied RPCs (service_role only — functions no longer callable by anon/authenticated):
 *   POST   /api/place-order                    Place wallet or pending order
 *   POST   /api/admin/analytics                Get admin analytics dashboard data
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

function isLocalNetworkOrigin(origin) {
  if (!origin) return false;
  // Allow any origin on ports 5173-5175 from localhost or LAN IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  return /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):517[3-5]$/.test(origin);
}

app.use(cors({
  origin(origin, cb) {
    if (process.env.NODE_ENV === 'production') {
      if (origin && allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    }
    // Dev: allow localhost + any LAN IP
    if (!origin || allowedOrigins.includes(origin) || isLocalNetworkOrigin(origin)) return cb(null, true);
    cb(null, false);
  },
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Tighter per-endpoint limits on customer-facing, provider-touching routes
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification attempts. Please wait a minute.' },
});

const fulfillLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests. Please wait a minute.' },
});

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

// Public storefront catalog — service_role bypasses RLS.
// Needed while anon lacks EXECUTE on is_admin_or_support() (see migration 026).
app.get('/api/catalog/games', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('games')
      .select('id, slug, name, subtitle, image_url, banner_url, category, currency_label, is_featured, sort_order')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ ok: true, games: data ?? [] });
  } catch (err) {
    console.error('[catalog/games]', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to load games' });
  }
});

app.get('/api/catalog/games/:slug', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('games')
      .select('*, game_fields(*), products(*)')
      .eq('slug', req.params.slug)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ ok: false, error: 'Game not found' });

    const fields = (data.game_fields ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);

    const products = (data.products ?? [])
      .filter((p) => p.status === 'active')
      .sort((a, b) => a.sort_order - b.sort_order);

    const { game_fields: _fields, products: _products, ...game } = data;
    res.json({ ok: true, game, fields, products });
  } catch (err) {
    console.error('[catalog/games/:slug]', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to load game' });
  }
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

// Wallet adjustment — atomic, via Postgres function (super admin only)
app.post('/api/admin/wallet/adjust', requireSuperAdmin, async (req, res) => {
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
app.get('/api/smileone/status', requireAdmin, async (req, res) => {
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
app.get('/api/smileone/product-list', requireAdmin, async (req, res) => {
  try {
    const data = await smileOne.productList();
    res.json({ success: true, productList: data.result?.productList ?? [] });
  } catch (err) {
    console.error('[smileone/product-list]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// SKU list for a product — GET /api/smileone/sku-list?apiGame=mobilelegends
app.get('/api/smileone/sku-list', requireAdmin, async (req, res) => {
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
app.post('/api/smileone/validate', requireAdmin, async (req, res) => {
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
app.post('/api/smileone/send-order', requireAdmin, async (req, res) => {
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
app.get('/api/smileone/order-detail', requireAdmin, async (req, res) => {
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

app.post('/api/smilecoin/order', requireSuperAdmin, async (req, res) => {
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

// ── Mismatch audit ───────────────────────────────────────────────────────────
// GET /api/smilecoin/mismatches?limit=50
// Returns recent orders where the provider returned a different price than expected.
app.get('/api/smilecoin/mismatches', requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, product_id, product_name, total_amount, status, metadata, created_at')
      .not('metadata->provider_mismatch', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ ok: true, count: data?.length ?? 0, orders: data ?? [] });
  } catch (err) {
    console.error('[smilecoin/mismatches]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
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

// ── Fulfillment guards (pure, mirrored in tests/fulfill-order.price.test.js) ──

// Resolve the exact provider product id for an order. Never falls back to the
// lowest productlist SKU — returns null when unconfigured so the caller can fail
// the order instead of silently delivering a cheaper denomination than sold.
function resolveOrderProductId(product) {
  const id = String(
    product?.metadata?.secondary_provider_product_id ||
    product?.provider_product_id ||
    product?.sku || ''
  ).trim();
  return (!id || id === '1') ? null : id;
}

// Parse the merchant Smile Points balance from a querypoints response.
function extractPointsBalance(body) {
  if (!body) return NaN;
  const flat = body.smile_points ?? body.points ?? body.balance;
  const nested = body?.data?.smile_points ?? body?.data?.points ?? body?.data?.balance;
  const v = flat ?? nested;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

// Parse a single SKU's point cost from a productlist, matching by id.
function extractSkuPrice(skus, productid) {
  if (!Array.isArray(skus)) return NaN;
  const sku = skus.find(s => s && String(s.id) === String(productid));
  if (!sku) return NaN;
  const candidates = [sku.price, sku.point, sku.points, sku.smile_price, sku.sell_price, sku.amount];
  for (const c of candidates) {
    if (c == null) continue;
    const n = parseFloat(String(c));
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}

// Returns an error message when the merchant can't afford the SKU, else null.
// Fail-open (null) when balance can't be determined; fail-closed when the
// balance is zero or provably below the SKU cost.
function pointsDeficiency(balance, cost) {
  if (!Number.isFinite(balance)) return null;
  if (balance <= 0) {
    return `Insufficient Smile Points: balance is ${balance}. Top up the merchant balance and re-fulfill.`;
  }
  if (Number.isFinite(cost) && balance < cost) {
    return `Insufficient Smile Points: need ${cost}, have ${balance}. Top up the merchant balance and re-fulfill.`;
  }
  return null;
}

// Pre-flight: block fulfillment when the merchant Smile Points balance can't
// cover the SKU. Fail-open on provider query errors so a transient hiccup
// doesn't block all orders (createorder will still reject if truly short).
// Returns { balance, skuPrice } so the caller can reuse the productlist SKU
// price as an automatic expected-price fallback for mismatch detection.
async function preFlightPointsCheck(product, productid) {
  let balance = NaN;
  let cost = NaN;
  try {
    const ptsBody = await smileCoin.callSmileCoin('querypoints', { product });
    balance = extractPointsBalance(ptsBody);
    const listBody = await smileCoin.callSmileCoin('productlist', { product });
    const skus = listBody?.data?.product ?? listBody?.productList ?? listBody?.list ?? listBody?.skus ?? listBody?.product ?? [];
    cost = extractSkuPrice(skus, productid);
  } catch (err) {
    console.warn('[fulfill-order] Points pre-flight query failed; proceeding to createorder:', err.message);
    return { balance: NaN, skuPrice: NaN };
  }
  const deficiency = pointsDeficiency(balance, cost);
  if (deficiency) {
    console.warn(`[fulfill-order] ${deficiency}`);
    throw new Error(deficiency);
  }
  console.log(`[fulfill-order] Points pre-flight OK: balance ${balance}, SKU ${productid} cost ${Number.isFinite(cost) ? cost : 'unknown'}`);
  return { balance, skuPrice: cost };
}

// Public player verification — POST /api/verify-player
// No admin auth required (used by customer-facing game page).
// Body: { user_id, zone_id?, api_game?, product?, product_id?, smile_coin_product? }
// Tries SmileCode validate first, falls back to SmileCoin getrole.
app.post('/api/verify-player', verifyLimiter, async (req, res) => {
  const { user_id, zone_id, api_game, product, product_id, smile_coin_product } = req.body || {};
  if (!user_id) {
    return res.status(400).json({ success: false, message: 'user_id is required' });
  }

  // Use SmileCoin getrole if the game has smile_coin_product configured.
  // Only attempt SmileCode when there is no SmileCoin product (avoids IP-whitelist failures).
  const scProduct = smile_coin_product || product;
  const useSmileCoin = smileCoin.isConfigured() && scProduct;

  if (!useSmileCoin && smileOne.isConfigured() && api_game) {
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
    } catch (err) {
      console.error('[verify-player] SmileCode failed:', err.message);
    }
  }
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
      // product-config errors and transient network errors get a friendly fallback.
      const errMsg = body.message || body.msg || '';
      const isConfigError = /product does not exist|invalid product|not found/i.test(errMsg);
      const isNetworkError = /conex[aã]o|rede|network|timeout|tente novamente|try again|connection/i.test(errMsg);
      return res.json({
        success: false,
        message: isConfigError
          ? 'Player verification is unavailable for this game. You can still place your order.'
          : isNetworkError
          ? 'Could not reach verification server. You can still place your order.'
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

// ── Order placement (proxied RPC) ────────────────────────────────────────────
// POST /api/place-order
// Body: { product_id, product_name, total_amount, currency, metadata, payment_method? }
// Auth: authenticated user — identity verified via JWT
const placeOrderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many orders. Please wait a minute.' },
});

app.post('/api/place-order', placeOrderLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Authorization required' });
  }
  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }

  const { product_id, product_name, total_amount, currency, metadata, payment_method } = req.body || {};
  if (!product_id || !product_name || total_amount == null || !currency) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }

  try {
    if (payment_method && payment_method !== 'wallet') {
      const { data: orderId, error: rpcError } = await supabaseAdmin.rpc('place_pending_order', {
        p_user_id: user.id,
        p_product_id: product_id,
        p_product_name: product_name,
        p_total_amount: total_amount,
        p_currency: currency,
        p_payment_method: payment_method,
        p_metadata: metadata || {},
      });
      if (rpcError) throw rpcError;
      return res.json({ ok: true, orderId });
    }

    const { data: orderId, error: rpcError } = await supabaseAdmin.rpc('place_wallet_order', {
      p_user_id: user.id,
      p_product_id: product_id,
      p_product_name: product_name,
      p_total_amount: total_amount,
      p_currency: currency,
      p_metadata: metadata || {},
    });
    if (rpcError) throw rpcError;
    return res.json({ ok: true, orderId });
  } catch (err) {
    console.error('[place-order]', err.message);
    return res.status(400).json({ ok: false, error: err.message });
  }
});

// ── Admin analytics (proxied RPC) ────────────────────────────────────────────
// POST /api/admin/analytics
// Body: { start?, end?, bucket?, payment_method? }
// Auth: admin or support
app.post('/api/admin/analytics', requireAdmin, async (req, res) => {
  const { start, end, bucket, payment_method } = req.body || {};
  try {
    const { data, error } = await supabaseAdmin.rpc('get_admin_analytics', {
      p_start: start ?? null,
      p_end: end ?? new Date().toISOString(),
      p_bucket: bucket ?? 'day',
      p_payment_method: payment_method ?? null,
    });
    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('[admin/analytics]', err.message);
    return res.status(400).json({ success: false, message: err.message });
  }
});

// ── Auto-fulfillment ─────────────────────────────────────────────────────────
// POST /api/fulfill-order
// Body: { orderId }
// Auth: any authenticated user — must own the order
app.post('/api/fulfill-order', fulfillLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Authorization required' });
  }
  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }

  const { orderId } = req.body || {};
  if (!orderId) return res.status(400).json({ ok: false, error: 'orderId is required' });

  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, product_id, total_amount, currency, status, metadata')
      .eq('id', orderId)
      .single();

    if (orderError || !order) throw new Error('Order not found');
    if (order.user_id !== user.id) return res.status(403).json({ ok: false, error: 'Access denied' });
    if (order.status !== 'processing') {
      return res.json({ ok: true, already: true, status: order.status });
    }

    const accountFields = order.metadata?.account_fields ?? {};
    const userId = accountFields.user_id || accountFields.userid || accountFields.uid || accountFields.player_id || accountFields.account_id;
    const zoneId  = accountFields.zone_id  || accountFields.server_id || accountFields.zoneid || accountFields.server;
    if (!userId) throw new Error('No game account ID in order metadata');

    const gameId = order.metadata?.game_id;
    if (!gameId) throw new Error('No game_id in order metadata');

    const { data: game } = await supabaseAdmin
      .from('games')
      .select('id, provider, provider_game_code, metadata')
      .eq('id', gameId)
      .single();
    if (!game) throw new Error('Game not found');

    let product = null;
    const productId = order.product_id || order.metadata?.product_id;
    if (productId) {
      const { data } = await supabaseAdmin
        .from('products')
        .select('id, sku, provider_product_id, metadata')
        .eq('id', productId)
        .single();
      product = data;
    }

    let fulfillResult = null;

    const scProduct = game.metadata?.smile_coin_product;

    if (scProduct && smileCoin.isConfigured()) {
      // Fulfillment must use the exact provider product the customer paid for.
      // Never fall back to the first (lowest) SKU from the productlist — that
      // silently delivers a cheaper denomination than what was sold. If no valid
      // provider product id is configured, fail the order (auto-refund) so the
      // admin can fix the product config and the customer can re-order.
      const productid = resolveOrderProductId(product);
      if (!productid) {
        throw new Error(
          'No valid Provider Product ID for this product (set provider_product_id in admin GameEditor). ' +
          'Order refunded — fix the product config, then have the customer re-order.'
        );
      }

      // Pre-flight: block the order when the merchant Smile Points balance can't
      // cover this SKU (e.g. balance is 0 or below the SKU's point cost).
      // Also returns the live productlist SKU price for mismatch detection.
      const { skuPrice: preFlightSkuPrice } = await preFlightPointsCheck(scProduct, productid);

      const createParams = {
        userid:    String(userId),
        zoneid:    String(zoneId || userId),
        product:   scProduct,
        productid,
      };
      console.log('[fulfill-order] createorder params:', JSON.stringify(createParams));

      const body = await smileCoin.callSmileCoin('createorder', createParams);
      console.log('[fulfill-order] createorder response:', JSON.stringify(body).slice(0, 500));

      // Accept both numeric and string status, and ok:true
      const statusOk = Number(body.status) === 200 || body.ok === true;
      if (!statusOk) {
        throw new Error(body.message || body.msg || `SmileCoin order failed (status ${body.status})`);
      }
      fulfillResult = body;
    } else if (game.provider === 'smile_one' && smileOne.isConfigured() && game.provider_game_code) {
      const sku = product?.sku;
      const pid = product?.provider_product_id;
      if (!sku && !pid) throw new Error('No SKU or provider_product_id configured for this product');
      const userAccount = { user_id: String(userId) };
      if (zoneId) userAccount.server_id = String(zoneId);
      const data = await smileOne.sendOrder(
        game.provider_game_code,
        [{ sku: sku || pid, qty: 1, pid: pid || sku }],
        userAccount
      );
      fulfillResult = data.result;
    } else {
      // No auto-fulfillment provider configured — order stays processing for manual fulfillment
      console.log(`[fulfill-order] No auto-fulfill provider for game ${gameId} (provider=${game.provider}, smile_coin_product=${scProduct || 'none'}). Order ${orderId} stays processing.`);
      return res.json({ ok: false, provisioned: false, error: 'No auto-fulfillment provider configured for this game. Order will be fulfilled manually.' });
    }

    // ── Provider price mismatch detection ──
    // Compare the provider-returned price against the expected provider price
    // stored in product.metadata.expected_provider_price. If the provider
    // fulfilled a different product (e.g. Elite Bundle instead of Weekly Pass),
    // the price will differ — auto-refund the proportional difference and flag
    // it for admin review.
    function normalizeProviderPrice(raw) {
      if (raw == null) return null;
      const str = String(raw).trim().toUpperCase();
      // Strip common currency prefixes/symbols and whitespace, then parse
      const cleaned = str
        .replace(/^(BRL|USD|EUR|PHP|MYR|IDR|PKR|INR|PKS)\s*/i, '')
        .replace(/[A-Za-z$₹€£¥]/g, '')
        .replace(/\s+/g, '')
        .replace(',', '.');
      if (!cleaned) return null;
      const n = Number(cleaned);
      return Number.isFinite(n) && n >= 0 ? n : null;
    }

    function extractReturnedPrice(result) {
      if (!result || typeof result !== 'object') return null;
      const candidates = [
        result.price,
        result?.data?.price,
        result.product_price,
        result.amount,
        result.total_amount,
      ];
      for (const candidate of candidates) {
        const price = normalizeProviderPrice(candidate);
        if (price != null) return price;
      }
      console.log('[fulfill-order] Could not extract provider price. Candidates:', JSON.stringify(candidates));
      return null;
    }

    let mismatch = null;
    let refundAmount = 0;
    const returnedPrice = extractReturnedPrice(fulfillResult);
    // Expected price fallback chain:
    //   1. metadata.expected_provider_price (manually set in admin — most reliable)
    //   2. preFlightSkuPrice (live from productlist — auto-detected, same currency
    //      as createorder since both go through the same SC_COUNTRY endpoint)
    const expectedPrice = product?.metadata?.expected_provider_price != null
      ? Number(product.metadata.expected_provider_price)
      : Number.isFinite(preFlightSkuPrice) ? preFlightSkuPrice : null;

    if (returnedPrice != null) {
      if (expectedPrice == null) {
        // Provider reported a price but we have nothing to compare it with.
        // Flag the order so admins can backfill the expected price.
        mismatch = {
          expected_provider_price: null,
          actual_provider_price: returnedPrice,
          product_name: product?.name || order.metadata?.product_name,
          provider_order_id: fulfillResult?.order_id,
          refund_amount: 0,
          refund_currency: order.currency || 'PKS',
          refund_status: 'skipped_no_expected_price',
        };
        console.warn(`[fulfill-order] No expected price for product ${product?.id || 'unknown'} (order ${orderId}). Provider reported ${returnedPrice}. Flagged for admin review.`);
      } else if (returnedPrice !== expectedPrice) {
        // Calculate proportional refund: if provider delivered a cheaper product,
        // refund the fraction of the order amount that wasn't delivered.
        // e.g. expected 76 BRL, got 39 BRL → refund (1 - 39/76) * 155 PKS ≈ 75.46 PKS
        if (returnedPrice < expectedPrice) {
          const ratio = 1 - (returnedPrice / expectedPrice);
          refundAmount = Math.round(Number(order.total_amount) * ratio * 100) / 100;
        }

        const expectedSource = product?.metadata?.expected_provider_price != null
          ? 'metadata.expected_provider_price'
          : 'productlist (auto-detected)';
        mismatch = {
          expected_provider_price: expectedPrice,
          actual_provider_price: returnedPrice,
          product_name: product?.name || order.metadata?.product_name,
          provider_order_id: fulfillResult?.order_id,
          refund_amount: refundAmount,
          refund_currency: order.currency || 'PKS',
        };
        console.warn(`[fulfill-order] PRICE MISMATCH on order ${orderId}: expected provider price ${expectedPrice} (${expectedSource}), got ${returnedPrice}. Refunding ${refundAmount} to wallet.`);

        // Auto-refund the difference to the user's wallet
        if (refundAmount > 0) {
          try {
            await supabaseAdmin.rpc('adjust_wallet_balance', {
              p_user_id:   order.user_id,
              p_amount:    refundAmount,
              p_type:      'refund',
              p_reference: `Provider mismatch refund for order ${orderId} — expected ${expectedPrice}, got ${returnedPrice}`,
              p_order_id:  orderId,
            });
            mismatch.refund_status = 'completed';
            console.log(`[fulfill-order] Mismatch refund of ${refundAmount} completed for order ${orderId}`);
          } catch (refundErr) {
            mismatch.refund_status = 'failed';
            mismatch.refund_error = refundErr.message;
            console.error(`[fulfill-order] Mismatch refund failed for order ${orderId}:`, refundErr.message);
          }
        } else {
          mismatch.refund_status = 'completed';
          mismatch.refund_amount = 0;
        }
      }
    }

    const completedMeta = {
      ...order.metadata,
      fulfill_result: fulfillResult,
      fulfilled_at: new Date().toISOString(),
      ...(mismatch ? { provider_mismatch: mismatch } : {}),
    };

    await supabaseAdmin
      .from('orders')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
        metadata: completedMeta,
      })
      .eq('id', orderId);

    console.log(`[fulfill-order] Order ${orderId} completed via ${game.provider}${mismatch ? ' (MISMATCH — refund ' + refundAmount + ')' : ''}`);
    res.json({ ok: true, orderId, result: fulfillResult, ...(mismatch ? { mismatch } : {}) });

  } catch (err) {
    console.error('[fulfill-order]', err.message);

    // Refund wallet + mark order failed atomically via the dedicated RPC.
    // Falls back to adjust_wallet_balance if the migration isn't applied yet.
    try {
      const errorMeta = { fulfill_error: err.message, failed_at: new Date().toISOString() };
      const { error: refundErr } = await supabaseAdmin.rpc('refund_wallet_order', {
        p_order_id:       orderId,
        p_error_metadata: errorMeta,
      });

      if (refundErr) {
        // Migration not yet applied — fall back to individual operations
        console.warn('[fulfill-order] refund_wallet_order unavailable, using fallback:', refundErr.message);

        const { data: o } = await supabaseAdmin
          .from('orders')
          .select('user_id, total_amount, payment_method, status')
          .eq('id', orderId)
          .single();

        if (o && o.payment_method === 'wallet' && o.status === 'processing') {
          // Credit wallet back
          await supabaseAdmin.rpc('adjust_wallet_balance', {
            p_user_id:   o.user_id,
            p_amount:    o.total_amount,
            p_type:      'refund',
            p_reference: 'Refund for failed order ' + orderId,
            p_order_id:  orderId,
          });
        }

        // Mark order failed and merge error info into metadata
        const { data: cur } = await supabaseAdmin.from('orders').select('metadata').eq('id', orderId).single();
        await supabaseAdmin.from('orders').update({
          status:     'failed',
          updated_at: new Date().toISOString(),
          metadata:   { ...(cur?.metadata ?? {}), ...errorMeta },
        }).eq('id', orderId).eq('status', 'processing');

        console.log(`[fulfill-order] Fallback refund completed for order ${orderId}`);
      } else {
        console.log(`[fulfill-order] Wallet refunded for order ${orderId}`);
      }
    } catch (refundEx) {
      console.error('[fulfill-order] refund exception:', refundEx.message);
    }
    res.status(500).json({ ok: false, error: 'Delivery failed. Your wallet has been refunded.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Pixie-Kat Admin Proxy running on http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
