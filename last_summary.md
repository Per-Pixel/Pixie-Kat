# Last summary — Pixie-Kat

## 2026-11-08 — Admin dashboard profit + UPI labels (deployed)

### What changed
- Dashboard profit uses catalog `cost_price` when orders lack `unit_cost_price`; today's profit vs yesterday uses full comparison window.
- `formatPaymentMethodLabel` shows **UPI** instead of `aluu` on Dashboard, Orders (new Payment column), Manual Orders, Profit & Loss, Analytics payment breakdown, Order drawer, and CSV exports.

### Verification
- `npx vitest run dashboardMetrics.test.ts` — 3 passed; `npm run build` (admin) succeeded.
- Pushed to `origin/admin` for Amplify deploy.

### Prior (API / storefront)
- Aluu QR/UPI orders stuck pending: background `aluu-settlement` reconcile + auto-fulfill on API; storefront polls after payment popup closes. API: `eb deploy` from `main/server`; storefront: Amplify `main`.
