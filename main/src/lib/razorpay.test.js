import { describe, it, expect } from 'vitest';
import { loadRazorpayCheckout } from './razorpay';

describe('Razorpay Checkout loader', () => {
  it('rejects outside a browser environment', async () => {
    await expect(loadRazorpayCheckout()).rejects.toThrow('Razorpay Checkout is only available in a browser.');
  });
});
