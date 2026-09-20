# Last Summary

## Session: Storefront cart with per-account limits and multi-provider checkout

Added a real cart to the main storefront (`/cart`) — device-local, works for guests, login required only at checkout. One payment (Pixie Wallet, Razorpay, or Aluu/UPI) covers the whole cart.

### Rules implemented

- **10-unit cap** per cart line (`MAX_ITEM_QUANTITY` in `main/src/lib/cart.js`, mirrored as `CART_MAX_LINE_QTY` server-side).
- **Per-account limits**: passes/bundles/subscriptions detected by name regex (`bundle|pass|subscription|weekly|monthly`) or explicit `products.metadata.max_per_account`/`purchase_limit` are capped per game account — same User ID + Server ID can't exceed the cap, but the product can be re-added for a different account. Enforced in `lib/cart.js` AND re-checked in `/api/cart-checkout` so client tampering can't bypass it.
- Account target is derived from `account_fields` via alias lists (`user_id|userid|player_id|account_id|uid` + `zone_id|server_id|zoneid|server`).

### Frontend

- `main/src/lib/cart.js` — pure domain logic: `addToCart` (merge/clamp/reject), `productAccountLimit`, `accountKeyFromFields`, storage (`pixiekat_cart`), pending-checkout marker (`pixiekat_pending_checkout`, 30-min TTL) for redirect resilience. 16 tests in `cart.test.js`.
- `main/src/contexts/CartContext.jsx` — provider + `useCart()`, cross-tab sync via `storage` events. Mounted inside `PreferencesProvider` in `App.jsx`.
- `main/src/pages/cart/index.jsx` — cart page in landing/pricing design language (PageWrapper, AnimatedTitle "your cart", dark rounded panel, violet-300 summary card, yellow-300 CTA). Per-line qty stepper / "Limit N per account" pill, account chips, member-discount-aware totals, three payment methods, contact fields, live per-line fulfillment status, pending-payment resume banner, mixed-currency block.
- `GamePage.jsx` — "Add to Cart" button beside "Review & Pay" + cart icon in `MobileCheckoutBar`; validates required account fields first; success/error notice with "View Cart" link (inline + mobile fixed toast).
- `Navbar.jsx` — cart icon with unit-count badge for all users; `MoreMenu.jsx` + `DropdownMenu.jsx` — cart entries for mobile.

### Backend (`main/server/index.js`)

- `POST /api/cart-checkout` — expands quantity into one order per unit (fulfill-order provisions one unit per order row); shares `metadata.payment_group_id` (uuid) across the group. Validates products active, games active, single currency, per-account limits, line/unit caps (25 lines / 50 units). Sanitizes item metadata to an allowlist. Wallet → `place_wallet_cart` RPC; razorpay/aluu → `place_cart_orders` (pending orders) then one provider payment keyed to the group id; provider order ids stored in order `metadata` (unique columns stay single-order).
- `POST /api/razorpay/verify-cart-payment` + `POST /api/aluu/check-cart-payment` — group confirmation: signature/status checks, amount-vs-sum-of-orders, marks all pending group orders `processing`.
- Razorpay + Aluu webhook fallbacks resolve `metadata->>payment_group_id`/`razorpay_order_id`/`aluu_order_id` when the single-order column lookup misses.
- `crypto` import added; endpoint list in file header updated.

### Database

- `supabase/migrations/036_cart_checkout.sql` — `place_cart_orders(p_user_id, p_payment_method, p_currency, p_items)` returns `uuid[]` of pending orders; `place_wallet_cart(p_user_id, p_currency, p_items)` locks profile once, validates every unit via `validate_order_amount`, debits grand total, writes one `wallet_transactions` row per order. Both service_role-only, 50-unit cap, 100-orders/min spam ceiling (per-order 20/min cap doesn't apply — a cart is one action).

### Verified

- `npm test`: 36/36 pass · `npm run build`: ok · `node --check server/index.js`: ok · scoped ESLint: 0 errors (2 benign warnings)
- Playwright smoke on `/cart`: empty state, seeded 2-line cart, limit pill, account chips, total math, navbar badge=4, guest login gate, zero page errors.
- Pre-existing unrelated failure: `tests/supabase-admin.test.js` super-admin test — `dotenv.config()` reloads `SUPER_ADMIN_*` from local `.env` after the test deletes them; environmental, not from this change.

### Not done / follow-ups

- Migration 036 written but **not applied** to a live Supabase instance — needs `supabase db push` (or manual apply) before cart checkout works end-to-end.
- No real payment flow tested (needs live Razorpay/Aluu + Supabase).
- `/batch-order` untouched (admin trial page).
