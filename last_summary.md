# Last summary — Pixie-Kat

## 2026-11-11 — Meta ad visit tracker

- Dashboard card “Meta ad visits” counts storefront landings with `fbclid` or a Facebook/Instagram campaign. Ads Manager’s 2k taps are not in the database; only page loads after this tracker ships.
- `060_site_visits.sql` is applied on PixieKat. API route `POST /api/track-visit` still needs `eb deploy`. Storefront beacon and admin card need Amplify `main` and `admin`.
- Name campaigns by putting `utm_source=meta&utm_campaign=...` on the ad URL.
