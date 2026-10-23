# Changelog

## [Unreleased]

### Security
- Harden the payment surface ahead of going live: `requireSuperAdmin` now actually checks `isSuperAdmin()` instead of aliasing `requireAdmin`, so change-email, user delete, wallet adjust and provider-order routes are no longer reachable by every admin.
- Aluu settlement now verifies the paid amount server-side: `check-payment`, `check-cart-payment` and the signed webhook all confirm the echoed order id and amount via `checkOrderStatus` before flipping orders to processing (same posture as the Razorpay `assertCapturedRazorpayPayment` path), and cart checkout rejects non-INR Aluu payments.
- Set `trust proxy` so rate limiters key on the real client IP behind the production proxy and login history records it; the Yokcash webhook no longer trusts a client-supplied XFF header.
- `055_lock_order_admin_updates.sql` (applied to prod) pins money/identity/payment columns on the admin order-update RLS policy (status/metadata stay writable) and drops the stale `orders: admin updates any` policy that survived from migration 001 — prod had drifted and the 010 drop never landed, so any admin could previously rewrite an order's owner, product, amount and payment linkage via PostgREST.

### Admin
- Promotions become a first-class CMS section (`/pages/promotions`, `047_promotions.sql`): rich promo cards get slug, description, rich-text details, discount badge and `starts_at`/`ends_at` scheduling — items self-publish and self-hide, the list shows Active/Scheduled/Ended/Hidden badges, and a one-click Duplicate copies any item as a hidden draft.
- Mobile admin gains an app-style bottom tab bar (Home/Orders/Add/Messages/More) with a spring quick-add sheet for one-tap New Promotion, product, game or message, safe-area padding, and fade page transitions.
- Saving a game no longer fails on `orders_product_id_fkey` once it has orders: package saves upsert with stable product ids instead of wipe-and-reinsert, and removing an order-referenced package — or deleting an order-referenced package/game outright — retires it to Inactive rather than erroring, so order history keeps a valid FK target.

### Storefront
- Swap in new animated graphics across homepage slots (hero background, bento tiles, flip/contact cards, contact collage), lazy-load below-fold videos on approach (`LazyVideo` + IntersectionObserver), and preconnect to the media host so graphics load faster.
- Homepage Promotions section is now data-driven from `promotional_items` (the three existing cards are seeded so they stay editable), every card links to a new `/promotions` index and `/promotions/:slug` detail page with the full offer text, end-date badge and Top Up CTA — nav dropdown and More-menu "Promo" entries now open it instead of "coming soon". Requires migration `047_promotions.sql`.

### Fixes
- MLBB Mini Packs now auto-fulfill on payment: the game is wired to Yokcash (Philippines S1 services — Indonesia SKUs refund on region mismatch), so 5/11/22-diamond orders deliver instantly instead of staying `processing` for manual top-up; package costs updated to real provider pricing.
- Checkout UX: the order confirmation now scrolls into view instead of leaving you pinned at the bottom of the collapsed page — on both the cart and the single-game checkout (`orderComplete`), which previously had no scroll correction at all. Route changes jump to the top instantly (the global `scroll-behavior: smooth` turned `scrollTo(0,0)` into an interruptible animated scroll), ScrollTrigger positions refresh after the collapse so the footer reveal still fires, the reveal itself plays once rather than hiding again when page height shifts, and the mobile bottom nav no longer covers the footer links. "Order history" now lands on the Orders section instead of Profile.
- Show the account avatar in the top navbar when logged in, falling back to the profile icon.
- Grant purchased membership plans once the order is paid — checkout charged the plan add-on but never activated it (`038_membership_grant_on_paid_order.sql` trigger on `orders.status`; cancelled again if the order is refunded/failed).
- Persist support/contact form submissions to `support_requests` (`039_support_requests.sql`) instead of silently discarding them, and wire the admin Messages page to the real inbox with status triage.
- Add forgot-password flow: reset link from the login page and a `/reset-password` page to set a new password.
- Wire the Google sign-in button to `signInWithOAuth`, then hide the button until OAuth credentials are configured.
- Add user-facing TOTP 2FA: enroll/verify/disable at `/account/security/two-factor` and an authenticator-code step during login when an account has 2FA on.
- Resend the email-verification link from the Security page instead of a dead card.
- `/games` quick actions: "Purchase" opens order history; "Payments" and "Refer & Earn" show a coming-soon note instead of doing nothing.
- Send real notification emails — `notification_outbox` (040) queues order status events and login alerts via a trigger + `/api/auth/login-session`; the API worker sends them over SMTP honouring the existing Settings toggles (email/order notifications, login alerts). Requires migration 040 + SMTP_* env vars.
- Sync site preferences (intro/music/reduced motion) to `user_settings.site_preferences` (041) so they follow the account across browsers, devices, and domains instead of being localStorage-only.
- Let the Weekly Diamond Pass stack on one game account — MLBB supports multiple active passes, so it now follows the normal per-line quantity cap; Twilight Pass and bundles stay once-per-account, and `/api/cart-checkout` enforces the same rule server-side.
- Make player verification more robust: accept alternate `productlist` response shapes, prefer non-pass SKUs for the role check, treat provider status 207 as a config error, and drop the cached product when verification is unavailable so retries resolve fresh.
- Route storefront API calls through the same-origin `/api` Vite proxy when the dev server is opened from another LAN device, so verification and cart calls reach the backend instead of the device's own localhost (`src/lib/apiBase.js`).

