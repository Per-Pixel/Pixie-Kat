## Session 3 — Admin Dashboard Refactor

### 1. Currency standardised: PKS → INR
- `admin/src/utils/dashboardMetrics.ts` default currency changed from `PKS` to `INR`.
- `admin/src/pages/Analytics.tsx` local `money` formatter changed to `INR`.
- `admin/src/pages/revenue/SalesOverview.tsx` already used `INR`.

### 2. Wallet-only toggle on Dashboard, Analytics, and Sales Overview
- `admin/src/utils/dashboardMetrics.ts` `computeDashboardMetrics` now accepts an optional `paymentMethod` filter.
- `admin/src/pages/Dashboard.tsx` added a wallet-only toggle and filters all KPIs/tables to `payment_method === 'wallet'` when active.
- `admin/src/services/adminAnalyticsService.ts` `getAdminAnalytics` now passes `p_payment_method`.
- `admin/src/pages/Analytics.tsx` and `admin/src/pages/revenue/SalesOverview.tsx` added wallet-only toggles and pass the filter to `getAdminAnalytics`.
- New migration: `supabase/migrations/015_wallet_analytics_filter.sql` updates the `get_admin_analytics` PostgreSQL function with the `p_payment_method` parameter. Must be run in Supabase before the Analytics/Revenue wallet toggle works.

### 3. Differentiated Analytics and Revenue/Sales Overview
- `admin/src/App.tsx`: `/revenue/sales-overview` now renders the dedicated `SalesOverview` component instead of `Analytics`.
- `admin/src/pages/Analytics.tsx` added a **Platform & User Activity** tab:
  - Recent web activity feed
  - Top user actions bar chart
  - Total events, unique active users, unique IPs, registered customers
- `SalesOverview` remains focused on sales/revenue metrics and now has the wallet-only toggle.

### 4. `user_memberships` schema cache / `plan_id` fix
- `admin/src/pages/users/tabs/MembershipTab.tsx` updated to use the actual schema column `membership_plan_id` in the interface, Supabase select, and insert statements.

### 5. Enabled View / Edit / Suspend / Delete clients in `/auth/clients`
- `admin/src/pages/auth/Clients.tsx` now wires the action buttons:
  - **View / Edit** navigate to `/users/{id}`
  - **Suspend** calls `POST /admin/users/{id}/status` with `suspended`
  - **Delete** calls `DELETE /admin/users/{id}` with confirmation
- Each action disables the row, reloads the table, and refreshes stats.

### 6. Runtime bug fix
- Fixed `Rendered more hooks than during the previous render` in `Dashboard.tsx` by moving the `paymentFilter` `useMemo` above all early-return blocks.

### Verification
- `npm run build` in `admin/` exits 0.
- 69 pre-existing TypeScript errors (e.g., `erasableSyntaxOnly`, missing service types) are unrelated to these changes and were present before this session.