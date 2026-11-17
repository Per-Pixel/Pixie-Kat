/**
 * Optional email verification.
 *
 * Creating an account confirms the Auth user so they can sign in immediately.
 * profiles.email_verified stays false until they open a link they sent themselves
 * or staff marks them verified. That flag only locks the username.
 */

import crypto from 'node:crypto';
import { validateEmail, validatePassword } from './utils/validation.js';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signEmailVerifyToken(userId, secret, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({
    aud: 'email-verify',
    uid: userId,
    exp: now + TOKEN_TTL_MS,
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function readEmailVerifyToken(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || !token.includes('.')) {
    return { error: 'This verification link is not valid.' };
  }
  const dot = token.indexOf('.');
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig || token.slice(dot + 1).includes('.')) {
    return { error: 'This verification link is not valid.' };
  }
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (!safeEqual(sig, expected)) return { error: 'This verification link is not valid.' };

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { error: 'This verification link is not valid.' };
  }
  if (payload?.aud !== 'email-verify' || typeof payload.uid !== 'string' || !Number.isFinite(payload.exp)) {
    return { error: 'This verification link is not valid.' };
  }
  if (payload.exp < now) {
    return { error: 'This verification link has expired. Send yourself a new one from Security.' };
  }
  return { userId: payload.uid };
}

export function isUnconfirmedAuthError(error) {
  const code = String(error?.code || error?.error_code || '').toLowerCase();
  const message = String(error?.message || error?.msg || error?.error_description || '').toLowerCase();
  return code === 'email_not_confirmed' || message.includes('email not confirmed');
}

export function signupErrorMessage(error) {
  const text = `${error?.message || error?.msg || ''} ${error?.code || error?.error_code || ''}`.toLowerCase();
  if (text.includes('already') || text.includes('email_exists') || text.includes('duplicate')) {
    return 'An account with this email already exists. Sign in instead.';
  }
  if (text.includes('password') && error?.message) return String(error.message);
  return 'Could not create the account. Try again.';
}

