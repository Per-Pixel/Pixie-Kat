import { describe, expect, it } from 'vitest';
import { explainOrderPayment, isAbandonedUnpaidCheckout } from './orderPaymentStory';

describe('explainOrderPayment', () => {
  it('treats a pending UPI checkout as unpaid', () => {
    const story = explainOrderPayment({ status: 'pending', payment_method: 'aluu' });
    expect(story.verdict).toBe('unpaid');
    expect(story.title).toBe('Not paid yet');
  });

  it('says a 24h expiry was never paid', () => {
    const story = explainOrderPayment({
      status: 'failed',
      payment_method: 'aluu',
      metadata: { payment_expired: true, expire_reason: 'unpaid_after_24h' },
    });
    expect(story.verdict).toBe('unpaid');
    expect(story.title).toMatch(/never paid/i);
  });

  it('says a failed delivery was still paid', () => {
    const story = explainOrderPayment({
      status: 'failed',
      payment_method: 'aluu',
      payment_id: 'utr_1',
      metadata: { fulfill_error: 'provider timeout' },
    });
    expect(story.verdict).toBe('paid');
    expect(story.detail).toMatch(/provider timeout/);
  });

  it('treats processing as paid and waiting for delivery', () => {
    const story = explainOrderPayment({
      status: 'processing',
      payment_method: 'wallet',
      payment_id: 'wallet',
    });
    expect(story.verdict).toBe('paid');
    expect(story.title).toMatch(/not delivered/i);
  });

  it('treats a failed UPI row with no payment as an unpaid attempt', () => {
    const story = explainOrderPayment({ status: 'failed', payment_method: 'aluu' });
    expect(story.verdict).toBe('unpaid');
    expect(story.title).toBe('Unpaid attempt');
    expect(isAbandonedUnpaidCheckout({ status: 'failed', payment_method: 'aluu' })).toBe(true);
    expect(isAbandonedUnpaidCheckout({ status: 'completed', payment_method: 'aluu', payment_id: 'utr' })).toBe(false);
  });
});
