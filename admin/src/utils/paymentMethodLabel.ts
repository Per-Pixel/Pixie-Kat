const PAYMENT_METHOD_LABELS: Record<string, string> = {
  aluu: 'UPI',
  upi: 'UPI',
  razorpay: 'Razorpay',
  wallet: 'Wallet',
  binance: 'Binance',
  mobikwik: 'MobiKwik',
  paytm: 'Paytm',
};

/** Customer-facing label for stored `payment_method` values (e.g. aluu → UPI). */
export function formatPaymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '—';
  const key = method.trim().toLowerCase();
  return PAYMENT_METHOD_LABELS[key] ?? method;
}
