# Last Summary

## Session: push broken-path fixes, hide Google button

### Done

- **Pushed the 7 broken-path commits to `origin/main`** (`9059b00..c2ab301`): hygiene, membership-grant trigger (038), support inbox (039), password reset + TOTP 2FA + verification resend, games quick actions, test isolation, docs.
- **Hid the Google sign-in button** in `main/src/pages/auth/index.jsx` (button, "Or continue with" divider, `handleGoogleLogin` removed) — commit `773ec5a`, pushed. Re-add is trivial if Google OAuth is ever configured.
- **Committed + pushed the site-graphics-admin + Pinterest work** (`8106845`, 29 files, +3608/−3249). It had been left uncommitted after a reset of `main`; now landed. `eb deploy` to `pixiekat-api-prod` run for the new `main/server/pinterest.js` + routes.
- **Fixed the real domain**: production site is `https://pixiekat.store` (not `.com` — `.com` only appears in docs/tests/defaults). Supabase Auth configured by user: Site URL `https://pixiekat.store/`, redirects `pixiekat.store/**`, `admin.pixiekat.store/**`, `localhost:5173/**`. Forgot-password now lands on the live reset page.

- **Notification email pipeline built and live** — migration `040_notification_outbox.sql` (outbox table + trigger on orders.status enqueuing processing/completed/failed/refunded rows), `main/server/notifications.js` (nodemailer transporter, branded templates, `isKindEnabled` toggle check, claim-and-send worker with retry), login alerts enqueued inside `/api/auth/login-session`. `eb deploy` done; SMTP_* env vars pushed to EB from local `.env` via `eb setenv`; EB log confirms `[notify] outbox worker started`. Server tests 53/53 (10 new). nodemailer ^7 added to main/server.

- **Site preferences now sync to the account** — root cause of "settings reset on refresh": `pixie_preferences` lived only in localStorage (per-browser, per-origin — `pixiekat.store` vs the Amplify domain don't share it). Migration `041` adds `user_settings.site_preferences` JSONB; `PreferencesContext` hydrates from it on login (remote wins; first login uploads device prefs as baseline) and serializes writes so rapid toggles can't stale-write. Logged-out behaviour unchanged (localStorage).

### Pending / user-side

- Apply migration `041_user_site_preferences.sql` in Supabase SQL editor for account-synced site prefs.
- EB housekeeping spotted: an env property appears mangled (`...fill the PORT = 3001` — stray text in the name); check Configuration → Software → Environment properties. `SUPER_ADMIN_EMAILS` still points at `admin@pixiekat.com` (auth email, may be intentional — verify it's your admin login).
- ~~Hostinger SMTP~~ — done everywhere: Supabase Auth SMTP (`smtp.hostinger.com:465`, sender alias `noreply@pixiekat.store`, auth as `admin@pixiekat.store` mailbox) AND EB `SMTP_*` env vars set via `eb setenv` — worker confirmed running in EB logs.
- Migration `040_notification_outbox.sql`: user says applied (alongside 038 + 039).
- Open product work unchanged: standalone membership purchase, email/SMS sender, Promo/Blog stubs, Refer & Earn, Dark Mode/Compact View, `products.amount` labels, footer socials, legal copy, `admin/.env` history.

---

## Prior session: Site graphics admin + Pinterest import (SHIPPED as 8106845)

### Done

- **`/storage` is now placement-first.** The default "Site graphics" view (`admin/src/pages/storage/StoragePage.tsx` + `buildSiteGraphicPlacements` in `mediaService.ts`) lists every storefront graphic by page → section → slot with a preview, live flag, and a source descriptor. The editor shows current vs new preview and accepts an upload, a `public-media` pick, or a Pinterest pin — then saves only that placement.
- **Safe saves.** `saveGraphicPlacement` re-reads `store_settings`, merges only the nested path, and writes behind an `updated_at` match; products-carousel defaults hydrate before editing a slide; `games`/`products`/`promotional_items` updates apply only while the stored URL still matches what the editor saw. Stale editors get a refresh error instead of clobbering newer work.
- **Media files view** is a simple gallery (linked/unlinked filters, per-file exact usage, delete blocked until usage verifies); folder tree, bulk ops, and converters live under "Advanced tools".
- **Pinterest import restored without the old open proxy.** `PinterestImportPanel` has two modes — `placement` (one pin → staged File in the editor) and `library` (up to 20 links, select/deselect, save to a folder or ZIP). Server side is `main/server/pinterest.js` behind `POST /api/admin/pinterest/resolve|download` (admin-gated, rate-limited, Pinterest-hosts-only, per-redirect revalidation, size cap, thumbnail fallback). The old branch's importer (`41f8bbd` on `admin`) was used as reference only — no merge, no public CORS proxies.
- **Storefront wiring** (`appearance_settings.site_graphics` via `siteGraphicUrl()`): Promotion background + 3 cards, Contact's four artworks, Features videos, hero card videos, and the built-in Trending/Exclusive fallback cards now take admin overrides; DB-backed fields (hero settings, about, promo items, games, products, JJK event, branding) were already in the catalogue. Layout/GSAP untouched — values only. `Story.jsx` is unused, skipped.

### Verified (before the reset)

- `admin`: `tsc -b` clean, vitest 14/14, eslint 0 errors, `vite build` ok.
- `main`: vitest 39/39, eslint 0 errors, `vite build` ok.
- `main/server`: `node --test` 43/43 (incl. Pinterest host restriction, redirect validation, HTML-masquerade, size cap).
- `npm audit`: 0 vulnerabilities in `admin`, `main`, `main/server`. Vitest must stay on 5.x + vite 6 — vitest 3.x breaks on the `~` in this path.

### Not done / follow-ups

- No live browser QA — `agent-browser` CLI isn't installed; admin `vite dev` 403s on this Windows path, so preview via `vite preview` after a production build.
- Pinterest private/sign-in-only boards correctly return 422; that's expected, not a bug.
