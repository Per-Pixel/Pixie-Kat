# Last session summary

- **Auth hardening (local, not deployed)**: `safeRedirectPath` for post-login redirects; register stays on the page when email confirmation is required; shared `validatePassword`; `POST /api/auth/login-session` accepts `used_2fa`; storefront and admin record login history only after MFA AAL is complete. Docs: `SUPABASE_SETUP.md` production checklist, `main/server/README.md` no longer describes SQLite auth.
- **Tests**: `main` vitest `safeRedirectPath.test.js` — 3 passed.
