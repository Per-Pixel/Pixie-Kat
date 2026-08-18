# Last Summary

## Session: Provider price-mismatch — REAL root cause found in prod logs, corrected + deployed

**Trigger.** The "Provider price mismatch — expected 4, got 39" alert kept firing even after the previous session's fix. Investigation of prod EB logs (`eb logs`) overturned the earlier diagnosis.

**What the previous session got wrong.** It assumed `expected_provider_price = 4` was a BRL value stored in `metadata` by migration 026, and "standardized on Smile Points" by making the live productlist price authoritative. **Wrong on two counts**, proven by the logs:
1. The "expected 4" did NOT come from metadata — the log line read `expected provider price 4 (productlist (auto-detected))`, i.e. `metadata.expected_provider_price` was **null** and it fell back to the productlist. And the flagged order `02c81de3` was a **55-Diamond SKU (22590)**, not the Weekly Pass migration 026/030 targets — so the blast radius was every metadata-less product.
2. The productlist fallback was itself the wrong unit. Prod `productlist` response for `mobilelegends` (BR) SKUs has only `price`/`cost_price` in **BRL** (e.g. `{"id":"22590","spu":"...55 Diamond","price":"4.00"}`) — **no Smile Points field exists**. Meanwhile `createorder` returns `price` in **Smile Points** (e.g. `39.0`), confirmed by the merchant Smile Points balance dropping exactly 76 on SKU 16642. BRL vs Smile Points differ by ~9.5x.

So `extractSkuPrice` fed a BRL number into a Smile Points comparison. The intermediate "productlist-first" deploy (commit `4720372`, app `app-260818_124132800888`) made it WORSE by locking the BRL fallback in as authoritative.

**The corrected fix (commit `8d12aa1`, deployed `app-260818_131925792604`, health Ok/Green):**
- `fulfill-order` expected price now comes ONLY from `metadata.expected_provider_price`, which must be in Smile Points (the unit createorder returns). The productlist BRL price is no longer used as an expected value.
- When no Smile Points metadata is set, the substitution check is **skipped silently (log-only)** — no `provider_mismatch` entry is created, so nothing surfaces as a false "substitution" alert in the batch UI (`batch-order/index.jsx` reads `body.mismatch`).
- Real substitution detection still works for products with a Smile Points metadata value: createorder price ≠ expected → flag + proportional refund.
- Corrected comments on `extractSkuPrice` / `preFlightPointsCheck` (productlist price is BRL → the balance-sufficiency check is best-effort; the `balance>0` guard is the meaningful part). Fixed the `GameEditor` help text — it now points to the createorder `price` (test order / Smile One dashboard), NOT the productlist.
- Updated `main/server/tests/fulfill-order.price.test.js` (`resolveExpectedPrice` is now metadata-only) and `Test/mismatch_validation_checklist.txt`.

**Net effect.** No more false "expected 4, got 39" alerts on metadata-less products. Substitution monitoring is now opt-in per product: set `metadata.expected_provider_price` to the SKU's Smile Points cost.

**Verification.** `node --check` OK; `npm test` 14/14 pass. `eb status`/`eb health`: version `app-260818_131925792604`, Status Ready, Ok/Green.

**Still open / follow-ups:**
- [ ] To actually catch substitutions (the original Weekly Pass concern), set `metadata.expected_provider_price` in **Smile Points** on those products. Get the Smile Points cost from a test order's createorder `price` or the Smile One dashboard. Migration 030 is still valid for this but its `WHERE` targets the Weekly Pass by name — verify the BR product name/region actually match (a Portuguese product name would evade `ILIKE '%Weekly Pass%'`).
- [ ] Clear the stale false `provider_mismatch` entries already stored on past orders (they have `refund_amount: 0`, harmless, but they linger in the admin mismatches feed).
- [ ] Known minor unit issue (left as-is, harmless): the pre-flight `pointsDeficiency` balance-vs-cost check compares Smile Points balance to a BRL cost, so it only meaningfully guards `balance<=0`. Fixing it properly needs a Smile Points cost source.
- [ ] Prior-session uncommitted changes still in the working tree (NOT mine, left untouched): `main/server/package.json` + `main/server/scripts/check-deploy-drift.mjs` (deploy tooling), `main/src/pages/batch-order/index.jsx` (gateway non-JSON resilience fix).
- [ ] EB env cleanup + `app.set('trust proxy', 1)` (carried over, unrelated).
