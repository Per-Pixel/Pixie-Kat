# Last Session Summary

## Yokcash: real purchase confirmed + MY/PH MLBB storefront games shipped

### Part 1 — Real purchase (earlier this session)
- Yokcash recovered from a full-infra 523 outage. Full test loop run against
  prod: health `connected:true` (saldo 574,440 IDR, IP 35.154.145.21),
  services 5,729 items, real order `ML5YCBPK` (5 Diamonds, ID region) →
  invoice `ORDER1791022121656MM7` → status **success**, saldo → 572,839
  (1,601 IDR charged). Target `189676589|2985` = Applledogㅊ (NOT user's
  account — a leftover test uid).
- `YOKCASH_ALLOW_TEST_ORDER` flipped back to `false` after the test.

### Part 2 — MY + PH MLBB small packs (this session)
User asked for Malaysia + Philippines small packs on website + admin.

**DB (prod, via Supabase MCP):**
- `ALTER TYPE game_provider ADD VALUE 'yokcash'` (migration
  `add_yokcash_to_game_provider_enum`).
- New games (provider `yokcash`, provider_game_code `mobilelegends` — drives
  the free MLBB region/nickname lookup in verify-player):
  - `mobile-legends-malaysia` id `7fec7d39-507c-4b35-87eb-3b80455018a0`,
    region `my`, blocked_regions all-known-except-MY
  - `mobile-legends-philippines` id `ef9ba33d-e228-4423-9233-1767dbecdf89`,
    region `ph`, blocked_regions all-known-except-PH
- `game_fields` user_id + zone_id copied for both.
- 12 products (INR, ~2x markup on IDR cost, `provider_cost_idr` in metadata):
  - MY: ML14MY ₹45, ML28MY ₹89, ML42MY ₹129, MLWEBMY ₹169, ML70MY ₹199,
    ML112MY ₹329 — note smallest MY denomination is 14💎 (none smaller exists)
  - PH: ML5PH ₹19, ML11PH ₹35, ML22PH ₹69, MLWEBPH ₹149, ML56PH ₹169,
    ML112PH ₹299
- Skipped "First Top Up" variants — they fail delivery if customer already
  claimed the bonus.

**Code:**
- `main/server/index.js` — new `game.provider === 'yokcash'` branch in
  /api/fulfill-order: service_id ← provider_product_id, target
  `userId|zoneId`, kontak ← order contact whatsapp, `idtrx: PK-<orderId>`
  (provider-side dedupe). status:true → completed; status:false → throw →
  auto-refund; transport throw → uncertain → completed+warning. Deployed via
  `eb deploy` (clean).
- `admin/src/services/catalogService.ts` — GameProvider += 'yokcash'.
- `admin/src/pages/products/GameEditor.tsx` — Yokcash option in provider
  dropdown. tsc clean.

### CRITICAL provider truth learned (test order `ORDER1791023297803UBO`)
**Yokcash accepts ANY target — no upfront validation.** A synthetic order
with target `0|0` was accepted, invoiced, charged (1,733 IDR), and sat at
status `paid`. Typos = money gone to whoever owns that ID. The storefront's
verify-player nickname display is the ONLY pre-purchase guard — customers
must check the shown nickname. Region gating (blocked_regions) prevents
wrong-region buys when verify ran.

### Part 3 — Test-target lock + double-confirm guard (user's own account)
User's real MLBB account: `124242796|2623` = **EagleEye44**, region **India**
(SmileCoin getrole actually succeeds for India-region — source:smilecoin).
No India-specific Yokcash MLBB exists — only `Mobile Legends Global`
services can deliver there (cheapest: MLBBLTVP_GLB 4,605 IDR list).

- `main/server/index.js` `/api/yokcash/order` — test orders now pinned to
  `YOKCASH_TEST_TARGETS` (comma-separated allowlist, default
  `124242796|2623`). Wrong target → 403 with explanation. Proven live:
  `999999999|9999` refused; `124242796|2623` accepted.
- fulfill-order idtrx changed `PK-<orderId>` → plain `<orderId>` — the
  /api/webhooks/yokcash route looks up `orders.id` by idtrx, so the prefix
  would have broken callback matching.
- `GamePage.jsx` — yokcash-provider games get a second confirm step in the
  review modal: Confirm & Pay → "Review Account →" → red FINAL CHECK panel
  (target ID|Zone + nickname/region, "wrong ids cannot be refunded",
  unverified warning when no nickname) → red "Yes — Send Diamonds" → pay.
  eslint clean. **Needs a main-app deploy (Amplify git push) to go live** —
  main/src changes are not on EB.
