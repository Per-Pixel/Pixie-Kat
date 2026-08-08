# Last Summary

## Session: Block orders on insufficient Smile Points / missing Provider Product ID

### Problem
User/admin orders were going through to the SmileCoin provider even when the merchant account had no Smile Points, and fulfillment silently delivered the **lowest** provider product (cheapest denomination) instead of the product the customer paid for.

### Root cause — two combined bugs in `main/server/index.js` `/api/fulfill-order`
1. **No points/balance pre-flight.** `createorder` was called with no check against the merchant Smile Points balance. The `querypoints` endpoint existed and was shown in admin, but never consulted in the fulfillment path.
2. **Silent cheapest-SKU fallback.** When a product had no `provider_product_id` (the GameEditor field is optional), `resolveScProductId()` picked `productlist.data.product[0].id` — the first/lowest SKU — and fulfilled against it. The same fallback also ran as a retry when the configured productid failed. Last session's price-mismatch refund only reacts *after* the wrong cheap item is already delivered to the player's account (can't be un-delivered).

### Fix (both conditions: auto-refund & fail, per user decision)
`main/server/index.js`:
- Added pure helpers after `resolveScProductId`: `resolveOrderProductId`, `extractPointsBalance`, `extractSkuPrice`, `pointsDeficiency`, and async `preFlightPointsCheck(product, productid)`.
  - `resolveOrderProductId` returns the configured provider product id or **null** (never falls back to productlist[0]); rejects `'1'` placeholder and whitespace.
  - `pointsDeficiency` is **fail-closed** on zero/insufficient balance, **fail-open** when balance or cost can't be determined (so a transient provider query error doesn't block every order).
- Rewrote the SmileCoin branch of `/api/fulfill-order`:
  - Requires a valid provider product id; throws a clear "set provider_product_id in admin GameEditor" error otherwise.
  - Runs `preFlightPointsCheck` before `createorder`; throws on insufficient points.
  - Deleted the productlist fallback and the retry-with-resolved-productid block (same lowest-SKU bug).
- Both throws land in the existing catch block (lines ~1068+), which already calls `refund_wallet_order` (or fallback `adjust_wallet_balance`) and marks the order `failed`. Customer wallet is refunded; order does not reach the provider.

### Regression tests
`main/server/tests/fulfill-order.price.test.js` — added 4 tests mirroring the pure helpers (7 total, all passing):
- `resolveOrderProductId` never falls back to placeholder/lowest SKU.
- `extractPointsBalance` handles flat, nested, and zero balances.
- `extractSkuPrice` matches SKU by id and parses price.
- `pointsDeficiency` blocks zero/insufficient, fails open on unknown.

### Verification
- `node --check main/server/index.js` → SYNTAX_OK
- `node --test tests/fulfill-order.price.test.js` in `main/server` → 7/7 pass, 0 fail

### Git + deploy
- Two separate commits (previous session's refund UI + this session's guard) on both `admin` and `main` branches.
- Both branches pushed to `origin` (GitHub `Per-Pixel/Pixie-Kat`).
- **Deployed `main/server` to AWS Elastic Beanstalk** (`pixiekat-api-prod`, `ap-south-1`) via `eb deploy`. Health check confirmed live.
- Frontend (`main` + `admin`) auto-deploys via AWS Amplify on git push.

### Follow-up
- The `resolveScProductId` cheapest-SKU fallback is intentionally **kept** for `verify-player` (read-only player probe) — only removed from `fulfill-order`.
- Audit existing products in admin GameEditor and backfill `provider_product_id` for any SmileCoin products missing it; otherwise those orders will now (correctly) auto-refund-and-fail until fixed.
- Test live: place an order with insufficient Smile Points — should now auto-refund and fail instead of delivering the cheapest SKU.
