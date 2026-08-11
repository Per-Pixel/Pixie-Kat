# Last Summary

## Session: Local dev cleanup and port hardening

- Verified the previous fixes in `admin/.env` and `main/server/index.js` are still in place; no code reversion.
- Confirmed the original intermittent "broken after restart" behavior was caused by stale `node.exe`/`vite` processes left running on `3001`, `5173`, and `5174`.
- Cleaned up leftover Node processes and restarted the local stack.
- Fixed the malformed first line and `VITE_MAIN_SITE_UR` typo in `main/server/.env`.
- Pinned dev server ports so `npm run dev:all` no longer races for `5173`:
  - `main/vite.config.js` now serves on `5173`
  - `admin/vite.config.ts` now serves on `5174`
  - `main/server/index.js` already runs on `3001`
- Verified `dev:all` is running with the expected ports: main `5173`, admin `5174`, backend `3001`.
