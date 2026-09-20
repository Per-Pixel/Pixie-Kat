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
 * Payments:
 *   POST   /api/place-order                    Place wallet, Razorpay, or Aluu order
 *   POST   /api/cart-checkout                  Place a multi-item cart (wallet / Razorpay / Aluu group payment)
 *   POST   /api/razorpay/verify-payment        Verify a Checkout payment signature
 *   POST   /api/razorpay/verify-cart-payment   Verify a cart group payment signature
 *   POST   /api/webhooks/razorpay              Receive signed payment webhooks
 *   POST   /api/aluu/check-payment             Poll Aluu order status after redirect
 *   POST   /api/aluu/check-cart-payment        Poll an Aluu cart group payment
 *   POST   /api/webhooks/aluu                  Receive signed Aluu payment webhooks
 *
 * Proxied RPCs (service_role only — functions no longer callable by anon/authenticated):
 *   POST   /api/admin/analytics                Get admin analytics dashboard data
 */

import process from 'node:process';
import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from './config.js';
import { supabaseAdmin, verifyAdminRequest, verifyUserRequest, isSuperAdmin } from './supabase-admin.js';
import { validateEmail } from './utils/validation.js';
import * as smileOne from './smileone.js';
import * as smileCoin from './smilecoin.js';
import * as razorpay from './razorpay.js';
import * as aluu from './aluu.js';

const app = express();
const PORT = config.port;

app.use(helmet());
app.use(express.json({
  limit: '64kb',
  verify(req, _res, buffer) {
    if (req.originalUrl.startsWith('/api/webhooks/razorpay') || req.originalUrl.startsWith('/api/webhooks/aluu')) req.rawBody = Buffer.from(buffer);
  },
}));

const allowedOrigins = config.isProduction
  ? config.corsOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

function isLocalNetworkOrigin(origin) {
  if (!origin) return false;
  // Allow any origin on ports 5173-5175 from localhost or LAN IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  return /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):517[3-5]$/.test(origin);
}

