import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  signEmailVerifyToken,
  readEmailVerifyToken,
  isUnconfirmedAuthError,
  signupErrorMessage,
  buildVerificationMessage,
  createOpenAccount,
  releaseUnconfirmedLogin,
  sendUsernameLockEmail,
} from '../email-verify.js';

const SECRET = 'test-secret';

test('verification token round-trips and rejects tampering or expiry', () => {
  const now = 1_700_000_000_000;
  const token = signEmailVerifyToken('user-1', SECRET, now);
  assert.equal(readEmailVerifyToken(token, SECRET, now + 1000).userId, 'user-1');

  const flipped = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
  assert.match(readEmailVerifyToken(flipped, SECRET, now).error, /not valid/);
  assert.match(readEmailVerifyToken(token, 'other-secret', now).error, /not valid/);
  assert.match(readEmailVerifyToken(token, SECRET, now + 25 * 60 * 60 * 1000).error, /expired/);
  assert.match(readEmailVerifyToken('nope', SECRET, now).error, /not valid/);
});

test('recognises an unconfirmed Auth login error', () => {
  assert.equal(isUnconfirmedAuthError({ code: 'email_not_confirmed', message: 'Email not confirmed' }), true);
  assert.equal(isUnconfirmedAuthError({ message: 'Invalid login credentials' }), false);
});

test('signup maps a duplicate email to a sign-in hint', () => {
  assert.match(signupErrorMessage({ code: 'email_exists', message: 'already registered' }), /Sign in instead/);
  assert.equal(signupErrorMessage({ message: 'something else' }), 'Could not create the account. Try again.');
});

test('verification email says the account already works and mentions spam', () => {
  const message = buildVerificationMessage({ name: 'Ada', link: 'https://pixiekat.store/verify-email?token=abc' });
  assert.match(message.subject, /username/i);
  assert.match(message.text, /already active/);
  assert.match(message.text, /spam/);
  assert.match(message.text, /WhatsApp/);
  assert.match(message.text, /https:\/\/pixiekat\.store\/verify-email\?token=abc/);
});

test('createOpenAccount confirms access and leaves verification off', async () => {
  const calls = [];
  const result = await createOpenAccount({
    name: ' Ada ',
    email: 'Ada@Example.com',
    password: 'Secret123!',
    createUser: async (input) => {
      calls.push(['create', input]);
      return { ok: true, userId: 'user-1' };
    },
    setEmailVerified: async (id, value) => {
      calls.push(['flag', id, value]);
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls[0][1], { email: 'ada@example.com', password: 'Secret123!', name: 'Ada' });
  assert.deepEqual(calls[1], ['flag', 'user-1', false]);
});

test('createOpenAccount rejects a weak password before creating a user', async () => {
  let created = false;
  const result = await createOpenAccount({
    name: 'Ada',
    email: 'ada@example.com',
    password: 'short',
    createUser: async () => { created = true; return { ok: true, userId: 'x' }; },
    setEmailVerified: async () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(created, false);
});

test('releaseUnconfirmedLogin confirms Auth and keeps the username lock off', async () => {
  const calls = [];
  const result = await releaseUnconfirmedLogin({
    email: 'ada@example.com',
    password: 'Secret123!',
    passwordGrant: async () => ({ ok: false, error: { code: 'email_not_confirmed', message: 'Email not confirmed' } }),
    findProfile: async () => ({ id: 'user-1', email_verified: false }),
    confirmAuthUser: async (id) => { calls.push(['confirm', id]); },
    setEmailVerified: async (id, value) => { calls.push(['flag', id, value]); },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(calls, [['confirm', 'user-1'], ['flag', 'user-1', false]]);
});

test('releaseUnconfirmedLogin does not confirm a wrong password', async () => {
  let confirmed = false;
  const result = await releaseUnconfirmedLogin({
    email: 'ada@example.com',
    password: 'Secret123!',
    passwordGrant: async () => ({ ok: false, error: { message: 'Invalid login credentials' } }),
    findProfile: async () => ({ id: 'user-1', email_verified: false }),
    confirmAuthUser: async () => { confirmed = true; },
    setEmailVerified: async () => {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
  assert.equal(confirmed, false);
});

test('sendUsernameLockEmail refuses to mail an address that is already verified', async () => {
  let sent = false;
  const result = await sendUsernameLockEmail({
    supabaseAdmin: {
      from() {
        return {
          select() { return this; },
          eq() { return this; },
          maybeSingle: async () => ({ data: { id: 'user-1', email: 'ada@example.com', name: 'Ada', email_verified: true }, error: null }),
        };
      },
    },
    userId: 'user-1',
    secret: SECRET,
    storeBase: 'https://pixiekat.store',
    sendMail: async () => { sent = true; },
  });
  assert.equal(result.already, true);
  assert.equal(sent, false);
});
