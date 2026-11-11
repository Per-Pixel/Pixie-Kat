# Last summary — Pixie-Kat

## 2026-11-11 — Amplify media cutover + order payment copy

- Pushed `admin` (`ae29f34`) and merging to `main` so both Amplify branches build. App env now has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the public-media sync. Live custom rules allow webp/mp4/webm instead of rewriting them to `index.html`.
- Storefront serves `/img`, `/videos`, `/audio` from Amplify. Admin orders explain paid vs unpaid.
- API did not change, so no Elastic Beanstalk deploy.
