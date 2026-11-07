# Last session summary

- Verified prod margins: real product sales ~10–13%; inflated ~43–50% on Dashboard when wallet top-ups (e.g. ₹2,470 in 7d) count as zero-COGS profit. Hardened admin metrics (known-cost margin, top-up exclusion, Sales Overview margin formula) and added `probe-profit-margin.mjs`. Migration `058` still needs apply with user consent (`npx supabase db query --linked --yes --file supabase/migrations/058_exclude_wallet_topup_from_analytics.sql`). Admin branch must rebuild for UI fix.
