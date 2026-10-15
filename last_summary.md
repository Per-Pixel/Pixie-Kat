# Last Session Summary

## Exclusive Offers homepage fix — APPLIED TO DB (2026-10-15)

- Grid had duplicated MLBB cards sharing art, Magic Chess on
  `promotion/eternal.webp`, PUBG on an anime-street hero card, a fake
  "Hero Special Top Up" card, half the cards with no `link_url`, and the
  🇮🇳 flag rendering as bare "IN" text on Windows.
- `supabase/migrations/051_exclusive_offers_fix.sql` (applied via
  `npx supabase db query --linked --file`) rewrote all 8 rows with real
  bucket art + `link_url`/`game_id`; dup slot → Honkai: Star Rail, slot 8
  → BGMI UC Top Up. Component fallback + admin `fallbackExclusive` mirror
  the same 8; PROMO pill → brand yellow-300, flag → dark pill, grid
  `grid-cols-3 sm:grid-cols-4` (8 items → balanced 4+4).
- Real bug fixed in both ExclusiveOffers and TrendingGames: promo with
  `game_id` but no `link_url` built `/games/<uuid>` → 404 (route param is
  a slug). Fallback is now plain `/games`.

## "Unknown account" wallet mystery — admin fixes (2026-10-15)

- Reported: Satyam's wallet activity showed "Unknown account", now shows
  his name; old entries unviewable.
- Verified: his data is fully intact — 1 profile (role=user), 8 orders,
  12 wallet txs, all linked. His 4 credits are manual admin "Add"
  adjustments; NO `wallet_topup` orders exist yet (044 flow unused so far).
- Root cause in `admin/src/pages/Wallets.tsx`: Recent Wallet Activity
  resolves names via a map built ONLY from `role IN ('user','reseller')`
  profiles. The admin account owns 1287 wallet txs → excluded → every one
  renders "Unknown account", and `onClick={() => profile && navigate(...)}`
  made unresolved rows dead clicks. Fix: feed names resolve across all
  profiles (fetched by tx user_ids), rows always navigate on tx.user_id,
  unknown rows show `Unknown account · <id8>`.
- `admin/src/pages/Orders.tsx` had `.limit(500)` — silently hides orders
  past the cap (1264 exist; Satyam's oldest is rank ~310, visible now but
  doomed). Replaced with `.range()` paging loop (20k safety bound) so
  search/sort/CSV cover the full table.
- If Satyam's rows specifically showed Unknown earlier: name resolution is
  per-load — during the 018/019→026/029 RLS-helper breakage window admin
  couldn't read other profiles. Everything of his resolves today.

## Carried forward / pending
- Working tree has prior uncommitted work (trending images, gamesData,
  DropdownMenu) + this session's changes. Nothing committed/pushed.
- JJK promo can prepend a 9th Exclusive card → grid reads 4+4+1.
- MCGG/BGMI card art is low-res squares — acceptable, could re-upload.
- `videos/pixiekat-portal-hop/` 9:16 render still not built.
- Game art remains publisher IP — flag before paid-ad distribution.