- Real test to user's account: MLBBLTVP_GLB → `124242796|2623` → invoice
  `ORDER1791024335664O4J`, charged 4,429 IDR, status `processing` (supplier
  queue — pack orders are slower than diamonds). Saldo now 566,677 IDR.
- `YOKCASH_ALLOW_TEST_ORDER` back to `false` after tests.

### Yokcash status vocabulary (observed)
`pending` → `paid` → `success`/`cancel`/`refund`. `paid` = charged, queued
for delivery.

### Verified
- Catalog API live: both games + products + fields via prod gateway.
- verify-player on new games: ID test account → nickname + region
  "Indonesia" (correctly blocked from MY/PH packs).
- fulfill-order dispatch: synthetic ₹0 wallet order → Yokcash invoice
  created, order marked completed with invoice in metadata.
- Yokcash saldo now: 571,106 IDR.

### Still open / latent
- Synthetic test order `cc3de9d1-…` (metadata.synthetic_dispatch_test) stays
  `completed` — delete it in admin if it pollutes order lists.
- `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` one-off in web.stdout.log —
  `app.set('trust proxy',…)` deserves a look.
- Health endpoint returns Cloudflare HTML as `server_ip` when checkIp()
  gets a non-IP body — validate the body looks like an IP.
### Part 4 — Mobile Legends (Global) game added
- `mobile-legends-global` id `e3677054-94ec-4d4f-bdb4-00e5196e25d0`,
  provider `yokcash`, provider_game_code `mobilelegends`, region `gl`,
  **no blocked_regions** (Global services deliver to all regions incl.
  India — the user's own EagleEye44 account can buy here).
- Small/mini lineup only (Global has no sub-86💎 diamond packs):
  MLBBLTVP_GLB ₹45, MLWEB_GLB ₹139, SVPGLB ₹149, MLGLB86YCGG ₹199,
  WDPX1GLBYCGG ₹249, MLGLB172YCGG ₹399.
- Live on catalog API immediately (data-only change, no deploy needed).
- Gets the Yokcash double-confirm automatically (provider check).

### Final game lineup (4 MLBB games)
- `mobile-legends` — SmileCoin, all regions except ID/BR (existing)
- `mobile-legends-malaysia` — Yokcash, MY-region accounts only
- `mobile-legends-philippines` — Yokcash, PH-region accounts only
- `mobile-legends-global` — Yokcash, all regions, small/mini packs

### Part 5 — Commits pushed + migration 044 applied
- `f378671` feat(yokcash): fulfillment branch, test-target lock, double
  confirm, admin store page — pushed to origin/main.
- `5b8c939` feat(wallet): committed the other agent's complete WIP —
  AddMoneyPage rewrite (1–10,000 coin top-up via Razorpay/UPI + standalone
  membership purchase), pricing-page "Choose" → add-money#membership,
  supabase-admin phone field, migration 044 file + CHANGELOG entry.
  Reviewed before committing: coherent complete feature, eslint clean.
- **Migration 044 applied to prod** — verified deps first
  (user_memberships.source_order_id, wallet_transactions, user_activity_log,
  trg_orders_sync_membership all exist). Functions
  fulfill_paid_service_order + purchase_membership_with_wallet (service_role
  only) and trigger trg_orders_zzz_service_fulfillment confirmed live.
- Working tree clean, main in sync with origin.
- Amplify auto-builds on push — double-confirm + wallet page go live with it.

### Still open / latent
- Synthetic test order `cc3de9d1-…` (metadata.synthetic_dispatch_test) stays
  `completed` — delete it in admin if it pollutes order lists.
- `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` one-off in web.stdout.log —
  `app.set('trust proxy',…)` deserves a look.
- Health endpoint returns Cloudflare HTML as `server_ip` when checkIp()
  gets a non-IP body — validate the body looks like an IP.
- Migration 044 still not applied in prod DB; no commits made.
- GamePage.jsx double-confirm is uncommitted — needs commit + Amplify push.
- Consider a Yokcash status-poller/reconciler: our orders say `completed`
  at acceptance; provider `cancel`/`refund` later needs manual check via
  /api/yokcash/status (their callback is "SOON" per docs, not live).
- SmileCoin getrole fails for non-BR accounts (expected — BR provider);
  MY/PH games rely on the free MLBB lookup for nickname/region. Same UX as
  the existing game for out-of-region players.
