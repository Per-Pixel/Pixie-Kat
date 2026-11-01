# PixieKat API server

Node/Express API for privileged Supabase operations, payments, and provider fulfillment. Customer sign-up and sign-in go through **Supabase Auth** in the storefront (`main/`) and admin app (`admin/`), not through this process.

Auth setup, production URL allowlists, email confirmation, and password settings: see [`SUPABASE_SETUP.md`](../../SUPABASE_SETUP.md) at the repo root.

## Setup

1. Install dependencies:

   ```bash
   cd main/server
   npm install
   ```

2. Copy `.env.example` to `.env` and set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and the other provider secrets listed there. The service role key stays on the server only.

3. Start the server:

   ```bash
   npm start
   ```

   Or for development with auto-reload:

   ```bash
   npm run dev
   ```

The server listens on `http://localhost:3001` by default.

## Auth-related API

- `POST /api/auth/login-session` — Record a successful sign-in for the authenticated user (JWT required). Optional JSON body `{ "used_2fa": true }` after authenticator verification. Login history is written only after MFA is complete when the client gates the call on assurance level.

Protected routes verify the Supabase JWT with `supabase.auth.getUser` and require an active `profiles` row. Admin and super-admin routes also check role.

## Payments

- `POST /api/place-order` - Create a wallet, Razorpay, or Aluu order for an authenticated user
- `POST /api/razorpay/verify-payment` - Verify Razorpay Checkout's signed payment response
- `POST /api/webhooks/razorpay` - Receive signed `payment.captured` events from Razorpay
- `POST /api/webhooks/aluu` - Receive signed Aluu payment webhooks
- `POST /api/fulfill-order` - Deliver a confirmed order through the configured provider

Razorpay order creation and signature verification require `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Configure the Razorpay Dashboard webhook URL as `<API_ORIGIN>/api/webhooks/razorpay` and set its signing secret as `RAZORPAY_WEBHOOK_SECRET`. `RAZORPAY_SUPPORTED_CURRENCIES` defaults to `INR`; add another currency only after enabling it on the Razorpay account and configuring matching product prices.

Aluu UPI uses `ALUU_USER_TOKEN` and `ALUU_WEBHOOK_SECRET`. Webhook URL: `<API_ORIGIN>/api/webhooks/aluu`.

## Data

Application data lives in Supabase (Postgres + Auth + Storage), not a local SQLite file. Apply SQL from `supabase/migrations/` as described in `SUPABASE_SETUP.md`.

## Production

Deploy with `npm run deploy` from this directory (`eb deploy pixiekat-api-prod`). Set production `FRONTEND_URL` and `CORS_ORIGINS` on the Elastic Beanstalk environment. Do not put the service role key in the frontend.