### Admin
- Add a Leaderboard section (`/leaderboard`, `043_leaderboard.sql`): live standings preview with per-user exclusion, one-shot "Finalize month" that freezes `leaderboard_awards`, grants tier perks (`user_perks`), pays PKS wallet bonuses, and queues winner emails via `notification_outbox` — plus a History view of frozen periods and a Settings tab editing `store_settings.leaderboard_settings` (tiers, teaser count, spend visibility).
- User detail Overview gains a Leaderboard card showing recent monthly ranks and active perks, with manual frame/GIF-avatar grants and an exclusion toggle.
- Rebuild `/storage` around a placement-first "Site graphics" workspace: browse graphics by page → section → slot with previews, then upload a file, pick from `public-media`, or import from Pinterest and save just that placement — other spots using the same file stay unchanged.
- Per-placement saves merge the latest `store_settings` row behind an `updated_at` guard, hydrate default products-carousel slides before editing one, and row-level updates (games/products/promos) only apply while the current image still matches, so a stale editor cannot silently overwrite newer work.
- Keep the raw library as a secondary "Media files" view with a simple gallery (linked/unlinked filters, exact usage per file); folder tree, bulk actions, and conversion tools move behind "Advanced tools". Deleting is blocked while usage cannot be verified.
- Add Pinterest import: paste pin/board links, preview extracted images and videos, save selected files to the library or a ZIP, or apply one pin straight to the placement being edited. Fetching is server-side (`/api/admin/pinterest/*`), admin-only, rate-limited, and restricted to Pinterest page/media hosts with per-redirect validation and size/content-type checks.
- Add an image editor to `/storage` asset details with free and preset-ratio cropping, focal-point placement, rotate/flip, tone and blur controls, output preview, same-bucket save-as-copy, and guarded replace-everywhere.

