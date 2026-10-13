# Last Session Summary

## Exclusive Offers reorder — APPLIED TO DB (2026-10-13)

- Live `promotional_items.sort_order` rewritten via
  `supabase/migrations/048_exclusive_offers_order.sql` (`supabase db query
  --linked`): Starlight Pass → Mobile Legends Diamonds → Mobile Legends →
  Honor of Kings → Magic Chess → Genshin → PUBG → Hero Special.
- Mirrored the same order in `main/src/pages/home/sections/ExclusiveOffers.jsx`
  `fallbackExclusiveOffers` and `admin/src/services/mediaService.ts`
  `fallbackExclusive` (position→`exclusive_fallback_N` keys must stay in
  lockstep; list only matters when zero active promo rows exist).
- MLBB group = Diamonds, plain "Mobile Legends", plus Leomord/Melissa in the
  fallback (MLBB heroes). Magic Chess kept separate per request.
- Changelog entry added. Committed locally — pushed only if asked.

## Earlier same session: /games grid subtitle removal — SHIPPED

- `8c39dff` + docs `4474deb` pushed to `main`; small subtitle line under each
  game name removed. Amplify auto-deploys on push.

### Carried forward / pending
- Previous session's media work still uncommitted (game art webp's,
  re-encoded videos, gamesData/TrendingGames/DropdownMenu edits).
- Browser check of Features tile / menu cards not done.
- `videos/pixiekat-portal-hop/` 9:16 render still not built.
- Game art remains publisher IP — flag before paid-ad distribution.
