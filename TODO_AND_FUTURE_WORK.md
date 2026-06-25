# PixieKat To-Do and Future Work

Last reviewed: 2026-04-18

This file turns the current PixieKat repo state into an actionable future-work checklist for the public website in `main/` and the admin panel in `admin/`.

## Current Repo Snapshot

- `main/` is a React 18 + Vite public frontend with routes for home, games, pricing, FAQ, support, how-it-works, auth, wallet add-money, and account.
- `admin/` is a React 19 + Vite admin frontend with protected routes for dashboard, overview, products, users, orders, games, messages, resellers, settings, pages, notifications, analytics, wallets, revenue pages, and auth client pages.
- ✅ **NEW**: Backend server (`main/server/`) with Express.js, PostgreSQL database, JWT authentication, and security hardening (helmet, rate limiting).
- ✅ **NEW**: Production-ready auth system with bcrypt password hashing, secure cookies, email normalization, and parameterized queries.
- ✅ **NEW**: Frontend performance optimizations including code splitting, lazy loading, compression, and build optimizations.
- ✅ **NEW**: AWS deployment documentation with step-by-step guides for EC2, RDS, S3, and CloudFront.
- Public auth now uses real backend API with PostgreSQL database instead of demo/local-browser auth.
- Admin auth still has API service scaffolding and accepts a hard-coded demo login in `admin/src/services/authService.ts`.
- Several admin pages use inline mock/demo data instead of real API data.
- `main/package-lock.json` was already modified before this review and should be handled separately from this work file.

## Recent Completions (2026-04-18)

### ✅ Performance Optimizations
- Code splitting with manual chunks (react-vendor, animation-vendor, utils)
- Route-based lazy loading with React.lazy() and Suspense
- Terser minification with console/debugger removal
- Gzip and Brotli compression (threshold: 10KB)
- CSS code splitting and optimization
- Font display swap for all custom fonts
- Resource hints (preconnect, dns-prefetch, preload)
- Asset inlining for files <4KB
- Optimized Vite build configuration
- **Expected improvement**: 60-70% reduction in initial bundle size

### ✅ Security Hardening
- Helmet.js for security headers (XSS, clickjacking, HSTS)
- Global rate limiting (100 requests/15min per IP)
- Auth rate limiting (5 attempts/15min on login/signup)
- Parameterized SQL queries (SQL injection protection)
- Email normalization (lowercase storage/lookup)
- Secure cookie handling (HttpOnly, SameSite, Secure flags)
- bcrypt password hashing (10 salt rounds)
- CORS configuration with environment-based origins
- Input validation and sanitization
- Strong JWT secret generation documented

### ✅ Database & Backend
- PostgreSQL database with connection pooling
- Express.js backend with async/await operations
- User authentication table with email indexing
- SSL support for AWS RDS connections
- Environment variable management with .env
- Database migration from SQLite to PostgreSQL
- Protected routes with loading states (no flicker)

### ✅ Deployment Preparation
- Complete AWS deployment guide (EC2, RDS, S3, CloudFront)
- Security checklist with verification tests
- Migration checklist for database transition
- Environment configuration templates
- Installation and update workflows
- Cost monitoring and free tier limits documented
- **Status**: Production-ready MVP for AWS Free Tier

### 📚 Documentation Created
- `AWS_DEPLOYMENT_GUIDE.md` - Step-by-step AWS deployment
- `SECURITY_CHECKLIST.md` - Security implementation verification
- `server/MIGRATION_CHECKLIST.md` - Database migration guide
- `README_DEPLOYMENT.md` - Quick reference and overview
- `PERFORMANCE_OPTIMIZATIONS.md` - Frontend optimization details

## Priority Roadmap

### P0 - Foundation Required Before Production

- ✅ **DONE**: Choose and create the backend/API layer for the site (Express.js in `main/server/`).
- ✅ **DONE**: Define the database schema for users (PostgreSQL with users table, email index).
- ⏳ **PARTIAL**: Add environment files (`.env.example.aws` created, need to expand for all services).
- ✅ **DONE**: Replace demo credentials with real auth for public site (JWT + bcrypt + PostgreSQL).
- ⏳ **IN PROGRESS**: Admin panel still uses demo auth - needs real backend connection.
- ⏳ **PENDING**: Define schema for games, products, carts, orders, payments, wallet transactions, support tickets, media assets, CMS pages, notifications, referrals, resellers, and audit logs.
- ⏳ **PENDING**: Implement payment gateway order creation, confirmation, webhook verification, refunds, fraud checks, and reconciliation.
- ✅ **DONE**: Add rate limiting (global 100/15min, auth 5/15min), brute-force protection.
- ✅ **DONE**: Add input validation, CORS restrictions, secure cookies (HttpOnly, SameSite, Secure).
- ✅ **DONE**: Add CSP/security headers (helmet.js), parameterized queries (SQL injection protection).
- ✅ **DONE**: Add production build optimizations (Vite config, code splitting, compression, minification).
- ⏳ **PENDING**: Add lint, type-check, and smoke-test workflows for both `main/` and `admin/`.

### P1 - Public Website

