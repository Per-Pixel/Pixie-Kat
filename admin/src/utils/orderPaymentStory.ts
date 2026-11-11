export type PaymentVerdict = 'paid' | 'unpaid' | 'refunded';

export interface OrderPaymentStory {
  verdict: PaymentVerdict;
  /** Short label for the table, e.g. "Not paid yet". */
  title: string;
  /** One sentence explaining what the customer did. */
  detail: string;
}

type OrderLike = {
  status?: string | null;
  payment_method?: string | null;
  payment_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

function meta(order: OrderLike): Record<string, unknown> {
  return order.metadata && typeof order.metadata === 'object' ? order.metadata : {};
}

function methodLabel(method: string | null | undefined): string {
  const key = String(method || '').toLowerCase();
  if (key === 'aluu' || key === 'upi') return 'UPI';
  if (key === 'wallet') return 'Pixie Wallet';
  if (key === 'razorpay') return 'Razorpay';
  return method?.trim() || 'the checkout';
}

function isWallet(method: string | null | undefined): boolean {
  return String(method || '').toLowerCase() === 'wallet';
}

function hasPaymentRecord(order: OrderLike): boolean {
  return Boolean(order.payment_id && String(order.payment_id).trim());
}

export function isAbandonedUnpaidCheckout(order: OrderLike): boolean {
  const status = String(order.status || '').toLowerCase();
  if (status !== 'failed' && status !== 'cancelled') return false;
  if (order.payment_id && String(order.payment_id).trim()) return false;
  const method = String(order.payment_method || '').toLowerCase();
  if (!['aluu', 'upi', 'razorpay'].includes(method)) return false;
  const data = meta(order);
  if (typeof data.fulfill_error === 'string' && data.fulfill_error.trim()) return false;
  return true;
}

/**
 * Plain-language read of whether this order was paid, for the admin order lists.
 * Status alone is not enough: `failed` can mean "never paid" or "paid, then delivery broke".
 */
export function explainOrderPayment(order: OrderLike): OrderPaymentStory {
  const status = String(order.status || '').toLowerCase();
  const how = methodLabel(order.payment_method);
  const data = meta(order);
  const paidRecord = hasPaymentRecord(order) || isWallet(order.payment_method);
  const fulfillError = typeof data.fulfill_error === 'string' ? data.fulfill_error.trim() : '';
  const unpaidExpiry = data.payment_expired === true || data.expire_reason === 'unpaid_after_24h';
  const gatewayFailed = String(data.aluu_status || '').toUpperCase() === 'FAILED' && !hasPaymentRecord(order);

  if (status === 'refunded') {
    return {
      verdict: 'refunded',
      title: 'Paid, then refunded',
      detail: `Money came in via ${how} and was later returned.`,
    };
  }

  if (status === 'pending') {
    return {
      verdict: 'unpaid',
      title: 'Not paid yet',
      detail: isWallet(order.payment_method)
        ? 'The order is waiting. Wallet payment is not confirmed.'
        : `They started a ${how} checkout. No payment has been confirmed, so do not deliver this.`,
    };
  }

  if (status === 'cancelled') {
    return {
      verdict: paidRecord && hasPaymentRecord(order) ? 'paid' : 'unpaid',
      title: paidRecord && hasPaymentRecord(order) ? 'Cancelled after payment' : 'Cancelled — not paid',
      detail: paidRecord && hasPaymentRecord(order)
        ? `A ${how} payment was recorded, then the order was cancelled.`
        : 'The checkout was cancelled before payment.',
    };
  }

  if (status === 'failed') {
    if (unpaidExpiry) {
      return {
        verdict: 'unpaid',
        title: 'Failed — never paid',
        detail: `They opened ${how} and did not pay. After 24 hours the unpaid checkout was closed automatically.`,
      };
    }
    if (gatewayFailed) {
      return {
        verdict: 'unpaid',
        title: 'Failed — payment rejected',
        detail: `The ${how} payment failed or the QR expired. No money arrived.`,
      };
    }
    if (fulfillError && (hasPaymentRecord(order) || isWallet(order.payment_method))) {
      return {
        verdict: 'paid',
        title: 'Paid — delivery failed',
        detail: `Money was received via ${how}. Sending the top-up failed: ${fulfillError}`,
      };
    }
    if (hasPaymentRecord(order)) {
      return {
        verdict: 'paid',
        title: 'Paid — order then failed',
        detail: `A ${how} payment is on file, then the order was marked failed. Check the note before refunding or resending.`,
      };
    }
    if (!hasPaymentRecord(order) && !isWallet(order.payment_method)) {
      return {
        verdict: 'unpaid',
        title: 'Unpaid attempt',
        detail: `No money arrived on this row. If another row for this pack says Paid, that one is the real order — this attempt was left unfinished.`,
      };
    }
    return {
      verdict: 'unpaid',
      title: 'Failed — not paid',
      detail: `The ${how} checkout did not finish. There is no payment on this order.`,
    };
  }

  if (status === 'processing' || status === 'on_hold') {
    return {
      verdict: 'paid',
      title: status === 'on_hold' ? 'Paid — on hold' : 'Paid — not delivered yet',
      detail: isWallet(order.payment_method)
        ? 'Wallet was charged. The top-up still needs to be sent.'
        : `${how} payment is confirmed. Deliver this order — money is already in.`,
    };
  }

  if (status === 'completed') {
    return {
      verdict: 'paid',
      title: 'Paid and delivered',
      detail: `Payment via ${how} is done and the order is complete.`,
    };
  }

  return {
    verdict: paidRecord ? 'paid' : 'unpaid',
    title: paidRecord ? 'Payment recorded' : 'Payment unknown',
    detail: paidRecord
      ? `A ${how} payment is on file. Status is “${status || 'unknown'}”.`
      : `No payment is recorded. Status is “${status || 'unknown'}”.`,
  };
}
