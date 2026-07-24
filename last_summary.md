# Last Summary

## Session: Fix blank pages on AWS Amplify deployment

- Fixed `main/index.html`:
  - Removed broken `/src/index.css` preload/stylesheet link (Vite already injects the bundled CSS).
  - Removed the `esm.sh` importmap, which pointed to React 19 while the project depends on React 18.
- Updated `amplify.yml`:
  - Added SPA catch-all rewrite rules for both `main` and `admin` apps so React Router `BrowserRouter` routes serve `index.html` instead of returning 404.
- Verified both `main` and `admin` build successfully and their `dist/index.html` files reference the correct hashed JS/CSS assets.
- Local `vite preview` returns HTTP 200 for both root pages.

## Next steps for the user

1. Commit and push these changes to the branch connected to Amplify.
2. In each Amplify app, ensure environment variables are set:
   - `main`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - `admin`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`
3. Trigger a redeploy in Amplify (a new push will do this automatically).
4. After deploy, open the browser dev tools and share any console errors if the pages are still blank.
