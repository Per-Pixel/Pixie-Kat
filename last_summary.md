# Last Summary

## Session: Fix RLS recursion on profiles (stack depth limit exceeded)

Admin dashboard on Amplify showed "Could not load dashboard data" with the database error `Profiles: stack depth limit exceeded`.

Root cause: migration `019_security_linter_definitive.sql` converted `is_admin()` and `is_admin_or_support()` from `SECURITY DEFINER` to `SECURITY INVOKER` to silence the Supabase linter. That reintroduced infinite recursion — the `profiles` RLS policy `"admin/support reads all"` calls `is_admin_or_support()`, which reads `profiles`, which evaluates RLS again under INVOKER, which calls `is_admin_or_support()` again, until the stack overflows. Migration `026` only restored anon EXECUTE grants; it did not fix the recursion.

Fix (migration `029_fix_rls_recursion.sql`):
- Restored `SECURITY DEFINER` on `is_admin()` and `is_admin_or_support()` so the inner `profiles` read bypasses RLS and terminates.
- Reaffirmed `EXECUTE` grants to `anon` and `authenticated` on all three RLS helpers.
- Left `can_access_support_conversation()` as `SECURITY INVOKER` (its inner `is_admin_or_support()` is now recursion-safe, and its `support_conversations` read is guarded by `customer_id = auth.uid()`).
- The linter warning is an accepted false positive (already documented in `018`).

Note: this is a DB migration — it must be run in the Supabase SQL editor (or via `supabase db push`) for the live project. The repo only ships the file.

Verification: migration file ships in repo on both `main` and `admin` branches. No frontend code changed; the dashboard query in `reportingService.ts` is correct once RLS stops recursing.
