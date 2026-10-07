# Last Session Summary

## Seeded 5 new game pages (prod, applied 2026-10-06)

Script: `main/server/scripts/seed-new-games.mjs` (idempotent, `--apply` writes).
SQL capture: `supabase/migrations/046_new_games_seed.sql`. Images uploaded to
`public-media` bucket under `img/games/` + `img/products/` via service role.

- `/games/starlight` — "Hayabusa Starlight – Kitsune's Shadow", cloned from
  kazukiofficialstore.com (game id 146): icon+banner+2 pack images, gifting
  copy/how-to steps, Normal ₹279 / Premium ₹669, `provider=manual`.
- `/games/honor-of-kings` — `provider=yokcash`, 10 packs mapped to `HOKYC*`
  service ids. Kazuki's prices were BELOW Yokcash cost — user chose cost+15%
  (IDR→INR 0.005385): ₹18–₹9,238; compare_price = Moogold regular.
- `/games/genshin-impact` + `/games/genshin-impact-usa` — split of the old
  "Genshin Impact INDIA/USA" promo card. India: Yokcash `GIYC*` auto-fulfill,
  Moogold retail ₹99–₹9,900 (~7% margin). USA: Chronal Nexus names,
  `provider=manual` (moogold variation ids in metadata), cost=sell for now.
- `/games/bgmi` — `provider=yokcash`, PUBGYC60/325/660/1800/3850/8100 at
  cost+15%: ₹102–₹9,939. Moogold has no BGMI product.
- Promo cards wired: trending BGMI/Genshin/HOK + new "Genshin Impact USA" card;
  exclusive Starlight/Genshin/HOK now link to real pages; starlight card uses
  the Kazuki image.

## Provider notes

- Yokcash catalog fetched via prod API gateway + minted admin token
  (`node scripts/mint-admin-token.mjs`): `GET /prod/api/yokcash/services`.
  Kazuki sell < Yokcash cost on every HOK pack — Kazuki sources elsewhere.
- Kazuki storefront API: `api-staging.kazukiofficialstore.com/api/storefront/`
  `games?country_id=1` (list, numeric id), `packages?country_id=1&game_id=N`.
- Moogold product pages embed `data-product_variations` JSON (INR geo-served).
- `game_fields.options` is NOT NULL — always pass `[]` for text fields.
- Genshin-USA margin is zero (cost=sell); revisit if it stays manual.
- Removed the See All/Show Less toggle from `/games` grid (`GameGrid.jsx`) —
  all active games render directly now.
- `mobile-legends-global` set to `status='inactive'` (hidden from storefront)
  and its trending promo card deactivated. Products/orders kept; reactivate or
  hard-delete in admin if needed.
- Changelog updated. Not committed — no push authorization.
