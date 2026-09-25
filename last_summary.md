# Last Summary

## Session: Repo hygiene + fix broken storefront paths

### Done

- **Hygiene** (`49e70b4`): deleted `Test/` scratch harness, `aws_errors`, `tmp-ml-after.png`, `main/server/tmp-*.{json,mjs}`, `main/scripts/tmp-jjk-layout-shot.mjs`; untracked `admin/.env` (was committed before .gitignore covered it — file stays on disk, still ignored).
- **Membership grant bug** (`6634cb6`, migration `038`): orders could bill a plan add-on via `metadata.pricing.selected_membership_plan_id` but nothing inserted `user_memberships`. New trigger `sync_membership_from_order` on `orders.status` grants on 'processing'/'completed' (covers wallet RPC inserts and Razorpay/Aluu pending→processing flips) and cancels on 'failed'/'refunded'/'cancelled'. Idempotent via unique partial index on `source_order_id` + already-active guard.
- **Support forms** (migration `039` + both pages): `GetSupportPage`/`ContactUsPage` were fake submits — now insert into `support_requests` (anon/authenticated insert RLS, user reads own, admin reads/updates). Admin `Messages.tsx` rewritten from hardcoded mock to the real inbox: search, status filter, expand, mark open/resolved, mailto reply.
- **Forgot/reset password**: dead `href="#"` link → inline forgot mode on auth page (`resetPasswordForEmail` → `/reset-password`); new `ResetPasswordPage` handles the recovery session + `updateUser` with the same strength rules as signup.
- **Google OAuth**: dead button wired to `signInWithOAuth` — needs the Google provider enabled in Supabase Auth dashboard.
- **2FA**: new `TwoFactorPage` (`/account/security/two-factor`) — TOTP enroll (QR + manual secret) / `challengeAndVerify` / unenroll via `supabase.auth.mfa`, mirrored into `user_2fa_config`. Login now steps to an authenticator-code screen when `getAuthenticatorAssuranceLevel` says aal2 is required. The looping Security card lands somewhere real.
- **Email verification**: dead `onClick` card on SecurityPage now resends via `supabase.auth.resend`.
- **/games mobile buttons**: Purchase → `/account`; Payments + Refer & Earn → "coming soon" toast (MoreMenu pattern).
- **Server test flake**: `supabase-admin.test.js` deleted env vars, but `dotenv.config()` in the module re-read `.env` on import. Now sets `SUPER_ADMIN_*=''` instead. 36/36 pass.

### Verified

- `main` eslint 0 errors, vitest 36/36, `vite build` ok. `admin` `tsc -b` clean, vitest 3/3, eslint clean. Server `node --test` 36/36.

### Not done / follow-ups

- **Apply migrations 038 + 039 to live Supabase** (SQL editor — same way 036 was applied).
- Supabase Auth config needed: add `${SITE}/reset-password` to Redirect URLs; enable Google provider for OAuth; confirm signup confirmation emails enabled for the resend flow.
- No email/SMS sender exists — `user_settings` notification toggles persist but nothing dispatches (needs a provider; bigger feature).
- Promo/Blog still intentional coming-soon stubs; Dark Mode/Compact View toggles stubbed; `products.amount` still holds machine labels (`Diamond=234+23`).
- Membership is only purchasable as a top-up add-on (`/pricing` "Choose" → `/games`); standalone plan purchase is a design decision.
