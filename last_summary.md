# Last Summary

## Session: Commit + push verify-player LAN fix and Diamond Pass stacking

- Committed the prior session's work on `main` in three focused commits and pushed to `origin/main`:
  - `fix(storefront)`: `src/lib/apiBase.js` falls back to same-origin `/api` in dev when the page host is non-loopback but `VITE_API_BASE_URL` is loopback; all fetch call sites use it. Vite configs gained `fs.strict: false` and a wider `optimizeDeps.include`.
  - `fix(server)`: verify-player `resolveScProductId` uses the `fetchProviderPointsSnapshot` fallback chain, prefers non-pass SKUs for getrole, treats status 207 as a config error, and evicts the cached SKU when verification is unavailable.
  - `feat(cart)`: `STACKABLE_PATTERN = /diamonds?\s*pass/i` exempts Weekly Diamond Pass from the once-per-account cap (client `productAccountLimit` + server `cartProductAccountLimit`); `metadata.max_per_account` still overrides.
- Changelog: three bullets added under Unreleased → Fixes (Diamond Pass stacking, verify-player robustness, LAN dev API proxy).
- Tests re-verified before commit: storefront vitest 40/40, server `node --test` 53/53.
- **Prod fix**: hosted API still showed "verification unavailable" because `eb deploy` is manual — EB was running `app-260927` (pre-fix). Deployed `app-260928_155840657803` (Ready/Green); live `POST /api/verify-player` for `mobilelegends` now returns "Player not found" (real provider rejection) instead of "unavailable".
- Infra audit (was chasing "hosted API on HTTP"): real topology is browser → same-origin `/api` → **Amplify 200-rewrite** → existing API Gateway proxy `c4pmcbw502.execute-api.ap-south-1.amazonaws.com/prod` → EB (HTTP). `amplify.yml` forces `VITE_API_BASE_URL=/api` at build, so no mixed-content issue exists. Verified live: Amplify `/api/health` + `/api/verify-player` return correctly.
- `pixiekat.com` is **not registered** (RDAP 404) — site is on `*.amplifyapp.com` subdomains; `api.pixiekat.com` impossible until purchased. EB env is single-instance (no ALB for ACM). CloudFront creation blocked: "account must be verified" (AWS Support console step for user). When domain exists: CloudFront alt-domain or LB+ACM.
- Changed EB `NODE_ENV` development → **production** (env updated, Green). This also enabled the intended `CORS_ORIGINS` allowlist (dev mode only allowed localhost/LAN).
- Housekeeping: deleted a second API GW proxy I briefly created (`vxiug2m6s5`) since `c4pmcbw502` already existed; set Amplify `VITE_API_BASE_URL` fallback to the existing GW URL; redeployed `main` + `admin` branches. AWS_DEPLOYMENT.md updated with real topology.
- **SECURITY**: Amplify `VITE_SUPABASE_ANON_KEY` is a **service_role JWT**, not an anon key — full RLS bypass shipped to every browser. User must swap in the real anon key and rotate the service-role key.
- Reminder: GitHub push deploys only the Amplify frontend; backend changes need `eb deploy` from `main/server`.

### Carried pending items

- Replace the service-role JWT in Amplify `VITE_SUPABASE_ANON_KEY` with the real anon key; rotate the exposed service-role key.
- Register `pixiekat.com`, then front API with `api.pixiekat.com` (CloudFront once account verified, or LB+ACM).
- Inspect the malformed EB environment property and verify `SUPER_ADMIN_EMAILS`. Prior product backlog remains documented elsewhere.
