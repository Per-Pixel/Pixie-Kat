import { test } from 'node:test';
import assert from 'node:assert';

// Mirror of classifyVerifyFailure in ../index.js
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
