# Last summary — Pixie-Kat

## 2026-11-12 — Revenue matches Orders page

- **User truth**: Revenue → **Orders** (completed sales, Internal toggle) is the reference; SQL `get_admin_analytics` always excluded admin orders and ignored Internal.
- **Change**: Dashboard, Analytics, Sales overview now use `rollupOrderMetrics` on the same order list + filters (defaults **Internal: On** like Orders). Dashboard dropped the separate analytics API for headline KPIs/trends.
- **Still align manually**: Orders defaults **Lifetime** period; Dashboard **7d**, Analytics/Sales **30d** — pick the same period on each page when comparing totals.