export function buildVerificationMessage({ name, link }) {
  const who = String(name || '').trim() || 'there';
  const text = [
    `Hi ${who},`,
    '',
    'Your PixieKat account is already active. You do not need this email to sign in or top up.',
    '',
    'This link does one thing: it verifies your email and locks your username so it stays yours and nobody else can take it.',
    '',
    link,
    '',
    'This message sometimes lands in spam. Check there if you do not see it in your inbox.',
    'The link expires in 24 hours. You can send yourself a new one from Account → Security.',
    'You can also ask us on support or WhatsApp and we will verify you.',
    '',
    'If you did not ask for this, you can ignore it.',
  ].join('\n');

  const safeName = who.replace(/[&<>"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  }[char]));
  const safeLink = String(link).replace(/[&<>"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  }[char]));

  const html = [
    `<p>Hi ${safeName},</p>`,
    '<p>Your PixieKat account is already active. You do not need this email to sign in or top up.</p>',
    '<p>This link does one thing: it verifies your email and locks your username so it stays yours and nobody else can take it.</p>',
    `<p><a href="${safeLink}">Verify my email and lock my username</a></p>`,
    '<p>This message sometimes lands in spam. Check there if you do not see it in your inbox.</p>',
    '<p>The link expires in 24 hours. You can send yourself a new one from Account → Security, or ask us on support or WhatsApp.</p>',
    '<p>If you did not ask for this, you can ignore it.</p>',
  ].join('');

  return {
    subject: 'Lock your PixieKat username',
    text,
    html,
  };
}

export function verifiedUsernameMessage(username, { already = false } = {}) {
  const locked = Boolean(String(username || '').trim());
  if (already) {
    return locked
      ? 'This email is already verified. The username stays locked.'
      : 'This email is already verified.';
  }
  return locked
    ? 'Email verified. This username is locked so nobody else can take it.'
    : 'Email verified. The next username saved on this account is locked.';
}

export async function createOpenAccount({ name, email, password, createUser, setEmailVerified, deleteUser }) {
  const cleanedName = String(name || '').trim();
  const cleanedEmail = String(email || '').trim().toLowerCase();
  if (!cleanedName || cleanedName.length > 80) {
    return { ok: false, status: 400, message: 'Name is required' };
  }
  if (!validateEmail(cleanedEmail) || cleanedEmail.length > 254) {
    return { ok: false, status: 400, message: 'Valid email is required' };
  }
  const passwordCheck = validatePassword(typeof password === 'string' ? password : '');
  if (!passwordCheck.valid) {
    return { ok: false, status: 400, message: passwordCheck.error };
  }

  const created = await createUser({ email: cleanedEmail, password, name: cleanedName });
  if (!created?.ok || !created.userId) {
    return { ok: false, status: created?.status || 400, message: signupErrorMessage(created?.error) };
  }

  try {
    await setEmailVerified(created.userId, false);
  } catch {
    if (deleteUser) {
      try { await deleteUser(created.userId); } catch { /* leave the auth row if cleanup fails */ }
    }
    return { ok: false, status: 500, message: 'Could not finish creating the account. Try again.' };
  }

  return { ok: true, email: cleanedEmail, userId: created.userId };
}

export async function releaseUnconfirmedLogin({
  email,
  password,
  passwordGrant,
  findProfile,
  confirmAuthUser,
  setEmailVerified,
}) {
  const cleanedEmail = String(email || '').trim().toLowerCase();
  if (!validateEmail(cleanedEmail) || typeof password !== 'string' || !password) {
    return { ok: false, status: 401, message: 'Invalid email or password' };
  }

  const grant = await passwordGrant(cleanedEmail, password);
  if (grant?.ok) return { ok: true, alreadyOpen: true };
  if (!isUnconfirmedAuthError(grant?.error)) {
    return { ok: false, status: 401, message: 'Invalid email or password' };
  }

  const profile = await findProfile(cleanedEmail);
  if (!profile?.id) return { ok: false, status: 401, message: 'Invalid email or password' };

  await confirmAuthUser(profile.id);
  if (!profile.email_verified) await setEmailVerified(profile.id, false);
  return { ok: true };
}

export async function markProfileEmailVerified(supabaseAdmin, userId) {
  const { data: existing, error: readError } = await supabaseAdmin
    .from('profiles')
    .select('id, username, email_verified')
    .eq('id', userId)
    .maybeSingle();
  if (readError) throw readError;
  if (!existing) return { ok: false, status: 404, message: 'Account not found' };
  if (existing.email_verified) {
    return { ok: true, already: true, message: verifiedUsernameMessage(existing.username, { already: true }) };
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ email_verified: true, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;

  return { ok: true, already: false, message: verifiedUsernameMessage(existing.username) };
}

export async function sendUsernameLockEmail({ supabaseAdmin, userId, secret, storeBase, sendMail, now }) {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, email, name, email_verified')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!profile?.email) return { ok: false, status: 404, message: 'Account not found' };
  if (profile.email_verified) {
    return {
      ok: true,
      already: true,
      message: 'Your email is already verified. Your username is locked.',
    };
  }

  const token = signEmailVerifyToken(profile.id, secret, now);
  const link = `${String(storeBase || 'https://pixiekat.store').replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
  const message = buildVerificationMessage({ name: profile.name, link });
  try {
    await sendMail({ to: profile.email, ...message });
  } catch (err) {
    if (err?.code === 'mailer_unconfigured') {
      return {
        ok: false,
        status: 503,
        message: 'We could not send email just now. Ask us on support or WhatsApp and we will verify you.',
      };
    }
    throw err;
  }

  return {
    ok: true,
    message: 'Verification email sent. Check your inbox, and spam if it is not there. The link locks your username.',
  };
}
