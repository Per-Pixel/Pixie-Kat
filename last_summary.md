# Last summary — Pixie-Kat

## 2026-11-11 — Shipped Amplify media cutover

- Pushed `admin` `ae29f34` and `main` `b454688`. Amplify jobs main **125** and admin **59** both succeeded. Build synced **100** `public-media` objects. Live storefront serves `/img/logo.png`, `/videos/hero-1.mp4`, and webp from CloudFront (200, real content-types), not Supabase.
- Amplify app env has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. App-level rewrite rules allow mp4/webp/webm.
- Supabase project `itwwickxmqpvnssoapuw` still answers (auth 200, orders readable, buckets `avatars`, `media`, `public-media`). The 14 GB cached-egress bill for this period does not reset; restriction date is still 13 Nov unless the plan is upgraded.
- No API deploy. Admin orders now say whether a checkout was paid.
