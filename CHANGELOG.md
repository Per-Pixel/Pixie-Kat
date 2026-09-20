# Changelog

## [Unreleased]

### Payments
- Add Aluu Pay (UPI Gateway) as a second payment provider alongside Razorpay.
- Add `main/server/aluu.js` with `createOrder`, `checkOrderStatus`, and HMAC-SHA256 webhook verification.
- Add `place-order` branch for `payment_method=aluu`, `/api/aluu/check-payment` polling endpoint, and `/api/webhooks/aluu` webhook handler.
- Add "UPI Gateway" payment method card to the game checkout with redirect-and-poll flow.
- Add `aluu_order_id` column to `orders` (migration `035_aluu_checkout.sql`) and surface it in order details and hooks.

### Tests
- Add server unit tests for Aluu order creation, status checks, and webhook signature verification.

### Storefront
- Replace the fullscreen menu with a scroll-synchronized typography carousel and video-card deck, with restrained parallax, keyboard controls, and touch access.
- Add account Site Preferences (background music, intro animation, reduced motion) persisted per device via `pixie_preferences` in `localStorage`.

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
