import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canReusePaymentUrl,
  nextAluuExternalId,
  sameUnpaidAttempt,
} from '../checkout-attempt.js';

const meta = { account_fields: { user_id: '123', zone_id: '456' } };

describe('sameUnpaidAttempt', () => {
  it('matches the same player, pack, and amount', () => {
    const order = {
      status: 'failed',
      product_id: 'p1',
      total_amount: 13,
      payment_id: null,
      metadata: meta,
    };
    assert.equal(sameUnpaidAttempt(order, { productId: 'p1', totalAmount: 13, metadata: meta }), true);
  });

  it('does not match a different player or a paid row', () => {
    const order = {
      status: 'failed',
      product_id: 'p1',
      total_amount: 13,
      metadata: { account_fields: { user_id: '999', zone_id: '456' } },
    };
    assert.equal(sameUnpaidAttempt(order, { productId: 'p1', totalAmount: 13, metadata: meta }), false);
    assert.equal(sameUnpaidAttempt({ ...order, payment_id: 'utr', metadata: meta }, { productId: 'p1', totalAmount: 13, metadata: meta }), false);
  });
});

describe('aluu retry ids', () => {
  it('keeps the provider id within 50 characters', () => {
    const id = nextAluuExternalId('8215e222-1111-2222-3333-444444444444');
    assert.ok(id.length <= 50);
    assert.ok(id.startsWith('8215e222111122223333'));
  });

  it('reuses a fresh pending payment link', () => {
    const now = Date.parse('2026-11-11T10:00:00Z');
    assert.equal(canReusePaymentUrl({
      status: 'pending',
      updated_at: '2026-11-11T09:50:00Z',
      metadata: { aluu_payment_url: 'https://pay.example/qr' },
    }, { now }), true);
    assert.equal(canReusePaymentUrl({
      status: 'failed',
      updated_at: '2026-11-11T09:50:00Z',
      metadata: { aluu_payment_url: 'https://pay.example/qr' },
    }, { now }), false);
  });
});
