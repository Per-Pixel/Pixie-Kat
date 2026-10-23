# Last Session Summary

## Bulk MLBB manual orders fulfilled (2026-10-23, fired 13:31)

Ran a one-off batch of 26 WhatsApp-style MLBB orders through SmileCoin
`createorder` (`product=mobilelegends`, BR catalog) via new throwaway script
`main/server/scripts/bulk-mlbb-orders.mjs` (`--verify` / `--points` / `--fire`).

- SKU map used: WDP = `16642` (Passe Semanal de Diamante), 55 Diamonds =
  `22590`, 275 Diamonds = `22592`. "2xWDP + 55" and "4xWDP + 110" are combos —
  expanded to units (110 = 2×55).
- Pre-fire `--verify` (free nickname/region lookup + getrole): all 26 uid+zone
  pairs verified OK — regions India mostly, one Myanmar, one UK. None skipped.
- All 65 createorder calls returned status=200 at 13:31–13:34.
- Smile Points balance: 6186.6 → 1091.6 (≈5095 pts spent; points ≠ USD 1:1).

## Yokcash order path fixed (2026-10-23)

`/api/yokcash/order` was dead on prod: `YOKCASH_ALLOW_TEST_ORDER` was literally
`false` in EB env props → every call hit the 403 dry-run, no debit. Flipped to
`true` via `aws elasticbeanstalk update-environment` (env Green/Ready).

Proven with test order on owner account `124242796|2623`:
`ORDER1792749105589VQ5` — `MLGLB86YCGG` (86💎 Global) → **success**, ~19.5k IDR
debited. Prior attempt `ORDER17927490293013SX` (`689` = 5💎 Indonesia) auto-
refunded: `Region/Server Tidak Didukung`.

Key catalog fact: Yokcash MLBB is region-split. Mini packs (5/11/22💎) exist
ONLY for Indonesia (`689`, `ML*`) and Philippines (`MLONLYPH_*`, `ML*PH`). For
non-ID/PH accounts use **Mobile Legends Global** (`MLGLB*YCGG` min 86💎,
`WDPX1-5GLBYCGG`, `FTMLYCGB*`) or Brazil (`*BRYC`, `WDPBRYC`). Region mismatch
auto-refunds.

## mlbb-mini-packs wired to Yokcash auto-fulfill (2026-10-23)

`games.provider` flipped `manual`→`yokcash`; each product's
`provider_product_id` now holds a Yokcash **Philippines S1** service code:
5💎→`MLONLYPH_5_S1` (1,785 IDR), 11💎→`MLONLYPH_11_S1` (3,100),
22💎→`MLONLYPH_22_S1` (6,107). `cost_price` updated to IDR-derived INR
(₹9.5/16.5/32.5 → margins ₹5.5/11.5/25.5). Seed script updated to match —
re-running it will NOT revert to manual.

Region finding: Indonesia SKUs (`689`, `1598`) auto-refund
"Region/Server Tidak Didukung" on India accounts; Philippines S1 + Global
catalogs deliver fine.

E2E proven: stuck wallet order `6b98db50` (368071017|9710, India) fulfilled
through prod `/api/fulfill-order` → Yokcash `ORDER17927498005032HM` →
status `success` (RefId LAND261023L5E2J2S33P), DB order `completed`.

Note: `/api/yokcash/order` requires `YOKCASH_ALLOW_TEST_ORDER=true` (now set
on EB) AND the target must be in `YOKCASH_TEST_TARGETS` — that route is for
manual tests only. Real orders flow through `/api/fulfill-order`, which has
no allowlist.

## Carried over (still pending)

- `videos/pixiekat-portal-hop/` 9:16 render not built.
- MCGG/BGMI card art low-res.
- Open media slots: `contact_left_bottom`, `contact_right_back`,
  `contact_right_front`, products slider images.
- Seed scripts still do raw product deletes — will fail on games with
  orders if re-run (left as-is).
- Someday: `VALIDATE` the two NOT VALID constraints from 052; arm the
  010 protect_*_on_update triggers intentionally.
- Going live: `rzp_live` keys + webhook secret +
  `ONLINE_PAYMENTS_ENABLED` flip + apply 055 + confirm SUPER_ADMIN_*
  env on EB. Crypto top-up client (aluu.js) still not wired into
  index.js endpoints.
