# Last Summary

## Session: AWS deployment fixes pushed

- Pushed commit 3d6472d to origin/main.
- Updated main and admin Supabase config diagnostics and admin login flow.
- AWS Amplify should auto-rebuild both apps from the main branch.
- Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in each Amplify app, plus VITE_API_BASE_URL in admin.
- Vite bakes env vars at build time, so redeploy after setting them.
- Admin login: Amplify Basic Auth first, then Supabase email/password.
- Supabase admin user needs profiles role admin/support and status active.
