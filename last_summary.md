# Last summary — Pixie-Kat

## 2026-11-11 — Order payment clarity + UPI QR copy

- Admin Orders, Manual Orders, and the order drawer now explain payment in plain language (`explainOrderPayment`): unpaid checkout vs paid-but-not-delivered vs paid-then-delivery-failed vs 24h auto-close.
- Storefront UPI (game, cart, add-money) shows a note to save the QR, pay, and stay on the page. Waiting copy is amber, not a red error. Removed the stale “online payments unavailable” line on game checkout and cart.
- Supabase egress cutover from earlier today is still unpushed: Amplify needs `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` on main.
