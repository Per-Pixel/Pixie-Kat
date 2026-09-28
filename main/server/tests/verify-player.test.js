import { test } from 'node:test';
import assert from 'node:assert';

// Mirror of classifyVerifyFailure in ../index.js
function classifyVerifyFailure(body, hasZoneId = false) {
  const errMsg = String(body?.message ?? body?.msg ?? '');
  const status = Number(body?.status);

  const isPlayerNotFound = /role|user.?id|zone.?id|does not exist|not exist|invalid (?:user|role|zone)|player not found/i.test(errMsg);
  const isConfigError = status === 20007 || status === 207 || /product does not exist|invalid product/i.test(errMsg);

  if (isConfigError) {
    return 'Player verification is unavailable for this game. You can still place your order.';
  }
  if (isPlayerNotFound) {
    return `Player not found. Check your User ID${hasZoneId ? ' and Zone ID.' : '.'}`;
  }
  return 'Could not verify this account right now. You can still place your order.';
}

const UNAVAILABLE = 'Player verification is unavailable for this game. You can still place your order.';
const GENERIC = 'Could not verify this account right now. You can still place your order.';

test('never echoes provider "recharge failed" copy to the customer', () => {
  // Regression: Smile One answers lookup failures with order-oriented copy.
  // Surfacing it verbatim told customers a recharge failed before they paid.
  for (const message of [
    'The recharge has failed',
    'the recharge has failed, please try again',
    'Recarga falhou',
  ]) {
    const out = classifyVerifyFailure({ status: 20003, message });
    assert.ok(!/recharge|recarga/i.test(out), `leaked provider text for: ${message}`);
    assert.strictEqual(out, GENERIC);
  }
});

test('maps player-not-found responses to an actionable message', () => {
  assert.strictEqual(
    classifyVerifyFailure({ status: 20001, message: 'role does not exist' }, true),
    'Player not found. Check your User ID and Zone ID.'
  );
  assert.strictEqual(
    classifyVerifyFailure({ status: 20001, message: 'user does not exist' }, false),
    'Player not found. Check your User ID.'
  );
});

test('maps product/config errors to the unavailable message', () => {
  assert.strictEqual(classifyVerifyFailure({ status: 20007, message: 'anything' }), UNAVAILABLE);
  assert.strictEqual(classifyVerifyFailure({ status: 400, message: 'product does not exist' }), UNAVAILABLE);
  assert.strictEqual(classifyVerifyFailure({ status: 400, message: 'invalid product' }), UNAVAILABLE);
});

test('falls back to the generic message for empty or unknown bodies', () => {
  assert.strictEqual(classifyVerifyFailure({}), GENERIC);
  assert.strictEqual(classifyVerifyFailure(null), GENERIC);
  assert.strictEqual(classifyVerifyFailure({ status: 500, message: 'internal error' }), GENERIC);
});

test('reads the alternate msg field', () => {
  assert.strictEqual(
    classifyVerifyFailure({ status: 20001, msg: 'role does not exist' }, true),
    'Player not found. Check your User ID and Zone ID.'
  );
});

// Mirror of isMlbbGameCode in ../index.js — gates the free region lookup so it
// only fires for Mobile Legends product codes.
function isMlbbGameCode(value) {
  return /^mobilelegends$/i.test(String(value ?? '').trim());
}

test('isMlbbGameCode only matches the mobilelegends code', () => {
  assert.strictEqual(isMlbbGameCode('mobilelegends'), true);
  assert.strictEqual(isMlbbGameCode('MobileLegends'), true);
  assert.strictEqual(isMlbbGameCode(' mobilelegends '), true);
  for (const bad of ['mobilelegends_pass', 'ml', 'honkaibr', '', null, undefined, 123]) {
    assert.strictEqual(isMlbbGameCode(bad), false, `should not match: ${bad}`);
  }
});

// Mirrors of normalizeRegionKey / regionIsBlocked in ../index.js — the free
// lookup returns country NAMES ("Indonesia"), config stores codes ("ID"), and
// both must match in either direction.
const REGION_NAME_TO_CODE = {
  indonesia: 'ID',
  brazil: 'BR',
  malaysia: 'MY',
  singapore: 'SG',
  philippines: 'PH',
  russia: 'RU',
  'russian federation': 'RU',
  india: 'IN',
  japan: 'JP',
  france: 'FR',
  turkmenistan: 'TM',
  thailand: 'TH',
  vietnam: 'VN',
  taiwan: 'TW',
  'south korea': 'KR',
  korea: 'KR',
};

function normalizeRegionKey(value) {
  const s = String(value ?? '').trim();
  if (!s) return null;
  return REGION_NAME_TO_CODE[s.toLowerCase()] ?? s.toUpperCase();
}

function regionIsBlocked(country, list) {
  if (!country || !Array.isArray(list) || list.length === 0) return false;
  const keys = new Set([normalizeRegionKey(country), String(country).trim().toUpperCase()]);
  return list.some(
    (entry) => keys.has(normalizeRegionKey(entry)) || keys.has(String(entry).trim().toUpperCase())
  );
}

test('country names from the lookup match configured ISO codes', () => {
  assert.strictEqual(regionIsBlocked('Indonesia', ['ID', 'BR']), true);
  assert.strictEqual(regionIsBlocked('Brazil', ['ID', 'BR']), true);
  assert.strictEqual(regionIsBlocked('India', ['ID', 'BR']), false);
  assert.strictEqual(regionIsBlocked('Turkmenistan', ['ID', 'BR']), false);
});

test('codes match codes regardless of case or whitespace', () => {
  assert.strictEqual(regionIsBlocked('id', ['ID']), true);
  assert.strictEqual(regionIsBlocked(' ID ', ['id']), true);
  assert.strictEqual(regionIsBlocked('MY', ['my', 'sg', 'ph', 'id', 'ru']), true);
});

test('config may also use full country names', () => {
  assert.strictEqual(regionIsBlocked('ID', ['Indonesia']), true);
  assert.strictEqual(regionIsBlocked('Indonesia', ['Indonesia', 'Brazil']), true);
});

test('missing or empty region never blocks', () => {
  assert.strictEqual(regionIsBlocked(null, ['ID']), false);
  assert.strictEqual(regionIsBlocked('', ['ID']), false);
  assert.strictEqual(regionIsBlocked(undefined, ['ID']), false);
});

test('missing or empty blocklist never blocks', () => {
  assert.strictEqual(regionIsBlocked('Indonesia', []), false);
  assert.strictEqual(regionIsBlocked('Indonesia', null), false);
  assert.strictEqual(regionIsBlocked('Indonesia', 'ID'), false);
});

test('unmapped countries compare uppercase so both sides stay consistent', () => {
  // A country the map doesn't know falls back to its uppercased name —
  // config written as the same name still matches.
  assert.strictEqual(regionIsBlocked('Kazakhstan', ['KAZAKHSTAN']), true);
  assert.strictEqual(regionIsBlocked('Kazakhstan', ['KZ']), false);
});
