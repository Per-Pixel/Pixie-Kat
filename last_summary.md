# Last Session Summary

## Online payments kill switch (2026-10-08)

- Root cause of "fake payments get real orders": `main/server/.env` (and likely
  the deployed EB env) uses a `rzp_test_` Razorpay key, so test-mode payments
  pass signature verification, flip orders to `processing`, and get delivered.
- `main/server/index.js`: added `ONLINE_PAYMENTS_ENABLED = false` +
  `ONLINE_PAYMENTS_MESSAGE`. Non-wallet methods now return 503 in
  `/api/place-order` (also blocks the arbitrary-method pending-order branch),
  `/api/cart-checkout`, and `/api/membership/purchase`; `/api/wallet/topup` is
  closed entirely (gateways only). Verify/webhook/check endpoints unchanged so
  genuinely-paid pending orders still settle. Flip the flag to re-enable.
- Storefront: `GamePage.jsx` and `cart/index.jsx` payment selectors now list
  Pixie Wallet only (+ short "temporarily unavailable" note);
  `AddMoneyPage.jsx` shows a top-ups-disabled notice, disables the pay button,
  and hides the gateway membership purchase (wallet purchase stays).
- CHANGELOG gained an Unreleased Payments bullet.

## Verification

- `main/server`: `npm test` 63/63 passed; `node --check index.js` clean.
- `main`: `npm test` 53/53 passed; `npm run build` passed; targeted ESLint on
  changed files clean; `git diff --check` clean.

## Repo state

- Committed + pushed as `fix(payments): disable online gateways over
  test-mode key abuse`, preceded by `feat(admin): image editor for storage
  assets` (previous session's verified work).
- `supabase/.temp/` remains an unrelated untracked artifact.
- IMPORTANT: the API runs on Elastic Beanstalk (`npm run deploy` in
  `main/server`) — push alone does NOT redeploy; the kill switch is live only
  after `eb deploy pixiekat-api-prod`. Frontend also needs its usual deploy.
- Follow-up: switch Razorpay/Aluu to live keys, then flip
  `ONLINE_PAYMENTS_ENABLED` back to true; audit recent `processing`/`completed`
  orders with test `pay_*` ids for fraudulent deliveries.
