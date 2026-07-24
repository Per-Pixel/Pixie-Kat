# Last Summary

## Session: Fix blank pages on AWS Amplify deployment (single-app strategy)

- Fixed `main/index.html`:
  - Removed broken `/src/index.css` preload/stylesheet link (Vite already injects the bundled CSS).
  - Removed the `esm.sh` importmap, which pointed to React 19 while the project depends on React 18.
- Updated `amplify.yml`:
  - Switched from a two-app monorepo spec to a single-app, branch-based build.
  - The `main` branch builds and deploys the `main` app; an `admin` branch builds and deploys the `admin` app.
  - Added SPA catch-all rewrite so React Router `BrowserRouter` routes serve `index.html` instead of returning 404.
- Created and pushed an `admin` branch from the current `main` branch.
- Verified both `main` and `admin` build successfully and their `dist/index.html` files reference the correct hashed JS/CSS assets.
- Local `vite preview` returns HTTP 200 for both root pages.

## Next steps for the user

1. In AWS Amplify, create **one app** from this repo.
2. Connect two branches:
   - `main` → public site
   - `admin` → admin site
3. Set environment variables **per branch** in Amplify:
   - `main` branch: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - `admin` branch: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`, `VITE_APP_NAME`, `VITE_APP_VERSION`, `VITE_MAIN_SITE_URL`
4. Deploy both branches.
5. After deploy, open the browser dev tools and share any console errors if the pages are still blank.

## Note

To keep the admin deployment up to date, merge `main` into `admin` (or recreate `admin` from `main`) after significant changes.