app.use(cors({
  origin(origin, cb) {
    if (config.isProduction) {
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

// Auth middleware — verifies Supabase JWT and checks active roles.
const requireUser = async (req, res, next) => {
  const { error, user, profile } = await verifyUserRequest(req.headers.authorization);
  if (error) return res.status(401).json({ success: false, message: error });
  req.user = user;
  req.profile = profile;
  next();
};

const requireAdmin = async (req, res, next) => {
  const { error, profile } = await verifyAdminRequest(req.headers.authorization);
  if (error) {
    const status = error.startsWith('Access denied') ? 403 : 401;
    return res.status(status).json({ success: false, message: error });
  }
  if (profile.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Requires admin role' });
  }
  req.adminProfile = profile;
  next();
};

const requireSuperAdmin = requireAdmin;

// Fire-and-forget audit log — failures must never abort a successful primary operation
function fireLog(params) {
  supabaseAdmin.rpc('log_activity', params).then(({ error }) => {
    if (error) console.error('[log_activity]', error.message);
  });
}

function findPlayerName(payload) {
  if (!payload) return null;
  if (typeof payload === 'string' || typeof payload === 'number') {
    const str = String(payload).trim();
    if (str) return str;
  }
  if (typeof payload !== 'object') return null;

  const directKeys = [
    'username',
    'user_name',
    'userName',
    'nickname',
    'nickName',
    'name',
    'roleName',
    'rolename',
    'role_name',
    'characterName',
    'character_name',
    'playerName',
    'player_name',
    'role',
    'player',
  ];

  for (const key of directKeys) {
    const value = payload[key];
    if (value != null && (typeof value === 'string' || typeof value === 'number')) {
      const str = String(value).trim();
      if (str) return str;
    }
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHECKOUT_PAYMENT_METHODS = new Set(['binance', 'mobikwik', 'paytm', 'upi']);
const MAX_CHECKOUT_FIELD_LENGTH = 256;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getClientIp(req) {
  return (req.socket.remoteAddress || '').replace(/^::ffff:/, '').slice(0, 45) || null;
}

function getDeviceType(userAgent) {
  const value = userAgent.toLowerCase();
  if (/ipad|tablet|kindle|playbook|silk/.test(value)) return 'tablet';
  if (/mobi|iphone|android|phone/.test(value)) return 'mobile';
  return 'desktop';
}

function getBrowser(userAgent) {
  if (/edg\//i.test(userAgent)) return 'Microsoft Edge';
  if (/opr\//i.test(userAgent)) return 'Opera';
  if (/chrome|crios/i.test(userAgent) && !/edg\//i.test(userAgent)) return 'Chrome';
  if (/firefox|fxios/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent) && !/chrome|crios|android/i.test(userAgent)) return 'Safari';
  return 'Unknown browser';
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

app.post('/api/auth/login-session', requireUser, async (req, res) => {
  try {
    const userAgent = String(req.get('user-agent') || '').slice(0, 500);
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from('user_login_history').insert({
      user_id: req.user.id,
      ip_address: getClientIp(req),
      user_agent: userAgent || null,
      device_type: getDeviceType(userAgent),
      browser: getBrowser(userAgent),
      success: true,
      used_2fa: false,
      created_at: now,
    });
    if (error) throw error;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ last_login_at: now, updated_at: now })
      .eq('id', req.user.id);
    if (profileError) console.error('[login-session] profile update failed:', profileError.message);

    res.status(204).end();
  } catch (err) {
    console.error('login-session error:', err);
    res.status(500).json({ success: false, message: 'Failed to record login session' });
  }
});

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/orders', checkoutLimiter);

app.post('/api/orders', requireUser, async (req, res) => {
  try {
    const { productId, paymentMethod, accountFields, contact } = req.body ?? {};
    const idempotencyKey = String(req.get('Idempotency-Key') || '').trim();

    if (!UUID_PATTERN.test(String(productId || ''))) {
      return res.status(400).json({ success: false, message: 'A valid productId is required' });
    }
    if (!CHECKOUT_PAYMENT_METHODS.has(String(paymentMethod || '').trim().toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Unsupported payment method' });
    }
    if (!isPlainObject(accountFields) || !isPlainObject(contact)) {
      return res.status(400).json({ success: false, message: 'Account fields and contact details are required' });
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(idempotencyKey)) {
      return res.status(400).json({ success: false, message: 'A valid Idempotency-Key header is required' });
    }

    const { data: existingOrder, error: existingError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, product_id, product_name, quantity, total_amount, currency, status, payment_method, payment_id, metadata, created_at, updated_at')
      .eq('user_id', req.user.id)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingOrder) {
      return res.status(200).json({ success: true, order: existingOrder, duplicate: true });
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, price, currency, game_id, status, stock')
      .eq('id', productId)
      .maybeSingle();
    if (productError) throw productError;
    if (!product || product.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Product is unavailable' });
    }
    if (product.stock !== null && Number(product.stock) < 1) {
      return res.status(409).json({ success: false, message: 'Product is out of stock' });
    }

    const { data: game, error: gameError } = await supabaseAdmin
      .from('games')
      .select('id, slug, name, status')
      .eq('id', product.game_id)
      .maybeSingle();
    if (gameError) throw gameError;
    if (!game || game.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Game is unavailable' });
    }

    const { data: fields, error: fieldsError } = await supabaseAdmin
      .from('game_fields')
      .select('field_key, label, is_required, validation_regex')
      .eq('game_id', game.id)
      .order('sort_order', { ascending: true });
    if (fieldsError) throw fieldsError;

    const fieldMap = new Map((fields ?? []).map((field) => [field.field_key, field]));
    const sanitizedFields = Object.create(null);
    for (const [key, value] of Object.entries(accountFields)) {
      const field = fieldMap.get(key);
      if (!field || typeof value !== 'string' || value.length > MAX_CHECKOUT_FIELD_LENGTH) {
        return res.status(400).json({ success: false, message: 'Invalid account details' });
      }
      const normalizedValue = value.trim();
      if (field.validation_regex && normalizedValue) {
        if (field.validation_regex.length > MAX_CHECKOUT_FIELD_LENGTH) {
          return res.status(500).json({ success: false, message: 'Game field validation is unavailable' });
        }
        let matches;
        try {
          matches = new RegExp(field.validation_regex).test(normalizedValue);
        } catch {
          return res.status(500).json({ success: false, message: 'Game field validation is unavailable' });
        }
        if (!matches) {
          return res.status(400).json({ success: false, message: `Invalid ${field.label}` });
        }
      }
      sanitizedFields[key] = normalizedValue;
    }
    for (const field of fields ?? []) {
      if (field.is_required && !String(sanitizedFields[field.field_key] || '').trim()) {
        return res.status(400).json({ success: false, message: `${field.label} is required` });
      }
    }

    const email = typeof contact.email === 'string' ? contact.email.trim().toLowerCase() : '';
    const whatsapp = typeof contact.whatsapp === 'string' ? contact.whatsapp.trim() : '';
    if (!validateEmail(email) || email.length > 254 || !/^\+?[0-9][0-9\s().-]{6,31}$/.test(whatsapp)) {
      return res.status(400).json({ success: false, message: 'Valid contact details are required' });
    }

    const price = Number(product.price);
    if (!Number.isFinite(price) || price < 0) {
      return res.status(500).json({ success: false, message: 'Product pricing is unavailable' });
    }

    const orderPayload = {
      user_id: req.user.id,
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      total_amount: price,
      currency: product.currency,
      status: 'pending',
      payment_method: String(paymentMethod).trim().toLowerCase(),
      idempotency_key: idempotencyKey,
      metadata: {
        game_id: game.id,
        game_slug: game.slug,
        game_name: game.name,
        account_fields: sanitizedFields,
        contact: { email, whatsapp },
      },
    };

    const { data: order, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert(orderPayload)
      .select('id, user_id, product_id, product_name, quantity, total_amount, currency, status, payment_method, payment_id, metadata, created_at, updated_at')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: duplicateOrder, error: duplicateError } = await supabaseAdmin
          .from('orders')
          .select('id, user_id, product_id, product_name, quantity, total_amount, currency, status, payment_method, payment_id, metadata, created_at, updated_at')
          .eq('user_id', req.user.id)
          .eq('idempotency_key', idempotencyKey)
          .single();
        if (duplicateError) throw duplicateError;
        return res.status(200).json({ success: true, order: duplicateOrder, duplicate: true });
      }
      throw insertError;
    }

    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error('checkout order error:', err);
    res.status(500).json({ success: false, message: 'Could not create order' });
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

    if (!config.frontendUrl) {
      return res.status(500).json({ success: false, message: 'FRONTEND_URL is not configured' });
    }
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(
      authUser.user.email,
      { redirectTo: `${config.frontendUrl}/account/security/change-password` }
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
    const { status, reason } = req.body ?? {};

    const allowed = ['active', 'inactive', 'suspended', 'banned'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(', ')}` });
    }
    if (!reason || String(reason).trim().length < 3 || String(reason).trim().length > 500) {
      return res.status(400).json({ success: false, message: 'reason is required (3-500 chars)' });
    }
    if (!UUID_PATTERN.test(id)) {
      return res.status(400).json({ success: false, message: 'A valid user id is required' });
    }
    if (id === req.adminProfile.id) {
      return res.status(400).json({ success: false, message: 'Admins cannot change their own account status' });
    }

    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, status')
      .eq('id', id)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!targetProfile) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }
    if (targetProfile.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin accounts require separate elevated approval' });
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
    const { userId, amount, type, reference } = req.body ?? {};

    if (!UUID_PATTERN.test(String(userId || '')) || typeof amount !== 'number' || !Number.isFinite(amount) || !type || typeof reference !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'userId, amount (number), type, and reference are all required',
      });
    }

    const allowedTypes = ['credit', 'debit', 'refund'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `type must be one of: ${allowedTypes.join(', ')}` });
    }

    if (amount <= 0 || amount > 1_000_000 || reference.trim().length === 0 || reference.trim().length > 200) {
      return res.status(400).json({ success: false, message: 'Amount or reference is invalid' });
    }

    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!targetProfile) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }
    if (targetProfile.role === 'admin' && !isSuperAdmin(req.adminProfile)) {
      return res.status(403).json({ success: false, message: 'Admin wallet balances require separate approval' });
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

// Raw provider order placement is intentionally disabled. Customer checkout must
// create a pending local order and wait for verified payment before fulfillment.
app.post('/api/smileone/send-order', requireAdmin, (_req, res) => {
  res.status(410).json({
    success: false,
    message: 'Raw provider order placement is disabled; use the verified checkout flow',
  });
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
    res.json({ ok: Number(body.status) === 200, ...body });
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
    res.json({ ok: Number(body.status) === 200, ...body });
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
    const validMismatches = (data || []).filter(o => {
      const mm = o.metadata?.provider_mismatch;
      if (!mm) return false;
      if (mm.refund_status === 'skipped_no_expected_price') return false;
      const refundAmt = Number(mm.refund_amount || 0);
      const expected = Number(mm.expected_provider_price);
      const actual = Number(mm.actual_provider_price);
      if (refundAmt === 0 && Number.isFinite(actual) && Number.isFinite(expected) && actual >= expected) {
        return false;
      }
      return true;
    });
    res.json({ ok: true, count: validMismatches.length, orders: validMismatches });
  } catch (err) {
    console.error('[smilecoin/mismatches]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/smilecoin/mismatches/cleanup
// Cleans up stale false provider_mismatch entries (refund_amount: 0) from orders metadata.
app.post('/api/smilecoin/mismatches/cleanup', requireAdmin, async (req, res) => {
  try {
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('id, metadata')
      .not('metadata->provider_mismatch', 'is', null);

    if (error) throw error;

    let cleaned = 0;
    for (const order of (orders || [])) {
      const mm = order.metadata?.provider_mismatch;
      if (!mm) continue;
      const refundAmt = Number(mm.refund_amount || 0);
      const expected = Number(mm.expected_provider_price);
      const actual = Number(mm.actual_provider_price);
      const isStale = refundAmt === 0 || mm.refund_status === 'skipped_no_expected_price' || mm.refund_amount == null || (Number.isFinite(actual) && Number.isFinite(expected) && actual >= expected);
      if (isStale) {
        const newMeta = { ...order.metadata };
        delete newMeta.provider_mismatch;
        const { error: updateErr } = await supabaseAdmin
          .from('orders')
          .update({ metadata: newMeta })
          .eq('id', order.id);
        if (!updateErr) cleaned++;
      }
    }

    res.json({ ok: true, cleaned, total_scanned: orders?.length ?? 0 });
  } catch (err) {
    console.error('[smilecoin/mismatches/cleanup]', err.message);
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
    const skus = list?.data?.product;
    if (!Array.isArray(skus) || skus.length === 0) return null;

    // Bundle/subscription SKUs (e.g. "Weekly Elite Bundle", "Monthly Epic Bundle",
    // "Passe Semanal", "Passagem do crepúsculo") fail getrole with status 20007.
    // Prefer a standard diamond SKU for role verification — the specific product
    // doesn't matter, we just need any valid one to check the player exists.
    const bundlePattern = /bundle|pass[ae]|passe|subscription|weekly|monthly|crepúsculo/i;
    const standardSku = skus.find(s => s?.spu && !bundlePattern.test(s.spu));
    const picked = standardSku || skus[0];
    const pickedId = String(picked.id);

    scProductIdCache[product] = pickedId;
    console.log(`[verify-player] cached productid ${pickedId} (${picked.spu}) for product="${product}"`);
    return pickedId;
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

// Parse a single SKU's price from a productlist, matching by id.
// NOTE: the Smilecoin productlist SKU `price`/`cost_price` fields are in fiat
// (BRL on the /br/ endpoint), NOT Smile Points — the productlist has no Smile
// Points field. createorder, by contrast, returns `price` in Smile Points. So
// this value must never be compared against a createorder price.
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

// Extract points-denominated price from productlist SKU if explicitly provided
// by the provider API (e.g. `smile_points`, `points`, `point`, `smile_price`).
// Fiat fields (`price`, `cost_price`, `sell_price`, `amount`) are in BRL/local currency
// and are not points.
function extractSkuPoints(skus, productid) {
  if (!Array.isArray(skus)) return NaN;
  const sku = skus.find(s => s && String(s.id) === String(productid));
  if (!sku) return NaN;
  const candidates = [sku.smile_points, sku.smile_point, sku.point, sku.points, sku.smile_price];
  for (const c of candidates) {
    if (c == null) continue;
    const n = parseFloat(String(c));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return NaN;
}

// Resolve the Smile Points cost for a product and SKU.
// Order of precedence:
// 1. product.metadata.expected_provider_price (Smile Points configured in admin)
// 2. Points field from provider productlist SKU (extractSkuPoints)
// 3. NaN if no Smile Points cost source is available (fiat price is never compared to points).
function resolvePointsCost(product, skus, productid) {
  if (product?.metadata?.expected_provider_price != null) {
    const n = Number(product.metadata.expected_provider_price);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const skuPoints = extractSkuPoints(skus, productid);
  if (Number.isFinite(skuPoints) && skuPoints > 0) return skuPoints;
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
// Uses resolvePointsCost so balance (Smile Points) is compared strictly against
// Smile Points cost (from product.metadata or provider points fields).
// When cost is unknown (NaN), pointsDeficiency only enforces balance > 0.
async function preFlightPointsCheck(productCode, productid, product = null) {
  let balance = NaN;
  let pointsCost = NaN;
  try {
    const ptsBody = await smileCoin.callSmileCoin('querypoints', { product: productCode });
    balance = extractPointsBalance(ptsBody);
    const listBody = await smileCoin.callSmileCoin('productlist', { product: productCode });
    const skus = listBody?.data?.product ?? listBody?.productList ?? listBody?.list ?? listBody?.skus ?? listBody?.product ?? [];
    pointsCost = resolvePointsCost(product, skus, productid);
  } catch (err) {
    console.warn('[fulfill-order] Points pre-flight query failed; proceeding to createorder:', err.message);
    return { balance: NaN, pointsCost: NaN };
  }
  const deficiency = pointsDeficiency(balance, pointsCost);
  if (deficiency) {
    console.warn(`[fulfill-order] ${deficiency}`);
    throw new Error(deficiency);
  }
  console.log(`[fulfill-order] Points pre-flight OK: balance ${balance}, SKU ${productid} cost ${Number.isFinite(pointsCost) ? pointsCost : 'unknown'}`);
  return { balance, pointsCost };
}

// Fetch merchant balance + productlist once per provider product.
// Both provider calls depend only on `product`, never on the SKU, so batch
// pre-check caches per product instead of per (product, SKU) — a cart holding
// several SKUs of one game was costing 2 provider round-trips per SKU and
// blowing the API Gateway 29s integration ceiling.
async function fetchProviderPointsSnapshot(product) {
  const ptsBody = await smileCoin.callSmileCoin('querypoints', { product });
  const balance = extractPointsBalance(ptsBody);
  const listBody = await smileCoin.callSmileCoin('productlist', { product });
  const skus = listBody?.data?.product ?? listBody?.productList ?? listBody?.list ?? listBody?.skus ?? listBody?.product ?? [];
  return { balance, skus };
}

// Classify a failed getrole response into a customer-safe message.
// Provider text is never echoed verbatim: Smile One returns order-oriented
// copy ("the recharge has failed") for lookup failures, which wrongly implies
// the customer was charged. Pure, mirrored in tests/verify-player.test.js.
function classifyVerifyFailure(body, hasZoneId = false) {
  const errMsg = String(body?.message ?? body?.msg ?? '');
  const status = Number(body?.status);

  const isPlayerNotFound = /role|user.?id|zone.?id|does not exist|not exist|invalid (?:user|role|zone)|player not found/i.test(errMsg);
  const isConfigError = status === 20007 || /product does not exist|invalid product/i.test(errMsg);

  if (isConfigError) {
    return 'Player verification is unavailable for this game. You can still place your order.';
  }
  if (isPlayerNotFound) {
    return `Player not found. Check your User ID${hasZoneId ? ' and Zone ID.' : '.'}`;
  }
  return 'Could not verify this account right now. You can still place your order.';
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
        : await resolveScProductId(product || scProduct);

      // productid '1' is never valid — calling getrole with it always fails and
      // Smile One answers with misleading "recharge failed" copy. Bail out with a
      // friendly message instead of making a doomed request.
      if (!resolvedProductId || resolvedProductId === '1') {
        console.warn('[verify-player] no valid productid resolved for product=%s (productlist lookup failed or empty)', product || scProduct);
        return res.json({
          success: false,
          message: 'Player verification is unavailable for this game. You can still place your order.',
        });
      }

      console.log('[verify-player] SmileCoin getrole params:', { user_id, zone_id: String(zone_id || user_id), product: scProduct, productid: resolvedProductId });

      const body = await smileCoin.callSmileCoin('getrole', {
        userid: String(user_id),
        zoneid: String(zone_id || user_id),
        product: scProduct,
        productid: resolvedProductId,
      });
      if (Number(body.status) === 200 || body.ok === true) {
        const name = findPlayerName(body) || (body.data ? findPlayerName(body.data) : null);
        if (name) {
          return res.json({ success: true, username: name, source: 'smilecoin' });
        }
      }
      // Never echo the provider's copy — log it for diagnosis, return safe text.
      console.warn('[verify-player] getrole rejected:', {
        status: body?.status,
        message: body?.message ?? body?.msg,
        product: scProduct,
        productid: resolvedProductId,
      });
      return res.json({
        success: false,
        message: classifyVerifyFailure(body, Boolean(zone_id)),
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

// ── Batch order pre-flight verification ───────────────────────────────────────
// POST /api/batch-validate
// Body: { items: [{ product_id, quantity }] }
// Auth: authenticated user — identity verified via JWT
// Checks:
//   1. Customer wallet balance >= cart total
//   2. For SmileCoin products, merchant Smile Points can cover each SKU
//   3. Each product has a valid provider product id
// Returns per-item and aggregate can_proceed without exposing merchant costs.
const batchValidateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many verification attempts. Please wait a minute.' },
});

app.post('/api/batch-validate', batchValidateLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Authorization required' });
  }
  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }

  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, error: 'items array is required' });
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();
    const wallet = Number(profile?.wallet_balance ?? 0);

    const validatedItems = [];
    const pointsCache = new Map();
    let cartTotal = 0;

    for (const it of items) {
      const { product_id, quantity = 1 } = it;
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('id, name, price, currency, sku, provider_product_id, game_id, metadata')
        .eq('id', product_id)
        .single();

      if (!product) {
        validatedItems.push({
          product_id,
          product_name: null,
          quantity: Math.max(1, Number(quantity)),
          line_total: 0,
          currency: 'PKS',
          points_ok: false,
          expected_provider_price: null,
          error: 'Product not found',
        });
        continue;
      }

      const { data: game } = await supabaseAdmin
        .from('games')
        .select('id, provider, provider_game_code, metadata, status')
        .eq('id', product.game_id)
        .single();

      const lineTotal = Number(product.price ?? 0) * Math.max(1, Number(quantity));
      cartTotal += lineTotal;

      let pointsOk = null;
      let expectedProviderPrice = null;
      let error = null;
      const scProduct = game?.metadata?.smile_coin_product;

      if (scProduct && smileCoin.isConfigured()) {
        const productid = resolveOrderProductId(product);
        if (!productid) {
          error = 'No valid Provider Product ID for this product';
          pointsOk = false;
        } else {
          let snapshot = pointsCache.get(scProduct);
          if (!snapshot) {
            try {
              snapshot = await fetchProviderPointsSnapshot(scProduct);
            } catch (err) {
              console.warn('[batch-validate] provider query failed for %s: %s', scProduct, err.message);
              snapshot = { queryFailed: true };
            }
            pointsCache.set(scProduct, snapshot);
          }

          if (snapshot.queryFailed) {
            // Fail open, matching preFlightPointsCheck: a transient provider
            // hiccup must not block the cart (createorder still rejects if
            // truly short). Left as null rather than true so the UI doesn't
            // claim "Provider points OK" on an unanswered query.
            pointsOk = null;
          } else {
            const pointsCost = resolvePointsCost(product, snapshot.skus, productid);
            const deficiency = pointsDeficiency(snapshot.balance, pointsCost);
            if (deficiency) {
              pointsOk = false;
              error = deficiency;
            } else {
              pointsOk = true;
              expectedProviderPrice = Number.isFinite(pointsCost) ? pointsCost : null;
            }
          }
        }
      }

      validatedItems.push({
        product_id,
        product_name: product?.name,
        quantity: Math.max(1, Number(quantity)),
        line_total: lineTotal,
        currency: product?.currency ?? 'PKS',
        points_ok: pointsOk,
        expected_provider_price: expectedProviderPrice,
        error,
      });
    }

    const canProceed = wallet >= cartTotal && validatedItems.every((i) => i.points_ok !== false);

    res.json({
      ok: true,
      wallet_balance: wallet,
      cart_total: cartTotal,
      can_proceed: canProceed,
      items: validatedItems,
    });
  } catch (err) {
    console.error('[batch-validate]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

async function getActiveProductForPayment(productId) {
  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select('id, name, currency, status, game_id')
    .eq('id', productId)
    .maybeSingle();
  if (productError) throw productError;
  if (!product || product.status !== 'active') throw new Error('Product is not available');

  const { data: game, error: gameError } = await supabaseAdmin
    .from('games')
    .select('id, status')
    .eq('id', product.game_id)
    .maybeSingle();
  if (gameError) throw gameError;
  if (!game || game.status !== 'active') throw new Error('Game is not available');

  return product;
}

function supportedRazorpayCurrency(currency) {
  const configured = String(process.env.RAZORPAY_SUPPORTED_CURRENCIES || 'INR')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  return configured.includes(currency);
}

function razorpayPaymentMetadata(payment) {
  return {
    id: String(payment.id),
    status: String(payment.status || 'captured'),
    method: payment.method || null,
    verified_at: new Date().toISOString(),
  };
}

async function markRazorpayPaymentCaptured(order, payment) {
  const paymentId = String(payment.id).trim();
  if (order.status === 'completed' || order.status === 'processing') {
    if (order.payment_id !== paymentId) throw new Error('Order is already linked to another payment');
    return { already: true, status: order.status, paymentId };
  }
  if (order.status !== 'pending') throw new Error(`Order cannot be paid in status: ${order.status}`);

  const metadata = {
    ...(order.metadata || {}),
    razorpay_payment: razorpayPaymentMetadata(payment),
  };
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'processing',
      payment_id: paymentId,
      updated_at: new Date().toISOString(),
      metadata,
    })
    .eq('id', order.id)
    .eq('status', 'pending')
    .select('id, status, payment_id')
    .maybeSingle();
  if (updateError) throw updateError;
  if (updated) return { already: false, status: updated.status, paymentId: updated.payment_id };

  const { data: current, error: currentError } = await supabaseAdmin
    .from('orders')
    .select('status, payment_id')
    .eq('id', order.id)
    .maybeSingle();
  if (currentError) throw currentError;
  if (current?.payment_id === paymentId && ['processing', 'completed'].includes(current.status)) {
    return { already: true, status: current.status, paymentId };
  }
  throw new Error('Order is already being processed');
}

function assertCapturedRazorpayPayment(order, payment) {
  const expectedAmount = razorpay.toSubunits(order.total_amount, order.currency);
  if (String(payment.order_id) !== String(order.razorpay_order_id)) throw new Error('Payment does not belong to this order');
  if (Number(payment.amount) !== expectedAmount) throw new Error('Payment amount does not match the order');
  if (String(payment.currency).toUpperCase() !== String(order.currency).toUpperCase()) throw new Error('Payment currency does not match the order');
  if (payment.status !== 'captured') throw new Error('Payment has not been captured yet');
}

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
  const paymentMethod = payment_method ? String(payment_method).trim().toLowerCase() : null;
  if (!product_id || !product_name || total_amount == null || !currency) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }

  try {
    if (paymentMethod === 'razorpay') {
      if (!razorpay.isConfigured()) throw new Error('Razorpay is not configured on the payment server');

      const product = await getActiveProductForPayment(product_id);
      const productCurrency = String(product.currency || '').trim().toUpperCase();
      const requestedCurrency = String(currency).trim().toUpperCase();
      if (!productCurrency || requestedCurrency !== productCurrency) {
        throw new Error('Product price or currency changed. Refresh and try again.');
      }
      if (!supportedRazorpayCurrency(productCurrency)) {
        throw new Error(`Razorpay is not enabled for ${productCurrency} payments`);
      }

      const totalAmount = Number(total_amount);
      const amountInSubunits = razorpay.toSubunits(totalAmount, productCurrency);
      const orderMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
      let orderId = null;

      try {
        const { data, error: rpcError } = await supabaseAdmin.rpc('place_pending_order', {
          p_user_id: user.id,
          p_product_id: product.id,
          p_product_name: product.name,
          p_total_amount: totalAmount,
          p_currency: productCurrency,
          p_payment_method: 'razorpay',
          p_metadata: orderMetadata,
        });
        if (rpcError) throw rpcError;
        orderId = data;

        const providerOrder = await razorpay.createOrder({
          amount: totalAmount,
          currency: productCurrency,
          receipt: orderId,
          notes: { pixiekat_order_id: orderId },
        });
        if (!providerOrder?.id || Number(providerOrder.amount) !== amountInSubunits || String(providerOrder.currency).toUpperCase() !== productCurrency) {
          throw new Error('Razorpay returned an invalid order');
        }

        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({
            razorpay_order_id: providerOrder.id,
            metadata: { ...orderMetadata, razorpay_order_id: providerOrder.id },
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .eq('status', 'pending');
        if (updateError) throw updateError;

        return res.json({
          ok: true,
          orderId,
          razorpay: {
            keyId: razorpay.getKeyId(),
            orderId: providerOrder.id,
            amount: amountInSubunits,
            currency: productCurrency,
          },
        });
      } catch (err) {
        if (orderId) {
          await supabaseAdmin
            .from('orders')
            .update({
              status: 'failed',
              metadata: { ...orderMetadata, payment_error: 'Razorpay order creation failed', payment_error_at: new Date().toISOString() },
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)
            .eq('status', 'pending');
        }
        throw err;
      }
    }

    if (paymentMethod === 'aluu') {
      if (!aluu.isConfigured()) throw new Error('Aluu Pay is not configured on the payment server');

      const product = await getActiveProductForPayment(product_id);
      const productCurrency = String(product.currency || '').trim().toUpperCase();
      const requestedCurrency = String(currency).trim().toUpperCase();
      if (!productCurrency || requestedCurrency !== productCurrency) {
        throw new Error('Product price or currency changed. Refresh and try again.');
      }

      const totalAmount = Number(total_amount);
      if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw new Error('Payment amount must be greater than zero.');
      const orderMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
      let orderId = null;

      try {
        const { data, error: rpcError } = await supabaseAdmin.rpc('place_pending_order', {
          p_user_id: user.id,
          p_product_id: product.id,
          p_product_name: product.name,
          p_total_amount: totalAmount,
          p_currency: productCurrency,
          p_payment_method: 'aluu',
          p_metadata: orderMetadata,
        });
        if (rpcError) throw rpcError;
        orderId = data;

        // Use orderId as external order_id for Aluu — guarantees uniqueness
        const customerMobile = String(orderMetadata.customer_mobile || orderMetadata.contact_phone || '0000000000').replace(/\D/g, '').slice(-10) || '0000000000';
        const redirectUrl = config.frontendUrl
          ? `${config.frontendUrl}/account/orders/${orderId}`
          : String(req.headers.origin || req.headers.referer || 'http://localhost:5173').replace(/\/+$/, '') + `/account/orders/${orderId}`;

        const providerOrder = await aluu.createOrder({
          amount: totalAmount,
          orderId,
          customerMobile,
          redirectUrl,
          remark1: `PixieKat order ${orderId}`,
          remark2: product.name,
        });

        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({
            aluu_order_id: providerOrder.orderId,
            metadata: { ...orderMetadata, aluu_order_id: providerOrder.orderId, aluu_payment_url: providerOrder.paymentUrl },
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .eq('status', 'pending');
        if (updateError) throw updateError;

        return res.json({
          ok: true,
          orderId,
          aluu: {
            paymentUrl: providerOrder.paymentUrl,
            providerOrderId: providerOrder.orderId,
          },
        });
      } catch (err) {
        if (orderId) {
          await supabaseAdmin
            .from('orders')
            .update({
              status: 'failed',
              metadata: { ...orderMetadata, payment_error: 'Aluu order creation failed', payment_error_at: new Date().toISOString() },
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)
            .eq('status', 'pending');
        }
        throw err;
      }
    }

    if (paymentMethod && paymentMethod !== 'wallet') {
      const { data: orderId, error: rpcError } = await supabaseAdmin.rpc('place_pending_order', {
        p_user_id: user.id,
        p_product_id: product_id,
        p_product_name: product_name,
        p_total_amount: total_amount,
        p_currency: currency,
        p_payment_method: paymentMethod,
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

// ── Cart checkout (one payment covering many orders) ─────────────────────────
// POST /api/cart-checkout
// Body: {
//   items: [{ product_id, quantity, unit_amount, metadata }],
//   payment_method: 'wallet' | 'razorpay' | 'aluu',
//   contact?: { email?, whatsapp? }
// }
// Expands quantity into one order per unit (fulfill-order provisions one unit
// per order row). Every unit shares metadata.payment_group_id so a single
// Razorpay/Aluu payment can settle the whole group, and verification/webhooks
// can find all sibling orders.
const cartCheckoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many checkout attempts. Please wait a minute.' },
});

const CART_MAX_LINES = 25;
const CART_MAX_UNITS = 50;
const CART_MAX_LINE_QTY = 10;

// Per-account purchase limits, enforced server-side (mirrors src/lib/cart.js).
// Passes/bundles redeem once per game account; admins can set an explicit cap
// via products.metadata.max_per_account / purchase_limit.
const CART_ACCOUNT_LIMITED_PATTERN = /bundle|pass|subscription|weekly|monthly/i;
const CART_USER_ID_KEYS = ['user_id', 'userid', 'player_id', 'account_id', 'uid'];
const CART_ZONE_ID_KEYS = ['zone_id', 'server_id', 'zoneid', 'server'];

function cartProductAccountLimit(product) {
  const meta = isPlainObject(product?.metadata) ? product.metadata : {};
  const explicit = Number(meta.max_per_account ?? meta.purchase_limit);
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.min(Math.floor(explicit), CART_MAX_LINE_QTY);
  }
  const text = `${product?.name ?? ''} ${product?.amount ?? ''}`;
  return CART_ACCOUNT_LIMITED_PATTERN.test(text) ? 1 : null;
}

function cartAccountKey(meta) {
  const fields = isPlainObject(meta?.account_fields) ? meta.account_fields : {};
  const pick = (keys) => {
    for (const key of keys) {
      const value = fields[key];
      if (value != null && String(value).trim() !== '') return String(value).trim().toLowerCase();
    }
    return '';
  };
  const user = pick(CART_USER_ID_KEYS);
  const zone = pick(CART_ZONE_ID_KEYS);
  return user || zone ? `${user}|${zone}` : '';
}

// Only these metadata keys flow into orders — everything else is dropped so
// clients can't smuggle pricing/membership overrides into order metadata.
function sanitizeCartItemMeta(meta) {
  const clean = {};
  if (!isPlainObject(meta)) return clean;
  if (meta.game_id) clean.game_id = String(meta.game_id).slice(0, 64);
  if (meta.game_slug) clean.game_slug = String(meta.game_slug).slice(0, 128);
  if (meta.game_name) clean.game_name = String(meta.game_name).slice(0, 128);
  if (isPlainObject(meta.account_fields)) {
    clean.account_fields = Object.fromEntries(
      Object.entries(meta.account_fields)
        .slice(0, 12)
        .map(([k, v]) => [String(k).slice(0, 64), String(v ?? '').slice(0, MAX_CHECKOUT_FIELD_LENGTH)])
    );
  }
  if (meta.verified_username) clean.verified_username = String(meta.verified_username).slice(0, 128);
  if (isPlainObject(meta.contact)) {
    clean.contact = {
      email: String(meta.contact.email ?? '').slice(0, 254),
      whatsapp: String(meta.contact.whatsapp ?? '').slice(0, 64),
    };
  }
  return clean;
}

app.post('/api/cart-checkout', cartCheckoutLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Authorization required' });
  }
  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }

  const { items, payment_method, contact } = req.body || {};
  const paymentMethod = String(payment_method || 'wallet').trim().toLowerCase();

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, error: 'items array is required' });
  }
  if (items.length > CART_MAX_LINES) {
    return res.status(400).json({ ok: false, error: `Cart has too many lines (max ${CART_MAX_LINES})` });
  }
  if (!['wallet', 'razorpay', 'aluu'].includes(paymentMethod)) {
    return res.status(400).json({ ok: false, error: 'Unsupported payment method' });
  }

  try {
    const groupId = crypto.randomUUID();
    const units = [];
    const lineSizes = [];

    for (let idx = 0; idx < items.length; idx++) {
      const raw = items[idx];
      const productId = String(raw?.product_id ?? '');
      if (!UUID_PATTERN.test(productId)) throw new Error('Cart contains an invalid product');
      const quantity = Math.max(1, Math.min(CART_MAX_LINE_QTY, Math.trunc(Number(raw?.quantity) || 1)));
      const unitAmount = Number(raw?.unit_amount);
      if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
        throw new Error('Cart contains an invalid price');
      }
      const baseMeta = sanitizeCartItemMeta(raw?.metadata);
      for (let u = 0; u < quantity; u++) {
        units.push({
          product_id: productId,
          unit_amount: unitAmount,
          metadata: {
            ...baseMeta,
            payment_group_id: groupId,
            cart_line: idx,
            cart_unit: u + 1,
            cart_units_in_line: quantity,
          },
        });
      }
      lineSizes.push(quantity);
    }

    if (units.length > CART_MAX_UNITS) {
      return res.status(400).json({ ok: false, error: `Cart is too large (max ${CART_MAX_UNITS} units)` });
    }

    // Verify every product is purchasable and shares a single currency.
    const productIds = [...new Set(units.map((u) => u.product_id))];
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, amount, currency, status, game_id, metadata')
      .in('id', productIds);
    if (productsError) throw productsError;
    const byId = new Map((products ?? []).map((p) => [p.id, p]));
    for (const u of units) {
      const p = byId.get(u.product_id);
      if (!p || p.status !== 'active') {
        throw new Error('A product in your cart is no longer available');
      }
    }

    // Per-account limits: a restricted product may appear in several lines,
    // but the total quantity for the same User ID + Server ID must stay under
    // its cap. The cap also applies within a single line.
    const perAccountUnits = new Map();
    for (let idx = 0; idx < items.length; idx++) {
      const raw = items[idx];
      const product = byId.get(String(raw?.product_id ?? ''));
      const limit = cartProductAccountLimit(product);
      const quantity = lineSizes[idx];
      const lineCap = Math.min(CART_MAX_LINE_QTY, limit ?? CART_MAX_LINE_QTY);
      if (quantity > lineCap) {
        throw new Error(
          limit !== null
            ? `${product.name} is limited to ${limit} per account`
            : `You can order at most ${CART_MAX_LINE_QTY} of ${product.name} per account`
        );
      }
      if (limit === null) continue;
      const key = `${product.id}|${cartAccountKey(sanitizeCartItemMeta(raw?.metadata))}`;
      const total = (perAccountUnits.get(key) ?? 0) + quantity;
      if (total > limit) {
        throw new Error(
          `${product.name} is limited to ${limit} per account — it can only be ordered again for a different User ID / Server ID`
        );
      }
      perAccountUnits.set(key, total);
    }

    const gameIds = [...new Set([...byId.values()].map((p) => p.game_id))];
    const { data: gameRows } = await supabaseAdmin
      .from('games')
      .select('id, status')
      .in('id', gameIds);
    if ((gameRows ?? []).some((g) => g.status !== 'active')) {
      throw new Error('A game in your cart is no longer available');
    }

    const currencies = new Set([...byId.values()].map((p) => String(p.currency || '').trim().toUpperCase()));
    if (currencies.size !== 1) {
      return res.status(400).json({
        ok: false,
        error: 'Cart items must share a single currency to check out together',
      });
    }
    const currency = [...currencies][0];
    const grandTotal = units.reduce((s, u) => s + u.unit_amount, 0);

    // Slice the flat order-id array back into per-line groups for the client.
    const linesResponse = (orderIds) => {
      const lines = [];
      let cursor = 0;
      for (let idx = 0; idx < lineSizes.length; idx++) {
        lines.push({ index: idx, order_ids: orderIds.slice(cursor, cursor + lineSizes[idx]) });
        cursor += lineSizes[idx];
      }
      return lines;
    };

    const rpcItems = units.map((u) => ({
      product_id: u.product_id,
      unit_amount: u.unit_amount,
      metadata: u.metadata,
    }));

    if (paymentMethod === 'wallet') {
      const { data: orderIds, error: rpcError } = await supabaseAdmin.rpc('place_wallet_cart', {
        p_user_id: user.id,
        p_currency: currency,
        p_items: rpcItems,
      });
      if (rpcError) throw rpcError;
      return res.json({
        ok: true,
        groupId,
        currency,
        total: grandTotal,
        lines: linesResponse(orderIds),
      });
    }

    // Razorpay / Aluu — pending orders first, then one provider payment.
    const { data: orderIds, error: rpcError } = await supabaseAdmin.rpc('place_cart_orders', {
      p_user_id: user.id,
      p_payment_method: paymentMethod,
      p_currency: currency,
      p_items: rpcItems,
    });
    if (rpcError) throw rpcError;

    const failGroup = async () => {
      const { error } = await supabaseAdmin
        .from('orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .in('id', orderIds)
        .eq('status', 'pending');
      if (error) console.error('[cart-checkout] failed to mark group failed:', error.message);
    };

    if (paymentMethod === 'razorpay') {
      try {
        if (!razorpay.isConfigured()) throw new Error('Razorpay is not configured on the payment server');
        if (!supportedRazorpayCurrency(currency)) {
          throw new Error(`Razorpay is not enabled for ${currency} payments`);
        }
        const amountInSubunits = razorpay.toSubunits(grandTotal, currency);
        const providerOrder = await razorpay.createOrder({
          amount: grandTotal,
          currency,
          receipt: groupId,
          notes: { pixiekat_cart_group: groupId, items: String(units.length) },
        });
        if (!providerOrder?.id || Number(providerOrder.amount) !== amountInSubunits
            || String(providerOrder.currency).toUpperCase() !== currency) {
          throw new Error('Razorpay returned an invalid order');
        }

        // Provider order id lives in metadata — the razorpay_order_id column
        // stays unique to single-order checkout.
        await Promise.all(orderIds.map((id, i) => supabaseAdmin
          .from('orders')
          .update({
            metadata: { ...units[i].metadata, razorpay_order_id: providerOrder.id },
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('status', 'pending')));

        return res.json({
          ok: true,
          groupId,
          currency,
          total: grandTotal,
          lines: linesResponse(orderIds),
          razorpay: {
            keyId: razorpay.getKeyId(),
            orderId: providerOrder.id,
            amount: amountInSubunits,
            currency,
          },
        });
      } catch (err) {
        await failGroup();
        throw err;
      }
    }

    // aluu
    try {
      if (!aluu.isConfigured()) throw new Error('Aluu Pay is not configured on the payment server');
      const contactMeta = isPlainObject(contact) ? contact : {};
      const customerMobile = String(contactMeta.whatsapp || contactMeta.mobile || '0000000000')
        .replace(/\D/g, '').slice(-10) || '0000000000';
      const redirectBase = config.frontendUrl
        || String(req.headers.origin || req.headers.referer || 'http://localhost:5173').replace(/\/+$/, '');
      const providerOrder = await aluu.createOrder({
        amount: grandTotal,
        orderId: groupId, // external order id = group id → webhook resolves the group
        customerMobile,
        redirectUrl: `${redirectBase}/cart`,
        remark1: `PixieKat cart ${groupId.slice(0, 8)}`,
        remark2: `${units.length} items`,
      });

      await Promise.all(orderIds.map((id, i) => supabaseAdmin
        .from('orders')
        .update({
          metadata: {
            ...units[i].metadata,
            aluu_order_id: providerOrder.orderId,
            aluu_payment_url: providerOrder.paymentUrl,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'pending')));

      return res.json({
        ok: true,
        groupId,
        currency,
        total: grandTotal,
        lines: linesResponse(orderIds),
        aluu: { paymentUrl: providerOrder.paymentUrl, providerOrderId: providerOrder.orderId },
      });
    } catch (err) {
      await failGroup();
      throw err;
    }
  } catch (err) {
    console.error('[cart-checkout]', err.message);
    return res.status(400).json({ ok: false, error: err.message });
  }
});

const razorpayVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many payment verification attempts. Please wait a minute.' },
});

app.post('/api/razorpay/verify-payment', razorpayVerifyLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Authorization required' });
  }
  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }

  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ ok: false, error: 'Payment verification fields are required' });
  }
  if (!razorpay.isConfigured()) {
    return res.status(503).json({ ok: false, error: 'Razorpay is not configured on the payment server' });
  }

  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, total_amount, currency, status, payment_method, payment_id, razorpay_order_id, metadata')
      .eq('id', orderId)
      .maybeSingle();
    if (orderError || !order) throw new Error('Order not found');
    if (order.user_id !== user.id) return res.status(403).json({ ok: false, error: 'Access denied' });
    if (order.payment_method !== 'razorpay') throw new Error('Order is not a Razorpay order');
    if (String(order.razorpay_order_id) !== String(razorpay_order_id)) throw new Error('Payment does not belong to this order');
    if (!razorpay.verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ ok: false, error: 'Payment signature verification failed' });
    }

    if (['processing', 'completed'].includes(order.status) && order.payment_id === razorpay_payment_id) {
      return res.json({ ok: true, orderId: order.id, status: order.status, paymentId: order.payment_id, already: true });
    }

    const payment = await razorpay.fetchPayment(razorpay_payment_id);
    if (String(payment.id) !== String(razorpay_payment_id)) throw new Error('Razorpay returned an unexpected payment');
    assertCapturedRazorpayPayment(order, payment);

    const confirmation = await markRazorpayPaymentCaptured(order, payment);
    return res.json({
      ok: true,
      orderId: order.id,
      status: confirmation.status,
      paymentId: confirmation.paymentId,
      already: confirmation.already,
    });
  } catch (err) {
    console.error('[razorpay/verify-payment]', err.message);
    return res.status(400).json({ ok: false, error: 'Payment verification failed. Please contact support if your account was debited.' });
  }
});

// ── Razorpay: verify a cart (group) payment ──────────────────────────────────
// POST /api/razorpay/verify-cart-payment
// Body: { groupId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
// One Razorpay payment covers every order in metadata.payment_group_id.
app.post('/api/razorpay/verify-cart-payment', razorpayVerifyLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Authorization required' });
  }
  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }

  const { groupId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!groupId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ ok: false, error: 'Payment verification fields are required' });
  }
  if (!razorpay.isConfigured()) {
    return res.status(503).json({ ok: false, error: 'Razorpay is not configured on the payment server' });
  }

  try {
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, total_amount, currency, status, payment_method, payment_id, metadata')
      .eq('user_id', user.id)
      .eq('metadata->>payment_group_id', String(groupId));
    if (ordersError) throw ordersError;
    if (!orders?.length) throw new Error('Order group not found');
    if (orders.some((o) => o.payment_method !== 'razorpay')) {
      throw new Error('Order group is not a Razorpay checkout');
    }
    if (orders.some((o) => String(o.metadata?.razorpay_order_id ?? '') !== String(razorpay_order_id))) {
      throw new Error('Payment does not belong to this order group');
    }
    if (!razorpay.verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ ok: false, error: 'Payment signature verification failed' });
    }

    const alreadyDone = orders.every(
      (o) => ['processing', 'completed'].includes(o.status) && o.payment_id === razorpay_payment_id
    );
    if (alreadyDone) {
      return res.json({ ok: true, groupId, already: true, orderIds: orders.map((o) => o.id) });
    }

    const payment = await razorpay.fetchPayment(razorpay_payment_id);
    if (String(payment.id) !== String(razorpay_payment_id)) {
      throw new Error('Razorpay returned an unexpected payment');
    }
    if (String(payment.order_id) !== String(razorpay_order_id)) {
      throw new Error('Payment does not belong to this order group');
    }
    const currency = orders[0].currency;
    const expected = razorpay.toSubunits(
      orders.reduce((s, o) => s + Number(o.total_amount), 0),
      currency
    );
    if (Number(payment.amount) !== expected) throw new Error('Payment amount does not match the order');
    if (String(payment.currency).toUpperCase() !== String(currency).toUpperCase()) {
      throw new Error('Payment currency does not match the order');
    }
    if (payment.status !== 'captured') throw new Error('Payment has not been captured yet');

    const paymentMeta = razorpayPaymentMetadata(payment);
    await Promise.all(orders.map((o) => supabaseAdmin
      .from('orders')
      .update({
        status: 'processing',
        payment_id: String(payment.id),
        updated_at: new Date().toISOString(),
        metadata: { ...(o.metadata || {}), razorpay_payment: paymentMeta },
      })
      .eq('id', o.id)
      .eq('status', 'pending')));

    return res.json({ ok: true, groupId, orderIds: orders.map((o) => o.id) });
  } catch (err) {
    console.error('[razorpay/verify-cart-payment]', err.message);
    return res.status(400).json({ ok: false, error: 'Payment verification failed. Please contact support if your account was debited.' });
  }
});

app.post('/api/webhooks/razorpay', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  if (!razorpay.verifyWebhookSignature(req.rawBody, signature)) {
    return res.status(400).json({ ok: false, error: 'Invalid webhook signature' });
  }

  const event = String(req.body?.event || '');
  if (event !== 'payment.captured') return res.json({ ok: true, ignored: true });

  const payment = req.body?.payload?.payment?.entity;
  const providerOrderId = payment?.order_id;
  if (!payment?.id || !providerOrderId) return res.status(400).json({ ok: false, error: 'Invalid payment webhook payload' });

  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, total_amount, currency, status, payment_method, payment_id, razorpay_order_id, metadata')
      .eq('razorpay_order_id', providerOrderId)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) {
      // Cart checkout: the provider order id lives in group orders' metadata,
      // not the unique razorpay_order_id column.
      const { data: groupOrders } = await supabaseAdmin
        .from('orders')
        .select('id, user_id, total_amount, currency, status, payment_method, payment_id, metadata')
        .eq('metadata->>razorpay_order_id', providerOrderId);
      const group = (groupOrders ?? []).filter((o) => o.payment_method === 'razorpay');
      if (!group.length) return res.json({ ok: true, ignored: true });

      const groupCurrency = group[0].currency;
      const expected = razorpay.toSubunits(
        group.reduce((s, o) => s + Number(o.total_amount), 0),
        groupCurrency
      );
      if (String(payment.currency).toUpperCase() !== String(groupCurrency).toUpperCase()
          || Number(payment.amount) !== expected || payment.status !== 'captured') {
        throw new Error('Cart payment does not match the order group');
      }

      const paymentMeta = razorpayPaymentMetadata(payment);
      await Promise.all(group.map((o) => supabaseAdmin
        .from('orders')
        .update({
          status: 'processing',
          payment_id: String(payment.id),
          updated_at: new Date().toISOString(),
          metadata: { ...(o.metadata || {}), razorpay_payment: paymentMeta },
        })
        .eq('id', o.id)
        .eq('status', 'pending')));

      return res.json({ ok: true, group: true, count: group.length });
    }
    if (order.payment_method !== 'razorpay') return res.json({ ok: true, ignored: true });

    assertCapturedRazorpayPayment(order, payment);
    const confirmation = await markRazorpayPaymentCaptured(order, payment);
    return res.json({ ok: true, orderId: order.id, status: confirmation.status, already: confirmation.already });
  } catch (err) {
    console.error('[webhooks/razorpay]', err.message);
    return res.status(500).json({ ok: false, error: 'Webhook processing failed' });
  }
});

// ── Aluu Pay: check payment status (user-facing polling endpoint) ────────────
const aluuCheckPaymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many payment status checks. Please wait a minute.' },
});

app.post('/api/aluu/check-payment', aluuCheckPaymentLimiter, async (req, res) => {
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
  if (!orderId) {
    return res.status(400).json({ ok: false, error: 'orderId is required' });
  }
  if (!aluu.isConfigured()) {
    return res.status(503).json({ ok: false, error: 'Aluu Pay is not configured on the payment server' });
  }

  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, total_amount, currency, status, payment_method, payment_id, aluu_order_id, metadata')
      .eq('id', orderId)
      .maybeSingle();
    if (orderError || !order) throw new Error('Order not found');
    if (order.user_id !== user.id) return res.status(403).json({ ok: false, error: 'Access denied' });
    if (order.payment_method !== 'aluu') throw new Error('Order is not an Aluu Pay order');

    // Already confirmed
    if (['processing', 'completed'].includes(order.status) && order.payment_id) {
      return res.json({ ok: true, orderId: order.id, status: order.status, paymentId: order.payment_id, already: true });
    }
    if (order.status === 'failed' || order.status === 'refunded') {
      return res.json({ ok: false, orderId: order.id, status: order.status, error: 'Order is no longer payable' });
    }

    // Poll Aluu for current status — use our orderId as the external order_id
    const statusResult = await aluu.checkOrderStatus(orderId);

    if (statusResult.txnStatus === 'COMPLETED' || statusResult.status === 'COMPLETED') {
      const paymentId = statusResult.utr || `aluu_${statusResult.orderId}`;
      const aluuMeta = {
        aluu_txn_status: statusResult.txnStatus,
        aluu_utr: statusResult.utr,
        aluu_amount: statusResult.amount,
        aluu_date: statusResult.date,
        verified_at: new Date().toISOString(),
      };

      // Mark order as processing (idempotent)
      if (order.status === 'pending') {
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({
            status: 'processing',
            payment_id: paymentId,
            updated_at: new Date().toISOString(),
            metadata: { ...(order.metadata || {}), aluu_payment: aluuMeta },
          })
          .eq('id', orderId)
          .eq('status', 'pending');
        if (updateError) throw updateError;
      }

      return res.json({ ok: true, orderId: order.id, status: 'processing', paymentId });
    }

    if (statusResult.txnStatus === 'FAILED' || statusResult.status === 'FAILED') {
      // Mark order failed if still pending
      if (order.status === 'pending') {
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
            metadata: { ...(order.metadata || {}), aluu_status: 'FAILED', failed_at: new Date().toISOString() },
          })
          .eq('id', orderId)
          .eq('status', 'pending');
      }
      return res.json({ ok: false, orderId: order.id, status: 'failed', error: 'Payment failed or expired' });
    }

    // Still pending on Aluu's side
    return res.json({ ok: false, orderId: order.id, status: 'pending', waiting: true });
  } catch (err) {
    console.error('[aluu/check-payment]', err.message);
    return res.status(400).json({ ok: false, error: 'Payment status check failed. Please try again.' });
  }
});

// ── Aluu Pay: check a cart (group) payment ───────────────────────────────────
// POST /api/aluu/check-cart-payment
// Body: { groupId }
// The cart's Aluu payment uses the group id as its external order_id, so one
// status check settles every order in the group.
app.post('/api/aluu/check-cart-payment', aluuCheckPaymentLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Authorization required' });
  }
  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }

  const { groupId } = req.body || {};
  if (!groupId) {
    return res.status(400).json({ ok: false, error: 'groupId is required' });
  }
  if (!aluu.isConfigured()) {
    return res.status(503).json({ ok: false, error: 'Aluu Pay is not configured on the payment server' });
  }

  try {
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, total_amount, currency, status, payment_method, payment_id, metadata')
      .eq('user_id', user.id)
      .eq('metadata->>payment_group_id', String(groupId));
    if (ordersError) throw ordersError;
    if (!orders?.length) throw new Error('Order group not found');
    if (orders.some((o) => o.payment_method !== 'aluu')) {
      throw new Error('Order group is not an Aluu Pay checkout');
    }

    const pending = orders.filter((o) => o.status === 'pending');
    if (pending.length === 0) {
      if (orders.some((o) => o.status === 'failed' || o.status === 'refunded')) {
        return res.json({ ok: false, status: 'failed', error: 'Payment failed or expired' });
      }
      return res.json({
        ok: true,
        status: 'processing',
        already: true,
        orderIds: orders.map((o) => o.id),
      });
    }

    const statusResult = await aluu.checkOrderStatus(groupId);

    if (statusResult.txnStatus === 'COMPLETED' || statusResult.status === 'COMPLETED') {
      const paymentId = statusResult.utr || `aluu_${statusResult.orderId}`;
      const aluuMeta = {
        aluu_txn_status: statusResult.txnStatus,
        aluu_utr: statusResult.utr,
        aluu_amount: statusResult.amount,
        aluu_date: statusResult.date,
        verified_at: new Date().toISOString(),
      };
      await Promise.all(pending.map((o) => supabaseAdmin
        .from('orders')
        .update({
          status: 'processing',
          payment_id: paymentId,
          updated_at: new Date().toISOString(),
          metadata: { ...(o.metadata || {}), aluu_payment: aluuMeta },
        })
        .eq('id', o.id)
        .eq('status', 'pending')));

      return res.json({ ok: true, status: 'processing', paymentId, orderIds: orders.map((o) => o.id) });
    }

    if (statusResult.txnStatus === 'FAILED' || statusResult.status === 'FAILED') {
      await Promise.all(pending.map((o) => supabaseAdmin
        .from('orders')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
          metadata: { ...(o.metadata || {}), aluu_status: 'FAILED', failed_at: new Date().toISOString() },
        })
        .eq('id', o.id)
        .eq('status', 'pending')));
      return res.json({ ok: false, status: 'failed', error: 'Payment failed or expired' });
    }

    return res.json({ ok: false, status: 'pending', waiting: true });
  } catch (err) {
    console.error('[aluu/check-cart-payment]', err.message);
    return res.status(400).json({ ok: false, error: 'Payment status check failed. Please try again.' });
  }
});

// ── Aluu Pay: webhook ────────────────────────────────────────────────────────
app.post('/api/webhooks/aluu', async (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  if (!aluu.verifyWebhookSignature(req.rawBody, signature, timestamp)) {
    return res.status(401).json({ ok: false, error: 'Invalid webhook signature' });
  }

  const body = req.body || {};
  const webhookOrderId = body.order_id || body.orderId;
  const txnStatus = String(body.txnStatus || body.status || '').toUpperCase();

  if (!webhookOrderId) return res.status(400).json({ ok: false, error: 'Missing order_id in webhook' });
  if (txnStatus !== 'COMPLETED' && txnStatus !== 'SUCCESS') {
    return res.json({ ok: true, ignored: true });
  }

  try {
    // Look up by our orderId (we used it as external order_id with Aluu)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, total_amount, currency, status, payment_method, payment_id, aluu_order_id, metadata')
      .eq('id', webhookOrderId)
      .maybeSingle();

    // If not found by our id, try aluu_order_id
    let resolvedOrder = order;
    if (!resolvedOrder && !orderError) {
      const { data: orderByAluu } = await supabaseAdmin
        .from('orders')
        .select('id, user_id, total_amount, currency, status, payment_method, payment_id, aluu_order_id, metadata')
        .eq('aluu_order_id', webhookOrderId)
        .maybeSingle();
      resolvedOrder = orderByAluu;
    }

    // Cart checkout: the external order_id is the payment group id, and the
    // provider order id lives in group orders' metadata (the aluu_order_id
    // column stays unique to single-order checkout).
    if (!resolvedOrder) {
      let { data: groupOrders } = await supabaseAdmin
        .from('orders')
        .select('id, user_id, total_amount, currency, status, payment_method, payment_id, metadata')
        .eq('metadata->>payment_group_id', webhookOrderId);
      if (!groupOrders?.length) {
        ({ data: groupOrders } = await supabaseAdmin
          .from('orders')
          .select('id, user_id, total_amount, currency, status, payment_method, payment_id, metadata')
          .eq('metadata->>aluu_order_id', webhookOrderId));
      }
      const group = (groupOrders ?? []).filter((o) => o.payment_method === 'aluu');
      if (!group.length) return res.json({ ok: true, ignored: true });

      const paymentId = body.utr ? String(body.utr) : `aluu_${webhookOrderId}`;
      const aluuMeta = {
        aluu_txn_status: txnStatus,
        aluu_utr: body.utr || null,
        aluu_amount: body.amount || null,
        aluu_date: body.date || null,
        verified_at: new Date().toISOString(),
        source: 'webhook',
      };
      await Promise.all(group.map((o) => supabaseAdmin
        .from('orders')
        .update({
          status: 'processing',
          payment_id: paymentId,
          updated_at: new Date().toISOString(),
          metadata: { ...(o.metadata || {}), aluu_payment: aluuMeta },
        })
        .eq('id', o.id)
        .eq('status', 'pending')));

      return res.json({ ok: true, group: true, count: group.length });
    }
    if (resolvedOrder.payment_method !== 'aluu') return res.json({ ok: true, ignored: true });

    // Already processed
    if (['processing', 'completed'].includes(resolvedOrder.status) && resolvedOrder.payment_id) {
      return res.json({ ok: true, orderId: resolvedOrder.id, status: resolvedOrder.status, already: true });
    }

    const paymentId = body.utr ? String(body.utr) : `aluu_${webhookOrderId}`;
    const aluuMeta = {
      aluu_txn_status: txnStatus,
      aluu_utr: body.utr || null,
      aluu_amount: body.amount || null,
      aluu_date: body.date || null,
      verified_at: new Date().toISOString(),
      source: 'webhook',
    };

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'processing',
        payment_id: paymentId,
        updated_at: new Date().toISOString(),
        metadata: { ...(resolvedOrder.metadata || {}), aluu_payment: aluuMeta },
      })
      .eq('id', resolvedOrder.id)
      .eq('status', 'pending');
    if (updateError) throw updateError;

    return res.json({ ok: true, orderId: resolvedOrder.id, status: 'processing' });
  } catch (err) {
    console.error('[webhooks/aluu]', err.message);
    return res.status(500).json({ ok: false, error: 'Webhook processing failed' });
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

  // Hoisted so the catch block can detect whether the provider already delivered
  let fulfillResult = null;
  let orderMetadata = null;
  let orderPaymentMethod = null;
  let orderPaymentId = null;
  let orderTotalAmount = null;
  let orderCurrency = null;

  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, product_id, total_amount, currency, status, payment_method, payment_id, metadata')
      .eq('id', orderId)
      .single();

    if (orderError || !order) throw new Error('Order not found');
    if (order.user_id !== user.id) return res.status(403).json({ ok: false, error: 'Access denied' });
    if (order.status !== 'processing') {
      return res.json({ ok: true, already: true, status: order.status });
    }
    if (order.payment_method === 'razorpay' && !order.payment_id) {
      return res.status(409).json({ ok: false, error: 'Payment has not been confirmed yet' });
    }
    orderMetadata = order.metadata;
    orderPaymentMethod = order.payment_method;
    orderPaymentId = order.payment_id;
    orderTotalAmount = order.total_amount;
    orderCurrency = order.currency;

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
      await preFlightPointsCheck(scProduct, productid, product);

      const createParams = {
        userid:    String(userId),
        zoneid:    String(zoneId || userId),
        product:   scProduct,
        productid,
      };
      console.log('[fulfill-order] createorder params:', JSON.stringify(createParams));

      let body;
      try {
        body = await smileCoin.callSmileCoin('createorder', createParams);
      } catch (scErr) {
        // If createorder throws (timeout, non-JSON, network error), the order
        // may still have been processed on SmileOne's side. Mark as uncertain.
        console.error(`[fulfill-order] SmileCoin createorder threw but order may have been processed: ${scErr.message}`);
        fulfillResult = { uncertain: true, error: scErr.message };
        throw scErr;
      }
      console.log('[fulfill-order] createorder response:', JSON.stringify(body).slice(0, 500));

      // IMPORTANT: Set fulfillResult immediately after getting a response.
      // Once createorder returns without a network/parse error, the provider
      // may have already processed and delivered the order. We must never
      // refund in this case — even if the status code is unexpected.
      fulfillResult = body;

      // Accept both numeric and string status, and ok:true
      const statusOk = Number(body.status) === 200 || body.ok === true;
      if (!statusOk) {
        throw new Error(body.message || body.msg || `SmileCoin order failed (status ${body.status})`);
      }
    } else if (game.provider === 'smile_one' && smileOne.isConfigured() && game.provider_game_code) {
      const sku = product?.sku;
      const pid = product?.provider_product_id;
      if (!sku && !pid) throw new Error('No SKU or provider_product_id configured for this product');
      const userAccount = { user_id: String(userId) };
      if (zoneId) userAccount.server_id = String(zoneId);
      let smileOneData;
      try {
        smileOneData = await smileOne.sendOrder(
          game.provider_game_code,
          [{ sku: sku || pid, qty: 1, pid: pid || sku }],
          userAccount
        );
      } catch (smileOneErr) {
        // If sendOrder throws (timeout, network, unexpected error code), we
        // cannot know whether SmileOne actually processed the order. Treat as
        // "possibly delivered" so the catch block won't blindly refund.
        console.error(`[fulfill-order] SmileOne sendOrder threw but order may have been processed: ${smileOneErr.message}`);
        fulfillResult = { uncertain: true, error: smileOneErr.message };
        throw smileOneErr;
      }
      fulfillResult = smileOneData.result ?? smileOneData;
    } else {
      // No auto-fulfillment provider configured — order stays processing for manual fulfillment
      console.log(`[fulfill-order] No auto-fulfill provider for game ${gameId} (provider=${game.provider}, smile_coin_product=${scProduct || 'none'}). Order ${orderId} stays processing.`);
      return res.json({ ok: false, provisioned: false, error: 'No auto-fulfillment provider configured for this game. Order will be fulfilled manually.' });
    }

    // ── Provider price mismatch detection ──
    // Compare the provider-returned price against the expected provider price
    // stored in product.metadata.expected_provider_price. Both values must be
    // in Smile Points — the Smilecoin API's native unit (returned by
    // createorder and productlist, debited from the querypoints balance). NOT
    // BRL/local currency: comparing across units (e.g. BRL 4 vs Smile Points
    // 39) fires false mismatches. If the provider fulfilled a different product
    // (e.g. Elite Bundle instead of Weekly Pass), the Smile Points price will
    // differ — auto-refund the proportional difference and flag it for review.
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
    // Expected price: ONLY product.metadata.expected_provider_price, and it must
    // be in Smile Points — the unit createorder returns (confirmed in prod logs:
    // the merchant Smile Points balance drops by exactly the createorder price).
    // The productlist SKU `price` field is BRL — a different unit (~9.5x) — so
    // it is NOT a valid expected value. Using it as a fallback fired false
    // "expected 4, got 39" mismatches on every metadata-less order.
    const expectedPrice = product?.metadata?.expected_provider_price != null
      ? Number(product.metadata.expected_provider_price)
      : null;

    if (returnedPrice != null) {
      if (expectedPrice == null) {
        // No Smile Points reference price configured for this product, so we
        // cannot detect a substitution. Skip silently (log-only) — do NOT create
        // a provider_mismatch entry, which would surface as a false
        // "substitution" alert in the batch UI. Set
        // metadata.expected_provider_price (Smile Points) to enable monitoring.
        console.log(`[fulfill-order] No expected_provider_price (Smile Points) for product ${product?.id || 'unknown'}; skipping substitution check on order ${orderId}. Provider charged ${returnedPrice} Smile Points.`);
      } else if (returnedPrice !== expectedPrice) {
        // Calculate proportional refund: if provider delivered a cheaper product,
        // refund the fraction of the order amount that wasn't delivered.
        // e.g. expected 76, got 39 (Smile Points) → refund (1 - 39/76) * 155 PKS ≈ 75.46 PKS
        if (returnedPrice < expectedPrice) {
          const ratio = 1 - (returnedPrice / expectedPrice);
          refundAmount = Math.round(Number(order.total_amount) * ratio * 100) / 100;
        }

        const expectedSource = 'metadata.expected_provider_price (Smile Points)';
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

    // ── CRITICAL: If the provider already delivered (fulfillResult is set),
    // do NOT refund — the delivery went through on the provider side even if
    // post-delivery bookkeeping (mismatch detection, DB update) failed.
    // Mark as completed with an error note instead.
    if (fulfillResult) {
      console.warn(`[fulfill-order] Post-delivery error on order ${orderId} but provider DID deliver. NOT refunding. Error: ${err.message}`);
      try {
        const completedMeta = {
          ...(orderMetadata ?? {}),
          fulfill_result: fulfillResult,
          fulfilled_at: new Date().toISOString(),
          post_delivery_error: err.message,
        };
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
            metadata: completedMeta,
          })
          .eq('id', orderId);
      } catch (updateErr) {
        console.error('[fulfill-order] Failed to mark delivered order as completed:', updateErr.message);
      }
      return res.json({ ok: true, orderId, result: fulfillResult, warning: 'Delivered but post-processing had an error: ' + err.message });
    }

    if (orderPaymentMethod === 'razorpay') {
      let orderStatus = 'on_hold';
      let refunded = false;
      const errorMeta = { fulfill_error: err.message, failed_at: new Date().toISOString() };

      if (orderPaymentId) {
        try {
          const refund = await razorpay.refundPayment(orderPaymentId, orderTotalAmount, orderCurrency);
          orderStatus = 'refunded';
          refunded = true;
          errorMeta.razorpay_refund = {
            id: refund?.id || null,
            status: refund?.status || 'processed',
            refunded_at: new Date().toISOString(),
          };
        } catch (refundErr) {
          errorMeta.razorpay_refund = { status: 'failed', error: refundErr.message };
          console.error(`[fulfill-order] Razorpay refund failed for order ${orderId}:`, refundErr.message);
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: orderStatus,
          updated_at: new Date().toISOString(),
          metadata: { ...(orderMetadata ?? {}), ...errorMeta },
        })
        .eq('id', orderId)
        .eq('status', 'processing');
      if (updateError) console.error('[fulfill-order] Failed to update Razorpay order status:', updateError.message);

      return res.status(500).json({
        ok: false,
        orderId,
        refunded,
        paymentReceived: true,
        provisioned: false,
        error: refunded
          ? 'Delivery failed. Your Razorpay payment was refunded.'
          : 'Payment received, but delivery needs manual review. Please contact support.',
      });
    }

    if (orderPaymentMethod && orderPaymentMethod !== 'wallet') {
      const errorMeta = { fulfill_error: err.message, failed_at: new Date().toISOString() };
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'on_hold',
          updated_at: new Date().toISOString(),
          metadata: { ...(orderMetadata ?? {}), ...errorMeta },
        })
        .eq('id', orderId)
        .eq('status', 'processing');
      if (updateError) console.error('[fulfill-order] Failed to update payment order status:', updateError.message);
      return res.status(500).json({ ok: false, orderId, paymentReceived: true, provisioned: false, error: 'Payment received, but delivery needs manual review. Please contact support.' });
    }

    // Provider did NOT deliver — safe to refund.
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