### Storefront
- Add Pixie Wallet top-up on `/games/:game/add-money`: pick 1–10,000 coins (1 coin = ₹1) and pay via Razorpay or UPI — payment confirmation reuses the existing verify/webhook routes, then `trg_orders_zzz_service_fulfillment` (044) credits the balance and closes the order. Membership plans are now purchasable standalone from the same page or the pricing page's "Choose" button — paid from wallet balance via `purchase_membership_with_wallet` or through the gateways, with the 038 grant trigger activating the plan on payment.
- Add a monthly order-count leaderboard at `/leaderboard` — live standings with a top-3 podium, finalized-month archive via `get_leaderboard` RPC (username or masked name + avatar only; spend shown only when admin enables it), a homepage Top-5 teaser, and a rewards explainer — with nav and More-menu entries.
- Account → Rewards becomes "Rewards & Rank": current live rank, active perks (avatar frame, GIF avatar), and a per-month rank history table with movement deltas and Final/Provisional badges; the mobile dashboard shows a rank strip and the same view at `/account?section=rewards`.
- Rank perks are cosmetic + gated: `profiles.avatar_frame` renders a gradient ring on account/leaderboard avatars via `AvatarFrame`, and GIF profile pictures unlock only for tier holders — gated in Edit Profile and enforced by `avatars` storage policies through `user_has_perk()`. Settings gains a "show me on the leaderboard" opt-out toggle (`profiles.leaderboard_opt_out`).
- Recast the leaderboard as a monthly climb across the public board, homepage teaser, and responsive Rewards & Rank, preserving the existing ranking and perk rules.
- Tapping the mobile Pay bar with missing account details now scrolls to and focuses the missing field (ID, email, WhatsApp, or package) and shows an error banner above the bar instead of failing silently — the error used to render only in the off-screen Contact section.
- `/api/verify-player` now returns the MLBB account's country (free Codashop-backed lookup via api.isan.eu.org, 10-min cached, fail-open) on success **and** failure responses; the game page shows "Verified: Name (Country)" or "(Account region: X)" under the error, and stores `verified_region` in order metadata.
- Region-aware checkout blocking: `games.metadata.blocked_regions` rejects all packages for the account's region (MLBB is seeded with `ID` + `BR` via `042_mlbb_blocked_regions.sql`), and `products.metadata.excluded_regions` blocks only that denomination while other packages stay selectable. The detected country is shown as a red (game-level) or amber (denomination) warning under the verify badge, checkout buttons fail with a visible message, and `/api/place-order` + `/api/cart-checkout` enforce the same rules server-side against a sanitized `verified_region`. Unknown regions fail open.
- Rework the Mobile Legends phone layout with a rounded reduced-height game banner, Buy/Guide switch, readable two-column CMS package groups and notes, and a separate how-to view; keep checkout and other games intact while clearing the scroll control from the Pay button.
- Hardcoded homepage graphics are now admin-editable through `appearance_settings.site_graphics`: promotion background and the three promo cards, contact artworks, feature videos, hero card videos, and the built-in Trending/Exclusive fallback cards (used only until live promo items exist).
- Add a 15s beat-synced promo motion graphic (`/videos/pixiekat-promo.mp4`, built with HyperFrames in `videos/pixiekat-promo/`) as the "Power Up Your Game" feature card video, with a real acid "Top Up Now" pill button over the card linking to `/games`; hero gains a `hero_settings.show_images` toggle for the character parallax layer.
- Add five new game pages (`046_new_games_seed.sql`): Hayabusa Starlight – Kitsune's Shadow (`/games/starlight`, manual gifting flow with 168-hour-friendship how-to), Honor of Kings (`/games/honor-of-kings`, 10 token packs auto-fulfilled via Yokcash `HOKYC*` at cost+15%), Genshin Impact split into India (`/games/genshin-impact`, Yokcash `GIYC*`) and USA (`/games/genshin-impact-usa`, Chronal Nexus packs, manual fulfilment), and BGMI (`/games/bgmi`, Yokcash `PUBGYC*` UC ladder at cost+15%). Homepage Trending/Exclusive promo cards now link to the real pages instead of `/games`.
- Show the MLBB first-purchase double-Diamond explainer between the 50/150/250/500-tier packs and the regular base+bonus packages — the compact grid splits at the first `Diamond=N+M` amount; admin `package_sections` still overrides when configured.
- `/games` grid now lists every active game directly — the See All/Show Less toggle card is gone — and Mobile Legends Global is retired (game `status='inactive'`, promo card off).
- Drop the small subtitle line (e.g. "Malaysia server") under each name on the `/games` grid — cards show the game name only.
- Reorder Exclusive Offers: Starlight first, then the MLBB cards, Honor of Kings, Magic Chess, and the rest (`048_exclusive_offers_order.sql` re-sorts `promotional_items.sort_order`; code + admin fallback lists mirror it).
- Rename the Starlight game to "Hayabusa Starlight" — the "– Kitsune's Shadow" suffix is dropped from the display name (`049_rename_starlight_title.sql`); the description still names the actual October skin.
- Add five more game pages cloned from the kazutora.in catalog (`050_kazutora_games.sql` + `main/server/scripts/seed-kazutora-games.mjs`): Magic Chess: Go Go (`/games/magic-chess-go-go`, 15 Yokcash `MCGG_*_BR` diamond packs in TOP UP DIAMONDS / DOUBLE DIAS sections), BGMI (Not Instant) (`/games/bgmi-not-instant`, 21 packs, `provider=manual` since the prices undercut Yokcash cost and bonus packs have no matching SKU), PUBG Mobile Global (`/games/pubg-global`, 5 Yokcash `YCPUBGGLB*` UC packs), Honkai: Star Rail (`/games/honkai-star-rail`, 6 Yokcash `HNKIYC*` Oneiric Shard packs + Express Supply Pass), and Revelation Mobile (`/games/revelation-mobile`, Yokcash `RVLNMBPC-S81` Battle Pass Classic). Sell prices match kazutora retail exactly; card/banner art is mirrored into `public-media`.
- Fix the Exclusive Offers grid (`051_exclusive_offers_fix.sql`): replace the duplicated MLBB card and the mismatched Magic Chess/PUBG/"Hero Special" artwork with real game art (Honkai: Star Rail and BGMI cards fill the dead slots), every card deep-links to its game page, and the 🇮🇳 flag (which rendered as bare "IN" text on Windows) is cleared. Cards get the black game-card border + acid PROMO pill, and promos without `link_url` now fall back to `/games` instead of a dead `/games/<uuid>` route (same fix in Trending).
- Rename the display font off the template's "zentry" naming: the family is now `display` (`font-display`, `/fonts/display-regular.woff2`, woff2 internal name metadata scrubbed) — identical glyphs, no visual change.
- Add an MLBB Mini Packs game page (`/games/mlbb-mini-packs`, `053_mlbb_mini_packs.sql` + `main/server/scripts/seed-mlbb-mini-packs.mjs`): three small-denomination diamond packs cloned from tangyanstore.com (5/11/22 💎 at ₹15/₹28/₹58, ~15% over supplier cost) sold region-free (`region='global'`, no `blocked_regions`) under `provider='manual'` — orders stay processing for staff fulfilment, while `provider_game_code='mobilelegends'` keeps player verification and the free region lookup working so staff still see the buyer's account region on each order.
- Add a Wuthering Waves game page (`/games/wuthering-waves`, `054_wuthering_waves.sql` + `main/server/scripts/seed-wuthering-waves.mjs`): seven Lunite packs auto-fulfilled via Yokcash `WUTWVS*` services at cost+15% (60 ₹101 · Subscription ₹482 · 330 ₹480 · 1090 ₹1449 · 2240 ₹2898 · 3880 ₹4648 · 8080 ₹9060 — all still above tangyanstore retail, so a manual fallback stays profitable) with UID + server-select fields, `region='global'`, and Steam store card/banner art mirrored into `public-media`.

