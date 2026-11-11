# Last summary — Pixie-Kat

## 2026-11-11 — Meta ad visit tracker

- Dashboard card “Meta ad visits” counts storefront landings with `fbclid` or a Facebook/Instagram campaign. Ads Manager’s earlier taps are not in the database.
- `060_site_visits.sql` is applied. API `POST /api/track-visit` is deployed. Storefront beacon ships with the Amplify `main` build; the card ships with `admin`.
- Name campaigns with `utm_source=meta&utm_campaign=...` on the ad URL.
