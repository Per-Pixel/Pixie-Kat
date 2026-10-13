# Last Session Summary

## Storefront restored + admin redirect-loop fix + landed pending work (2026-10-13)

- **Root cause of "admin not working"**: the 10-12 maintenance mode set
  APP-LEVEL Amplify custom rules `/<*>` → `/maintenance.html`. They applied to
  the admin branch too, whose build has no `maintenance.html` — Amplify
  clean-URLs turned it into a `301 → /maintenance/` redirect loop. Storefront
  was intentionally on the maintenance page at the same time.
- **Fix**: `aws amplify update-app --app-id d2qve07e257e1q --custom-rules
  file://scripts/restore-rules.json --region ap-south-1` restored the
  `/api/*` proxy + SPA `/index.html` fallback; no rebuild needed (rules are
  edge-level). Verified live: storefront `/` serves the app bundle,
  `admin/` + `admin/login` return the admin SPA, `/api/health` 200.
- `amplify.yml` `redirects:` reverted to the SPA fallback for consistency
  (console rules still win on deploy — yml is documentation, not control).
- Committed + pushed `main`: promotions CMS feature (047 migration was already
  applied to prod — **never `supabase db push`**, see memory.md), rule scripts,
  `supabase/.gitignore` for `.temp/`, and the portal-hop HyperFrames project
  (renders/ tracked per pixiekat-promo convention; `.thumbnails/.hyperframes/
  .media/` ignored). Fresh verification: main 53/53 tests, admin tsc clean +
  18/18 tests.
- `main` merged into `admin` branch + pushed → Amplify builds both apps with
  the promotions UI (`admin` deploy gets MobileTabBar + /pages/promotions).

### Carried forward / pending
- `videos/pixiekat-portal-hop/`: 9:16 `vertical.html` (1080x1920) still not
  built — budget-gated. 16:9 render is final at `renders/portal-hop-16x9.mp4`.
- Studio preview may still run in background: `npx hyperframes preview --status`
  → `--stop` if alive.
- Game art remains publisher IP — flag before paid-ad distribution.
