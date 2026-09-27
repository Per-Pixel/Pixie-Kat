# Changelog

## [Unreleased]

### Fixes
- Grant purchased membership plans once the order is paid — checkout charged the plan add-on but never activated it (`038_membership_grant_on_paid_order.sql` trigger on `orders.status`; cancelled again if the order is refunded/failed).
- Persist support/contact form submissions to `support_requests` (`039_support_requests.sql`) instead of silently discarding them, and wire the admin Messages page to the real inbox with status triage.
- Add forgot-password flow: reset link from the login page and a `/reset-password` page to set a new password.
- Wire the Google sign-in button to `signInWithOAuth`, then hide the button until OAuth credentials are configured.
- Add user-facing TOTP 2FA: enroll/verify/disable at `/account/security/two-factor` and an authenticator-code step during login when an account has 2FA on.
- Resend the email-verification link from the Security page instead of a dead card.
- `/games` quick actions: "Purchase" opens order history; "Payments" and "Refer & Earn" show a coming-soon note instead of doing nothing.
- Send real notification emails — `notification_outbox` (040) queues order status events and login alerts via a trigger + `/api/auth/login-session`; the API worker sends them over SMTP honouring the existing Settings toggles (email/order notifications, login alerts). Requires migration 040 + SMTP_* env vars.
- Sync site preferences (intro/music/reduced motion) to `user_settings.site_preferences` (041) so they follow the account across browsers, devices, and domains instead of being localStorage-only.

### Admin
- Rebuild `/storage` around a placement-first "Site graphics" workspace: browse graphics by page → section → slot with previews, then upload a file, pick from `public-media`, or import from Pinterest and save just that placement — other spots using the same file stay unchanged.
- Per-placement saves merge the latest `store_settings` row behind an `updated_at` guard, hydrate default products-carousel slides before editing one, and row-level updates (games/products/promos) only apply while the current image still matches, so a stale editor cannot silently overwrite newer work.
- Keep the raw library as a secondary "Media files" view with a simple gallery (linked/unlinked filters, exact usage per file); folder tree, bulk actions, and conversion tools move behind "Advanced tools". Deleting is blocked while usage cannot be verified.
- Add Pinterest import: paste pin/board links, preview extracted images and videos, save selected files to the library or a ZIP, or apply one pin straight to the placement being edited. Fetching is server-side (`/api/admin/pinterest/*`), admin-only, rate-limited, and restricted to Pinterest page/media hosts with per-redirect validation and size/content-type checks.

### Storefront
- Hardcoded homepage graphics are now admin-editable through `appearance_settings.site_graphics`: promotion background and the three promo cards, contact artworks, feature videos, hero card videos, and the built-in Trending/Exclusive fallback cards (used only until live promo items exist).

### Repository
- Remove scratch artifacts (`Test/` harness, temp backup/seed scripts, stale AWS log, stray screenshot) and stop tracking `admin/.env`.
- Make the super-admin server test independent of the local `.env`.
- Clear all `npm audit` findings across `admin`, `main`, and `main/server`: remove the mistaken `tailwind` (event-sourcing) dependency from `main`, bump `vite` 5→6 and `vitest` 1→5 and `react-router-dom` 6→7 in `main`, and pin a safe `qs` via `overrides` in `main/server`.

### Payments
- Add Aluu Pay (UPI Gateway) as a second payment provider alongside Razorpay.
- Add `main/server/aluu.js` with `createOrder`, `checkOrderStatus`, and HMAC-SHA256 webhook verification.
- Add `place-order` branch for `payment_method=aluu`, `/api/aluu/check-payment` polling endpoint, and `/api/webhooks/aluu` webhook handler.
- Add "UPI Gateway" payment method card to the game checkout with redirect-and-poll flow.
- Add `aluu_order_id` column to `orders` (migration `035_aluu_checkout.sql`) and surface it in order details and hooks.
- Add multi-item cart checkout (`POST /api/cart-checkout`) where one wallet debit, Razorpay order, or Aluu payment covers the whole cart via `metadata.payment_group_id`.
- Add `/api/razorpay/verify-cart-payment`, `/api/aluu/check-cart-payment`, and Razorpay/Aluu webhook fallbacks that resolve and confirm whole payment groups.
- Add `place_cart_orders` and `place_wallet_cart` RPCs (migration `036_cart_checkout.sql`) for atomic multi-order placement and a single wallet debit.

### Tests
- Add server unit tests for Aluu order creation, status checks, and webhook signature verification.
- Add Vitest coverage for cart rules: 10-unit cap, per-account pass limits, and account-target keying.

### Storefront
- Replace the fullscreen menu with a scroll-synchronized typography carousel and video-card deck, with restrained parallax, keyboard controls, and touch access.
- Add account Site Preferences (background music, intro animation, reduced motion) persisted per device via `pixie_preferences` in `localStorage`.
- Add a device-local cart (`/cart`, `CartContext` + `pixiekat_cart` storage) with navbar badge, game-page "Add to Cart", and wallet/Razorpay/UPI checkout.
- Cap cart lines at 10 units per product and enforce per-account limits on passes/bundles (name pattern or `products.metadata.max_per_account`) keyed by User ID + Server ID — the same product can be re-added for a different account, and the rules are re-checked server-side at checkout.

## [1.0.0] - 2026-08-26

### Security
- Remove default `admin@pixiekat.com` super-admin fallback.
- Add server startup env validation and fail-fast for missing `FRONTEND_URL`, `CORS_ORIGINS`, and Supabase credentials.
- Remove `http://localhost:3001` and `http://localhost:5173` fallbacks from admin API client, session telemetry, and server password-reset redirect.

### Admin
- Make Settings page persist all tabs (store, payment, notifications, security) to `store_settings`, `admin_notification_settings`, and `admin_security_settings`.
- Wire user Security tab to backend: disable 2FA, force logout, change email, reset password.
- Wire user KYC tab to `user_kyc`: tier, identity/address/phone status, and admin notes.
- Add `terser` to admin build to drop `console` calls and split vendor chunks.

### Storefront
- Replace hardcoded `you@example.com` / `98765 43210` placeholders on game support form.

### Tests
- Add server regression tests for env validation and super-admin lookup.
- Add Vitest to `main` and `admin` with smoke tests for Razorpay loader and API base URL.

### Repository
- Start `CHANGELOG.md`.
- Bump `main` and `admin` package versions to `1.0.0`.