### Fixes
- Admin Wallets activity feed: transactions owned by admin/support wallets (or any profile outside the user/reseller list) rendered "Unknown account" and were unclickable — names now resolve across all profiles, unresolved rows show the short user id, and every row opens the owner's user page. Orders Management pages through the whole `orders` table instead of silently dropping everything past the first 500 rows.
- Restore `010_security_remediation.sql` artifacts that were never applied to prod (`052_restore_010_security_bits.sql`): `is_service_role()` (called by live `refresh_user_perks`/`protect_profile_updates` bodies — leaderboard finalize would error), `orders.idempotency_key` + unique index (the `/api/place-order` idempotency path would 500), `protect_order_updates()`, and the wallet-balance/order-product NOT VALID constraints. The 010 `protect_*_on_update` triggers remain unarmed — prod has always run without them.
- Fix the mobile auth screen: the storefront's fixed bottom nav (and top navbar + floating action buttons) rendered over `/login`, `/register`, and `/reset-password`, hiding the Sign up/Sign in link and the banner Back button — auth routes are now chrome-free, and the page uses `min-h-svh` so mobile browser toolbars can't push the layout off-screen.

### Repository
- Remove scratch artifacts (`Test/` harness, temp backup/seed scripts, stale AWS log, stray screenshot) and stop tracking `admin/.env`.
- Add `scripts/gif-frames.mjs` (GIF/video → sampled stills + contact sheet) and `scripts/set-site-graphic.js` (upload a file to `public-media` and point a `site_graphics`/`hero_settings` key at it).
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
- Extend the Aluu Pay client with `createCryptoOrder()` for USDT checkout (TRC20/BEP20/ERC20/POLYGON — Aluu nudges each option's amount to identify the order) and `network`/`cryptoTxid` on status checks; library only, not yet wired to checkout endpoints.
- Add `place_cart_orders` and `place_wallet_cart` RPCs (migration `036_cart_checkout.sql`) for atomic multi-order placement and a single wallet debit.
- Temporarily disable online payment gateways behind `ONLINE_PAYMENTS_ENABLED` in `main/server/index.js` — the configured Razorpay key is a test key, so fake payments passed signature verification and triggered real fulfillment. `/api/place-order`, `/api/cart-checkout`, and `/api/membership/purchase` accept wallet only and `/api/wallet/topup` is closed; storefront checkout, cart, and Add Money offer Pixie Wallet only. Verify/webhook endpoints stay live so genuinely-paid pending orders still settle.
- Add Aluu `createCryptoOrder` client (`main/server/aluu.js`) for the non-custodial USDT endpoint (`POST /api/create-crypto-order`, TRC20/BEP20/ERC20/POLYGON): takes USD (`amountUsd`), optional `network` lock (omitted = customer picks), and returns per-network nudged `options[].amount` for reconciliation plus `requestedAmount`; `checkOrderStatus` now surfaces `network`/`cryptoTxid`. Not yet wired into checkout.

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
