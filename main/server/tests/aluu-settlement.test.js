import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paidAmountMatches, statusOrderIdMatches } from '../aluu-settlement.js';

test('paidAmountMatches tolerates Aluu decimal formatting', () => {
  assert.equal(paidAmountMatches(155, '155.000000'), true);
  assert.equal(paidAmountMatches(85, '85.000000'), true);
  assert.equal(paidAmountMatches(155, '84.9'), false);
});

test('statusOrderIdMatches accepts merchant or provider ids', () => {
  const order = {
    id: 'pixie-uuid',
    aluu_order_id: 'aluu-int',
    metadata: { aluu_order_id: 'aluu-int' },
  };
  assert.equal(statusOrderIdMatches({ orderId: 'pixie-uuid' }, 'pixie-uuid', order), true);
  assert.equal(statusOrderIdMatches({ orderId: 'aluu-int' }, 'pixie-uuid', order), true);
  assert.equal(statusOrderIdMatches({ orderId: 'other' }, 'pixie-uuid', order), false);
});