- ✅ **DONE**: Update game flow so game details open on a routed page instead of a pop-up:
  - ✅ Added route `/games/:gameId` in `main/src/App.jsx`.
  - ✅ Created routed page `main/src/pages/games/GameInfoPage.jsx` with full UI.
  - ✅ Migrated UI from `main/src/pages/games/components/GameDetailsModal.jsx`.
  - ✅ Updated `main/src/pages/games/components/GameGrid.jsx` to navigate to detail page.
  - ✅ Kept `/games/:gameId/add-money` route for checkout flow.
  - ✅ Removed `GameDetailsModal.jsx` (no imports remained).
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
- ✅ **DONE**: Replace public demo auth:
  - ✅ Replaced `pixiekat-demo-auth` storage with real auth API (Express + PostgreSQL).
  - ✅ JWT-based authentication with secure cookies (HttpOnly, SameSite, Secure).
  - ✅ Logout/session invalidation implemented.
  - ✅ Persistent session handling with `/auth/me` endpoint and loading states.
  - ⏳ **PENDING**: Add Google OAuth login wiring for the existing Google button.
  - ⏳ **PENDING**: Add email verification and password reset flows.
  - ⏳ **PENDING**: Remove demo credential copy from the UI once OAuth is enabled.
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
  - ⏳ **PENDING**: Replace repeated placeholder game images in `main/src/pages/games/gamesData.js` with correct game art.
  - ⏳ **PENDING**: Add image width/height, responsive sizes, and optimized formats for large public assets.
  - ⏳ **PENDING**: Compress or transcode videos in `main/public/videos/`.
  - ✅ **DONE**: Add route-level code splitting with `React.lazy` for all route components.
  - ✅ **DONE**: Lazy-load route components with Suspense fallback.
  - ✅ **DONE**: Font optimization with `font-display: swap` to prevent FOIT.
  - ✅ **DONE**: Vite build optimizations (terser minification, code splitting, compression).
  - ✅ **DONE**: Resource hints (preconnect, dns-prefetch) for external CDNs.
  - ✅ **DONE**: Asset inlining for small files (<4KB).
  - ✅ **DONE**: Gzip and Brotli compression for production builds.
  - ⏳ **PENDING**: Populate `criticalImageSources` or remove if using different loading strategy.
  - ⏳ **PENDING**: Review background audio behavior for autoplay, accessibility, and user preference handling.

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

## Next Immediate Steps (Post-Deployment)

### High Priority
1. **Deploy to AWS Free Tier** following `AWS_DEPLOYMENT_GUIDE.md`
2. **Test production deployment** end-to-end (auth, API, database)
3. **Setup monitoring** (CloudWatch, error tracking, performance metrics)
4. **Connect admin panel** to the same backend/database
5. **Implement payment gateway** integration for wallet top-ups
6. **Add email service** for verification and password reset

### Medium Priority
1. **Expand database schema** for games, products, orders, transactions
2. **Build cart and checkout** flows
3. **Add Google OAuth** login option
4. **Implement refresh tokens** for better security
5. **Add email verification** and password reset flows
6. **Setup CI/CD pipeline** for automated deployments

### Lower Priority
1. **Add comprehensive testing** (unit, integration, E2E)
2. **Implement admin CRUD** operations for all entities
3. **Add analytics and reporting** features
4. **Setup CDN** for media assets
5. **Add internationalization** (i18n) support

## Cleanup Candidates

Do not delete these automatically. Verify usage with imports, build output, and product intent first.

- `main/src/legacy/next-app/`: legacy Next.js code with placeholder product data and TODO comments. Either migrate useful logic into the Vite app or remove it after confirmation.
- `reset`: root file appears to contain colored git log output, not source code. Remove after confirming it is not used as project documentation.
- `main/src/assets/react.svg`, `admin/src/assets/react.svg`, and `admin/public/vite.svg`: template assets, likely removable if not imported.
- ✅ **REMOVED**: `main/src/pages/games/components/GameDetailsModal.jsx` - deleted after game details moved to routed page.
- Repeated game art in `main/src/pages/games/gamesData.js`: replace with correct assets instead of deleting the data.
- Inline mock arrays in admin pages: remove after the pages consume real services.
- Demo credential UI in public and admin login pages: remove after real auth is live.
- Update `main/README.md` route documentation to include `/games/:gameId`, `/games/:gameId/add-money`, and `/account/*` after the route plan is finalized.

## Open Decisions

- ✅ **RESOLVED**: Backend stack - Express.js + PostgreSQL on AWS (EC2 + RDS).
- ✅ **RESOLVED**: Auth sessions - Secure HTTP-only cookies with JWT tokens (7-day expiry).
- ⏳ **PENDING**: Which payment provider or providers should be used for UPI/wallet/card/crypto support?
- ⏳ **PENDING**: Are wallet top-ups, product purchases, and cart checkout separate products or one unified order system?
- ⏳ **PENDING**: What exact reference images should drive the pricing, how-it-works, FAQ, and support redesigns?
- ⏳ **PENDING**: Which admin roles are required beyond admin, reseller, and support?
- ⏳ **PENDING**: Which regions, currencies, and tax rules must checkout support at launch?
- ⏳ **PENDING**: Should we add OAuth providers (Google, Facebook, etc.) or keep email/password only?
- ⏳ **PENDING**: Refresh token strategy - implement now or defer to post-MVP?
