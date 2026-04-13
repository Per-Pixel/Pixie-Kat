# PixieKat To-Do and Future Work

Last reviewed: 2026-04-13

This file turns the current PixieKat repo state into an actionable future-work checklist for the public website in `main/` and the admin panel in `admin/`.

## Current Repo Snapshot

- `main/` is a React 18 + Vite public frontend with routes for home, games, pricing, FAQ, support, how-it-works, auth, wallet add-money, and account.
- `admin/` is a React 19 + Vite admin frontend with protected routes for dashboard, overview, products, users, orders, games, messages, resellers, settings, pages, notifications, analytics, wallets, revenue pages, and auth client pages.
- No backend server, database schema, payment gateway implementation, storage service, or deployment/security infrastructure was found in this repo.
- Public auth is currently demo/local-browser auth in `main/src/contexts/AuthContext.jsx`.
- Admin auth has API service scaffolding, but still accepts a hard-coded demo login in `admin/src/services/authService.ts`.
- Several public and admin pages use inline mock/demo data instead of real API data.
- `main/package-lock.json` was already modified before this review and should be handled separately from this work file.

## Priority Roadmap

### P0 - Foundation Required Before Production

- Choose and create the backend/API layer for the site and admin panel.
- Define the database schema for users, roles, sessions, games, products, carts, orders, payments, wallet transactions, support tickets, media assets, CMS pages, notifications, referrals, resellers, and audit logs.
- Add environment files and documented variables for API base URLs, auth providers, database, payment provider keys, media storage, and email/SMS services.
- Replace demo credentials and mock tokens with real auth, secure sessions, and server-side authorization checks.
- Implement payment gateway order creation, confirmation, webhook verification, refunds, fraud checks, and reconciliation.
- Add rate limiting, brute-force protection, input validation, CSRF protection where needed, CORS restrictions, secure cookies or equivalent token hardening, CSP/security headers, and production logging.
- Add production build, lint, type-check, and smoke-test workflows for both `main/` and `admin/`.

### P1 - Public Website

- Update game flow so game details open on a routed page instead of a pop-up:
  - Add a route such as `/games/:gameId` in `main/src/App.jsx`.
  - Create the routed page under `main/src/pages/games/[gameId]` or the repo's preferred equivalent route folder.
  - Migrate useful UI from `main/src/pages/games/components/GameDetailsModal.jsx`.
  - Update `main/src/pages/games/components/GameGrid.jsx` to navigate to the new detail page.
  - Keep `/games/:gameId/add-money` for checkout or rename it after the final cart/checkout architecture is chosen.
  - Remove `GameDetailsModal.jsx` only after no imports remain.
- Build cart and checkout:
  - Add `/cart` and `/checkout` routes.
  - Add cart state or API-backed cart service.
  - Support add, remove, quantity update, saved game IDs/server IDs, coupon/referral codes, totals, taxes/fees, and checkout validation.
  - Decide whether wallet top-up and product checkout are separate flows or one shared checkout flow.
- Replace static payment UI in `main/src/pages/wallet/AddMoneyPage.jsx` with real payment initiation:
  - Load available payment methods from the backend.
  - Create payment intents/orders on the server.
  - Confirm payment status with server validation and webhook-backed state.
  - Add failure, pending, retry, receipt, and refund request states.
- Replace public demo auth:
  - Replace `pixiekat-demo-auth` storage with a real auth API.
  - Add Google OAuth login wiring for the existing Google button in `main/src/pages/auth/index.jsx`.
  - Add email verification, password reset, logout/session invalidation, and persistent session handling.
  - Remove demo credential copy from the UI once real auth is enabled.
- Make the user dashboard dynamic:
  - Replace demo account profile data in `main/src/pages/account/accountShared.js`.
  - Load wallet balance, orders, payment history, saved game IDs, support tickets, profile details, and notification settings from the API.
  - Add empty, loading, error, and retry states for each account section.
- Update content pages to match future reference images:
  - Pricing: `main/src/pages/pricing/index.jsx`.
  - How it works: `main/src/pages/how-it-works/index.jsx`.
  - FAQ: `main/src/pages/faq/index.jsx`.
  - Support: `main/src/pages/support/index.jsx`.
  - Add the reference images to the repo or document their external source before implementation.
- Wire the support form in `main/src/pages/support/index.jsx` to a backend endpoint instead of `alert`.
- Improve top navigation text visibility:
  - Audit `main/src/components/layout/Navbar.jsx` across every route, scroll position, and background.
  - Extend or replace `darkTextTopRoutes` so desktop nav text remains readable on all pages.
  - Confirm mobile bottom navigation still behaves correctly after auth changes.
- Media and performance:
  - Replace repeated placeholder game images in `main/src/pages/games/gamesData.js` with correct game art.
  - Add image width/height, responsive sizes, and optimized formats for large public assets.
  - Compress or transcode videos in `main/public/videos/`.
  - Populate `criticalImageSources` in `main/src/App.jsx` or remove the unused preload function if a different loading strategy is adopted.
  - Add route-level code splitting with `React.lazy` for heavy pages.
  - Lazy-load non-critical images and videos while preloading only above-the-fold assets.
  - Review background audio behavior in `main/src/components/layout/Navbar.jsx` for autoplay, accessibility, and user preference handling.

### P1 - Admin Panel

- Replace hard-coded admin auth:
  - Remove `admin@pixiekat.com` / `admin123` login behavior from `admin/src/services/authService.ts`.
  - Remove mock token validation for `mock-jwt-token`.
  - Connect login, token validation, refresh, logout, 2FA, password reset, and profile update to real backend endpoints.
  - Prefer secure session storage and server-side authorization over long-lived browser-local tokens where possible.
