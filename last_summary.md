# Last Summary

## Session: Commit + push verify-player LAN fix and Diamond Pass stacking

- Committed the prior session's work on `main` in three focused commits and pushed to `origin/main`:
  - `fix(storefront)`: `src/lib/apiBase.js` falls back to same-origin `/api` in dev when the page host is non-loopback but `VITE_API_BASE_URL` is loopback; all fetch call sites use it. Vite configs gained `fs.strict: false` and a wider `optimizeDeps.include`.
  - `fix(server)`: verify-player `resolveScProductId` uses the `fetchProviderPointsSnapshot` fallback chain, prefers non-pass SKUs for getrole, treats status 207 as a config error, and evicts the cached SKU when verification is unavailable.
  - `feat(cart)`: `STACKABLE_PATTERN = /diamonds?\s*pass/i` exempts Weekly Diamond Pass from the once-per-account cap (client `productAccountLimit` + server `cartProductAccountLimit`); `metadata.max_per_account` still overrides.
- Changelog: three bullets added under Unreleased → Fixes (Diamond Pass stacking, verify-player robustness, LAN dev API proxy).
- Tests re-verified before commit: storefront vitest 40/40, server `node --test` 53/53.

### Carried pending items

- Inspect the malformed EB environment property and verify `SUPER_ADMIN_EMAILS`. Prior product backlog remains documented elsewhere.
