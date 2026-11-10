# Last summary — Pixie-Kat

## 2026-11-10 — Kagura Exclusive Offer → CMS

- Removed hardcoded `KAGURA_LEGEND_PROMO` from `ExclusiveOffers.jsx`; grid uses `promotional_items` (+ optional JJK homepage placement).
- Migration `059_kagura_exclusive_offer.sql` applied to prod: **Kagura Legend · draw plan** at `sort_order` 0.
- Admin: **Pages → Homepage → Exclusive Offers** — edit image, link, flag `EVENT`, active, schedule.