- Connect pages to services instead of inline arrays:
  - Dashboard data in `admin/src/pages/Dashboard.tsx`.
  - Users data in `admin/src/pages/Users.tsx`.
  - Products data in `admin/src/pages/Products.tsx`.
  - Orders data in `admin/src/pages/Orders.tsx`.
  - Games data in `admin/src/pages/Games.tsx`.
  - Messages data in `admin/src/pages/Messages.tsx`.
  - Pages data in `admin/src/pages/Pages.tsx`.
  - Notifications data in `admin/src/pages/Notifications.tsx`.
  - Revenue and analytics chart data in `admin/src/pages/revenue/*` and `admin/src/pages/Analytics.tsx`.
- Build admin CRUD and management actions:
  - Users: create, edit, ban/unban, reset password, view activity, export, import, merge duplicates.
  - Products: create, edit, stock updates, price updates, bulk updates, import/export, low-stock alerts.
  - Games: create, edit, category management, image upload, activate/deactivate, attach products.
  - Orders: status changes, notes, delivery retry, refund, fraud review flagging, export.
  - Wallets/payments: wallet ledger, manual adjustments, refund history, failed payment review, reconciliation.
  - Pages/CMS: edit public page content and publish/draft status.
  - Messages/support: inbox, assignment, priority, replies, internal notes, status tracking.
  - Resellers/referrals: approvals, commission tracking, payouts, referral code management.
- Fix admin routing/navigation mismatches:
  - `admin/src/components/Sidebar.tsx` links to `/pages/create`, `/pages/settings`, `/messages/sent`, `/auth/users`, and `/auth/permissions`, but `admin/src/App.tsx` does not currently define matching routes.
  - `admin/src/App.tsx` defines routes such as `/products`, `/users`, `/orders`, `/games`, `/resellers`, and `/settings`, but the current enhanced sidebar does not expose all of them directly.
  - Align sidebar items, route definitions, header title mapping in `admin/src/layouts/AdminLayout.tsx`, and role permissions.
- Strengthen admin permissions:
  - Use `ProtectedRoute` `requiredPermission` checks on sensitive routes.
  - Add server-enforced RBAC for every admin API.
  - Add audit logging for admin login, data exports, user edits, order edits, refunds, wallet changes, and settings changes.
  - Add MFA enforcement for high-privilege roles.
- Admin UX and reliability:
  - Add loading, empty, error, and retry states to service-backed pages.
  - Add pagination and server-side filtering/search for tables.
  - Add confirmation modals for destructive actions.
  - Add optimistic updates only where rollback is safe.
  - Replace placeholder image URLs such as `/api/placeholder/64/64`.

### P2 - Shared Backend and API Contract

- Create or document shared API contracts for both apps:
  - Auth: register, login, Google OAuth callback, refresh, logout, password reset, email verification, MFA.
  - Public catalog: games, products, pricing, availability, promotions.
  - Cart/checkout: cart, checkout session, order creation, payment intent/order, receipt.
  - Payments: webhooks, refunds, reconciliation, fraud review, payment method listing.
  - Account: profile, orders, wallet, saved game IDs, support tickets, notifications.
  - Admin: users, products, games, orders, messages, pages, notifications, analytics, resellers, wallets, settings.
- Decide API response conventions and reuse them across `admin/src/services/*` and any future `main/src/services/*`.
- Add schema validation on client forms and backend endpoints.
- Add API documentation and sample `.env.example` files.

### P2 - Testing and Quality

- Add public website tests for auth redirects, game page navigation, cart updates, checkout states, account dashboard loading, support form submission, and responsive nav visibility.
- Add admin tests for protected route redirects, login errors, token refresh, table loading states, CRUD actions, permission-gated routes, and route/sidebar alignment.
- Add payment tests with gateway sandbox mode and webhook signature verification.
- Add security tests for rate limiting, brute-force login attempts, unauthorized admin API access, token expiry, and input validation.
- Add basic accessibility checks for auth forms, checkout, modals/pages, nav, tables, and chart fallbacks.

## Cleanup Candidates

Do not delete these automatically. Verify usage with imports, build output, and product intent first.

- `main/src/legacy/next-app/`: legacy Next.js code with placeholder product data and TODO comments. Either migrate useful logic into the Vite app or remove it after confirmation.
- `reset`: root file appears to contain colored git log output, not source code. Remove after confirming it is not used as project documentation.
- `main/src/assets/react.svg`, `admin/src/assets/react.svg`, and `admin/public/vite.svg`: template assets, likely removable if not imported.
- `main/src/pages/games/components/GameDetailsModal.jsx`: remove only after game details move to a routed page and no references remain.
- Repeated game art in `main/src/pages/games/gamesData.js`: replace with correct assets instead of deleting the data.
- Inline mock arrays in admin pages: remove after the pages consume real services.
- Demo credential UI in public and admin login pages: remove after real auth is live.
- Update `main/README.md` route documentation to include `/games/:gameId/add-money` and `/account/*` after the route plan is finalized.

## Open Decisions

- Which backend stack and database will own production data?
- Which payment provider or providers should be used for UPI/wallet/card/crypto support?
- Are wallet top-ups, product purchases, and cart checkout separate products or one unified order system?
- What exact reference images should drive the pricing, how-it-works, FAQ, and support redesigns?
- Which admin roles are required beyond admin, reseller, and support?
- Should auth sessions use secure HTTP-only cookies, token storage, or a managed auth provider?
- Which regions, currencies, and tax rules must checkout support at launch?
