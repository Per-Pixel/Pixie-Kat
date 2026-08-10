# Pixie-Kat — User Management Upgrade Plan
**Full Feature-Gap Analysis · Admin Page Architecture · Supabase Schema · API Design**
*Generated: May 2026 | Based on live codebase audit + reference platform analysis*

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Current State Audit](#2-current-state-audit)
3. [Feature Gap Analysis](#3-feature-gap-analysis)
4. [Full Admin User Detail Page Specification](#4-full-admin-user-detail-page-specification)
5. [Frontend Dashboard Sync Plan](#5-frontend-dashboard-sync-plan)
6. [Supabase Database Schema](#6-supabase-database-schema)
7. [API Endpoints](#7-api-endpoints)
8. [Security Considerations](#8-security-considerations)
9. [Recommended Development Order](#9-recommended-development-order)
10. [Folder & Component Structure](#10-folder--component-structure)
11. [Validation Rules & Edge Cases](#11-validation-rules--edge-cases)
12. [Migration Strategy](#12-migration-strategy)

---

## 1. Executive Summary

The current Pixie-Kat admin panel has a functional **user list page** (`ManageUsers.tsx`) with basic CRUD, but **no dedicated per-user detail/edit page**. All editing happens inside a narrow 5-field modal. The frontend user dashboard (`/account`) exists with Profile, Orders, Wallet, and Rewards tabs, but every section is either hardcoded mock data or stubbed with "coming soon."

The gap between what exists and what the reference platforms demonstrate is significant. This document defines the complete path from current state to a production-grade User Management system with:
- A full **tabbed Admin User Detail Page** at `/users/:id`
- A **synchronized frontend user dashboard** with real security settings, 2FA, change-password, and session management
- A complete **Supabase schema** (12 tables, enums, RLS policies, indexes, audit log)
- **REST API endpoints** covering every admin and user action
- A clear **8-sprint development order** with dependency mapping

---

## 2. Current State Audit

### 2.1 Admin Panel — What Exists

| Feature | Location | State |
|---|---|---|
| User list with search/filter | `ManageUsers.tsx` | ✅ Working |
| Edit modal (name, email, phone, role, status) | `ManageUsers.tsx` lines 658–772 | ✅ Working (limited) |
| Bulk activate / deactivate / delete | `ManageUsers.tsx` lines 163–197 | ✅ Working |
| Suspend user (sets status = suspended) | `ManageUsers.tsx` line 277 | ✅ Working |
| User service (ban, reset-password, activities, login-history defined) | `userService.ts` | ⚠️ Defined, NO UI |
| Permission system (RBAC by role) | `AuthContext.tsx` + `auth.ts` | ✅ Working |
| Wallet page (global) | `Wallets.tsx` | ⚠️ Static mock data |
| Dedicated `/users/:id` route | `App.tsx` | ❌ Does not exist |

### 2.2 Frontend Dashboard — What Exists

| Feature | Location | State |
|---|---|---|
| Profile panel (name, email, phone, avatar) | `DesktopAccountView.jsx` | ⚠️ Display only |
| Edit profile form (name, username, mobile, bio) | `EditProfilePage.jsx` | ⚠️ `handleSubmit` does `console.log` only — NOT wired to API |
| Orders panel | `DesktopAccountView.jsx` | ⚠️ Static hardcoded mock |
| Wallet panel with balance | `DesktopAccountView.jsx` | ⚠️ Static, no real transactions |
| Rewards panel | `DesktopAccountView.jsx` | ⚠️ Empty placeholder |
| Settings page (notifications, security toggles) | `SettingsPage.jsx` | ⚠️ Local state only, "coming soon" modals |
| 2FA setup page | — | ❌ Does not exist |
| Change password page | — | ❌ Does not exist |
| Change email page | — | ❌ Does not exist |
| Login session history | — | ❌ Does not exist |
| KYC/Verification page | — | ❌ Does not exist |
| Referral dashboard | — | ❌ Does not exist |

---

## 3. Feature Gap Analysis

### 3.1 Admin Panel — Missing Features

#### CRITICAL (blocking for production)
- **Dedicated User Detail Page** — `/users/:id` with tabbed sections. The current modal is a dead end.
- **Wallet Management per user** — view balance, credit/debit Pixie Coins, transaction history per user.
- **Ban/Suspend with reason + duration** — current suspend is a one-word status patch with no reason, no expiry, no audit record.
- **User Activity Log** — every action a user takes (login, order, wallet top-up) must be viewable by admin.
- **Login/Session History** — IP, device, location, timestamp per login attempt.

#### HIGH PRIORITY (needed for trust and security)
- **2FA Status Management** — admin can view whether user has 2FA enabled, and force-disable it (for account recovery).
- **Force Password Reset** — admin triggers a reset email; `userService.ts` has `resetUserPassword()` but no UI exists.
- **Change Email (admin override)** — update a user's email with automatic Supabase Auth sync.
- **KYC/Verification Controls** — manually mark a user as verified/unverified; set verification tier.
- **Internal Admin Notes** — timestamped private notes on a user, visible only to admins/support.

#### MEDIUM PRIORITY (operational quality)
- **Referral & Reward Data tab** — view how many referrals a user has, what rewards they earned.
- **Account Status History** — timeline of all status changes (who changed it, when, why).
- **Send Notification to User** — `userService.ts` has `sendNotification()` but no UI.
- **Impersonate/View as User** — read-only view of what the user sees (link to user-facing account).

#### LOW PRIORITY (nice-to-have)
- **Merge Duplicate Accounts** — `userService.ts` has `mergeUsers()` but no UI.
- **Export User Data (GDPR)** — export one user's complete data as JSON/CSV.
- **Tag/Label System** — tag users with custom labels (VIP, suspect, whale, etc.).

### 3.2 Frontend Dashboard — Missing Features

| Missing Feature | Sync Required With | Priority |
|---|---|---|
| Change Password (real functional page) | Supabase Auth, admin can trigger reset | CRITICAL |
| 2FA Setup (TOTP + backup codes) | Admin 2FA status view, admin can disable | CRITICAL |
| Real wallet transaction history | Admin wallet management per user | CRITICAL |
| Edit Profile — wire to API | Admin edit user info | CRITICAL |
| Change Email with verification flow | Admin change email | HIGH |
| Login session history (user-facing) | Admin session view | HIGH |
| KYC submission form | Admin KYC controls | HIGH |
| Referral dashboard (invite link, earnings) | Admin referral data tab | MEDIUM |
| Real rewards/points display | Admin reward adjustment | MEDIUM |
| Active sessions management (user can revoke) | Admin session viewer | MEDIUM |

### 3.3 What Should Be Redesigned

| Current | Problem | Recommended Change |
|---|---|---|
| Edit user modal (5 fields) | Too small, no room to scale, no context | Replace with full `/users/:id` dedicated page |
| Wallets.tsx (global, mock) | No per-user wallet, no real data | Rewrite as real per-user wallet component |
| SettingsPage.jsx (all coming soon) | Completely non-functional, misleading UX | Wire each setting to Supabase `user_settings` table |
| User `status` field (3 values only) | No ban reason, no expiry, no audit | Add `user_bans` table + status history |
| `RegisteredUser` interface (6 fields) | Missing wallet balance, 2FA, KYC, last login | Extend to full `UserProfile` type |

---

## 4. Full Admin User Detail Page Specification

### 4.1 Route
```
/users/:id          → UserDetail page (read/overview)
/users/:id/edit     → Redirect to same page, opens edit tab
```

### 4.2 Page Layout
The page uses a **top header card** (user avatar, name, status badge, quick action buttons) followed by **horizontal tabs**. This matches the pattern from reference platforms.

```
┌─────────────────────────────────────────────────────────────────┐
│  [Avatar]  John Doe                        [Edit] [Suspend] [⋮] │
│            john@email.com · user · Active                        │
│            Joined Mar 2024 · Last active 2h ago · PKS 245.00    │
└─────────────────────────────────────────────────────────────────┘

[Overview] [Wallet] [Security] [KYC] [Activity] [Sessions] [Notes]
```

### 4.3 Tab Specifications

---

#### TAB 1: Overview
**Purpose:** Full snapshot of user profile + order/spend stats.

**Sections:**
1. **Profile Information Card**
   - Avatar (upload/view)
   - Full Name (editable)
   - Email (editable, triggers verification flow)
   - Phone (editable)
   - Username (editable)
   - Role (dropdown: user / reseller / support / admin)
   - Bio (editable textarea)
   - Language / Timezone

2. **Stats Row** (read-only chips)
   - Total Orders | Total Spent | Wallet Balance | Referrals Made | Rewards Earned | Last Login

3. **Account Status Card**
   - Current status badge (active / inactive / suspended / banned)
   - Status history timeline (who changed it, when, reason)
   - Quick action buttons: Activate | Deactivate | Suspend | Ban | Unban

4. **Quick Danger Zone** (admin-only)
   - Force Password Reset button
   - Delete Account button (with confirmation modal requiring admin to type "DELETE")

**Frontend impact:** Changes to profile info immediately reflected in user's `/account` page via Supabase Realtime or cache invalidation.

**Backend logic:**
- `PATCH /admin/users/:id` updates `profiles` table
- Email change requires updating both `profiles` AND `auth.users` via Supabase Admin SDK
- Status change writes to `user_status_history` table with `changed_by`, `reason`

**Permission rules:**
- Admin: full access
- Support: read + update profile info only; cannot change role, ban, or delete
- Reseller: no access to other users

---

#### TAB 2: Wallet Management
**Purpose:** Admin can view, credit, debit, and review a user's Pixie Coin wallet.

**Sections:**
1. **Balance Card**
   - Current balance (large display)
   - Pending balance (holds)
   - Lifetime credited / lifetime debited

2. **Adjust Balance Form**
   - Type: Credit | Debit | Admin Adjustment
   - Amount input (with validation: positive number, max 1M)
   - Reference/Reason (required text, max 200 chars)
   - Internal Note (optional)
   - Submit button → requires confirmation modal

3. **Transaction History Table**
   - Columns: Date | Type | Amount | Balance After | Reference | Order ID (if linked) | Admin Actor
   - Filter by type (credit / debit / purchase / refund / admin)
   - Pagination
   - Export to CSV button

**Frontend impact:** Wallet balance in user dashboard (`/account?section=wallet`) must update in real time via Supabase Realtime subscription on `wallet_transactions`.

**Backend logic:**
- All adjustments write to `wallet_transactions` with `actor_id` = admin's user ID
- Balance is **never stored directly** — computed as `SUM(amount)` from `wallet_transactions` OR maintained as a running `current_balance` column updated atomically via a Postgres function to avoid race conditions.
- Supabase Realtime broadcasts change to user's frontend session.

**Permission rules:**
- Admin: full credit/debit
- Support: view only (no adjustments)
- Validation: debit cannot exceed current balance (backend enforces)

---

#### TAB 3: Security
**Purpose:** Admin manages user's authentication and security settings.

**Sections:**
1. **Password Management**
   - "Send Password Reset Email" button
   - "Force Logout All Sessions" button
   - Last password change date

2. **Two-Factor Authentication**
   - 2FA Status badge: Enabled | Disabled
   - Method (TOTP / SMS)
   - Date enabled
   - "Disable 2FA" button (shows confirmation modal + reason field — logged in audit)

3. **Change Email**
   - Current email display
   - New email input field
   - "Send Verification to New Email" button
   - Pending email change status indicator
   - "Cancel Pending Change" button

4. **Email Verified Status**
   - Verified badge / Unverified badge
   - "Re-send Verification Email" button

**Frontend impact:**
- When admin disables 2FA, next time user opens `/account/settings` or the 2FA page, their status shows disabled.
- When admin sends reset email, user receives the email from Supabase Auth.

**Backend logic:**
- 2FA disable: calls Supabase Admin SDK to unenroll user's MFA factors, writes to `user_security_log`
- Email change: updates `auth.users.email` via Admin SDK + `profiles.email` atomically
- Force logout: calls `auth.admin.signOut(userId)` (invalidates all sessions)

**Permission rules:**
- Admin: full access
- Support: can send reset email + re-send verification only (cannot disable 2FA or change email)

---

#### TAB 4: KYC / Verification
**Purpose:** Review and manage user identity verification status.

**Sections:**
1. **Verification Status Card**
   - Current tier: Unverified | Basic | Verified | Premium
   - Status per check: Identity | Address | Phone
   - Last verified date + verified by (admin name)

2. **Manual Override Controls**
   - Set verification tier (dropdown)
   - Reason (required)
   - Approve / Reject / Reset buttons

3. **Submitted Documents** (future)
   - Document type, upload date, file preview (if KYC documents are implemented)

4. **Verification History**
   - Timeline of all verification changes

**Frontend impact:** User's verification badge on their profile page reflects current tier. Certain features (e.g., higher wallet limits) are gated on verification tier.

**Backend logic:**
- `user_kyc` table tracks tier, status, reason, timestamps, admin_id
- Tier change writes to `user_kyc_history`

**Permission rules:**
- Admin: full control
- Support: view + approve (cannot set to Premium)

---

#### TAB 5: Activity Log
**Purpose:** Full audit trail of what this user has done.

**Sections:**
1. **Activity Feed** (paginated, newest first)
   - Each row: Timestamp | Action Type | Description | IP | Device
   - Action types: login, logout, order_placed, order_refunded, wallet_credit, wallet_debit, profile_update, email_change, 2fa_enabled, 2fa_disabled, password_changed, password_reset, kyc_submitted, kyc_approved, account_suspended, account_banned
   - Color-coded icons per action type

2. **Filters**
   - Date range picker
   - Action type multi-select
   - IP address search

**Frontend impact:** No direct frontend sync needed. This is admin-only. However, writing activity logs is triggered by both frontend user actions AND admin actions.

**Backend logic:**
- Every significant action in the app calls `insert into user_activity_log` via a Supabase Edge Function or server trigger.
- RLS: users can only read their own activities (for a "My Activity" feature later). Admins can read all.

---

#### TAB 6: Sessions / Login History
**Purpose:** View all login attempts and active sessions.

**Sections:**
1. **Active Sessions Card**
   - List of currently active sessions: Device | Browser | IP | Location | Last Active | "Revoke" button per session
   - "Revoke All Sessions" button

2. **Login History Table**
   - Columns: Date | IP | Country/City | Device | Browser | Status (success/failed) | 2FA Used
   - Pagination
   - Failed logins highlighted in red

**Frontend impact:** User can see same data on their own security page (`/account/security`). When admin revokes a session, user is immediately logged out on that device.

**Backend logic:**
- Supabase provides `auth.sessions` — query via Admin SDK for active sessions
- Login history: custom `user_login_history` table populated by a Supabase Auth webhook or Edge Function trigger

**Permission rules:**
- Admin: view + revoke all sessions
- Support: view only

---

#### TAB 7: Notes (Internal Admin Logs)
**Purpose:** Private staff-only notes about a user.

**Sections:**
1. **Add Note Form**
   - Textarea (required, max 1000 chars)
   - Priority: Normal | Important | Flag
   - Submit button

2. **Notes Feed** (paginated, newest first)
   - Author avatar + name | Timestamp | Priority badge | Note content | Edit | Delete (own notes only)

**Frontend impact:** None — notes are internal only, never shown to users.

**Backend logic:**
- `admin_user_notes` table with `user_id`, `admin_id`, `content`, `priority`, `created_at`
- RLS: only `role = admin OR role = support` can read/write

---

#### TAB 8: Referrals & Rewards
**Purpose:** View referral activity and reward points for this user.

**Sections:**
1. **Referral Summary**
   - Referral code | Total referrals | Active referrals | Total commission earned

2. **Referred Users Table**
   - Name | Email | Join date | Orders placed | Status

3. **Rewards Summary**
   - Total points earned | Points used | Points balance | Points expiry

4. **Manual Reward Adjustment**
   - Add / Deduct points with reason (admin only)

**Frontend impact:** User's `/account?section=rewards` panel shows their points balance. Admin adjustments reflect immediately via Realtime.

---

## 5. Frontend Dashboard Sync Plan

For each admin feature added, here is the matching user-facing feature and sync mechanism:

### 5.1 Profile Update Sync
| Admin Action | User Sees | Sync Mechanism |
|---|---|---|
| Admin edits name/phone/bio | Reflected in `/account` profile panel | Cache invalidation on next load or Supabase Realtime on `profiles` table |
| Admin changes avatar | New avatar shown in sidebar | Same |

### 5.2 Security Sync

**New User Pages Required (frontend `main/src/pages/account/security/`):**

#### `/account/security` — Security Hub
The main security landing page replacing the stub in `SettingsPage.jsx`. Sections:
- Password Status (last changed date) → link to change password
- 2FA Status badge → link to 2FA setup/management
- Active Sessions count → link to sessions page
- Recent login activity summary → link to full history

#### `/account/security/change-password`
```
Current Password → New Password → Confirm New Password → Save
```
- Client-side: zxcvbn strength meter, confirm match validation
- API: `POST /user/security/change-password`
- After success: writes to `user_security_log`, broadcasts Realtime event (optional logout of other sessions checkbox)

#### `/account/security/change-email`
```
Current Email (display) → New Email → Password Confirmation → Request Change
```
- Sends verification email to new address via Supabase Auth
- Shows "pending change" state with countdown/cancel option
- API: `POST /user/security/change-email`

#### `/account/security/two-factor`
```
Step 1: Enable 2FA — show QR code (TOTP), input code to verify
Step 2: Show backup codes (download/copy, acknowledge)
Step 3: Active state — show status, option to disable (requires password)
```
- References: `gamers-arena.bugfinder.app/user/twostep-security`
- Backend: Supabase `supabase.auth.mfa.enroll()` + `challenge()` + `verify()`
- Admin panel sync: TAB 3 Security shows `is_2fa_enabled = true`
- If admin disables 2FA → user's page shows `Disabled` state next time they load

#### `/account/security/sessions`
```
Active Sessions list → each row: Device | Location | Last Active | [Revoke]
[Revoke All Other Sessions] button
```
- API: `GET /user/security/sessions`, `DELETE /user/security/sessions/:sessionId`
- If admin revokes session from admin panel → Supabase Auth immediately invalidates that JWT → user gets 401 on next request → redirected to login

### 5.3 Wallet Sync

**Existing `WalletPanel` in `DesktopAccountView.jsx` must be wired to real data:**
- Balance: `GET /user/wallet/balance` → reads `profiles.wallet_balance` or computes from `wallet_transactions`
- Transactions: `GET /user/wallet/transactions?page=1&limit=20`
- Supabase Realtime: subscribe to `wallet_transactions` WHERE `user_id = currentUser.id` → update balance display on new row insert

**Admin wallet adjustment → User sees balance change:**
```
Admin credits 100 PKS
  → INSERT into wallet_transactions (user_id, amount=100, type='admin_credit', actor_id=admin_id)
  → Supabase Realtime fires for this user_id subscription
  → User's wallet balance updates live (no page refresh needed)
```

### 5.4 KYC Sync

**New User Page: `/account/verification`**
- Shows current tier badge (Unverified / Basic / Verified)
- Shows what's required to upgrade tier
- Documents submission form (file upload to Supabase Storage bucket `kyc-documents`)
- Admin approval → tier updates in `user_kyc` table → Realtime syncs to user's badge

### 5.5 Settings Sync

**`SettingsPage.jsx` must stop using local state and connect to `user_settings` Supabase table:**

| Setting | Table Column | API Endpoint |
|---|---|---|
| Email Updates | `user_settings.email_notifications` | `PATCH /user/settings` |
| SMS Alerts | `user_settings.sms_notifications` | Same |
| Marketing | `user_settings.marketing_emails` | Same |
| Order Status | `user_settings.order_notifications` | Same |
| Login Alerts | `user_settings.login_alerts` | Same |

---

## 6. Supabase Database Schema

### 6.1 Enums

```sql
-- User status
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'banned');

-- User role
CREATE TYPE user_role AS ENUM ('user', 'admin', 'reseller', 'support');

-- Wallet transaction type
CREATE TYPE wallet_tx_type AS ENUM (
  'credit',           -- admin credits
  'debit',            -- admin debit
  'purchase',         -- user purchases a product
  'refund',           -- order refund
  'referral_bonus',   -- earned via referral
  'reward_redemption' -- spent points for coins
);

-- KYC verification tier
CREATE TYPE kyc_tier AS ENUM ('unverified', 'basic', 'verified', 'premium');

-- KYC status per check
CREATE TYPE kyc_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- Admin note priority
CREATE TYPE note_priority AS ENUM ('normal', 'important', 'flag');

-- Activity action category
CREATE TYPE activity_action AS ENUM (
  'login', 'logout', 'login_failed',
  'profile_update', 'email_change', 'password_changed', 'password_reset',
  '2fa_enabled', '2fa_disabled',
  'order_placed', 'order_cancelled', 'order_refunded',
  'wallet_credit', 'wallet_debit',
  'kyc_submitted', 'kyc_approved', 'kyc_rejected',
  'account_suspended', 'account_banned', 'account_reactivated',
  'session_revoked'
);

-- Referral status
CREATE TYPE referral_status AS ENUM ('pending', 'active', 'rewarded', 'expired');
```

---

### 6.2 Tables

#### Table: `profiles`
Extends Supabase `auth.users`. The primary user data table.

```sql
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,                  -- mirror of auth.users.email (denormalized for queries)
  name            TEXT NOT NULL,
  username        TEXT UNIQUE,
  phone           TEXT,
  avatar_url      TEXT,
  bio             TEXT,
  role            user_role NOT NULL DEFAULT 'user',
  status          user_status NOT NULL DEFAULT 'active',
  timezone        TEXT DEFAULT 'UTC',
  language        TEXT DEFAULT 'en',
  wallet_balance  NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  referral_code   TEXT UNIQUE,
  referred_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);
```

**Relationships:**
- `id` → `auth.users.id` (1:1)
- `referred_by` → `profiles.id` (self-referential M:1)

---

#### Table: `user_settings`
Stores per-user preferences. One row per user.

```sql
CREATE TABLE user_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  email_notifications   BOOLEAN NOT NULL DEFAULT TRUE,
  sms_notifications     BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_emails      BOOLEAN NOT NULL DEFAULT TRUE,
  order_notifications   BOOLEAN NOT NULL DEFAULT TRUE,
  login_alerts          BOOLEAN NOT NULL DEFAULT TRUE,
  dark_mode             BOOLEAN NOT NULL DEFAULT FALSE,
  compact_view          BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
```

---

#### Table: `wallet_transactions`
Immutable ledger of all wallet events. **Never UPDATE or DELETE rows.**

```sql
CREATE TABLE wallet_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            wallet_tx_type NOT NULL,
  amount          NUMERIC(12, 2) NOT NULL,           -- positive = credit, negative = debit
  balance_after   NUMERIC(12, 2) NOT NULL,            -- snapshot of balance after this tx
  reference       TEXT,                               -- human-readable reason
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  actor_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- admin who made adjustment
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_wallet_tx_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_tx_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX idx_wallet_tx_type ON wallet_transactions(type);
CREATE INDEX idx_wallet_tx_order_id ON wallet_transactions(order_id);
```

**Atomicity rule:** Balance updates MUST use a Postgres function:
```sql
CREATE OR REPLACE FUNCTION adjust_wallet_balance(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type wallet_tx_type,
  p_reference TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL
) RETURNS wallet_transactions AS $$
DECLARE
  v_balance NUMERIC;
  v_tx wallet_transactions;
BEGIN
  -- Lock the row
  SELECT wallet_balance INTO v_balance
  FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF v_balance + p_amount < 0 THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- Update balance
  UPDATE profiles SET wallet_balance = wallet_balance + p_amount
  WHERE id = p_user_id;

  -- Write ledger entry
  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reference, actor_id, order_id)
  VALUES (p_user_id, p_type, p_amount, v_balance + p_amount, p_reference, p_actor_id, p_order_id)
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### Table: `user_status_history`
Immutable log of every account status change.

```sql
CREATE TABLE user_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  old_status      user_status,
  new_status      user_status NOT NULL,
  reason          TEXT,
  changed_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- admin actor
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_history_user_id ON user_status_history(user_id);
CREATE INDEX idx_status_history_created_at ON user_status_history(created_at DESC);
```

---

#### Table: `user_bans`
Separate table for active bans (allows expiry and detailed reason).

```sql
CREATE TABLE user_bans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason          TEXT NOT NULL,
  banned_by       UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  expires_at      TIMESTAMPTZ,                      -- NULL = permanent
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  lifted_at       TIMESTAMPTZ,
  lifted_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  lift_reason     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bans_user_id ON user_bans(user_id);
CREATE INDEX idx_bans_is_active ON user_bans(is_active) WHERE is_active = TRUE;
```

---

#### Table: `user_kyc`
Verification status per user.

```sql
CREATE TABLE user_kyc (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  tier              kyc_tier NOT NULL DEFAULT 'unverified',
  identity_status   kyc_status NOT NULL DEFAULT 'pending',
  address_status    kyc_status NOT NULL DEFAULT 'pending',
  phone_status      kyc_status NOT NULL DEFAULT 'pending',
  verified_at       TIMESTAMPTZ,
  verified_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kyc_user_id ON user_kyc(user_id);
CREATE INDEX idx_kyc_tier ON user_kyc(tier);
```

---

#### Table: `user_kyc_history`
Immutable log of all KYC tier changes.

```sql
CREATE TABLE user_kyc_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  old_tier    kyc_tier,
  new_tier    kyc_tier NOT NULL,
  reason      TEXT,
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kyc_history_user_id ON user_kyc_history(user_id);
```

---

#### Table: `user_activity_log`
Append-only audit log of all user actions.

```sql
CREATE TABLE user_activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action      activity_action NOT NULL,
  description TEXT,
  ip_address  INET,
  user_agent  TEXT,
  country     TEXT,
  city        TEXT,
  metadata    JSONB DEFAULT '{}',
  actor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- for admin-initiated actions
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for query patterns
CREATE INDEX idx_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_activity_user_id_created ON user_activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_action ON user_activity_log(action);
CREATE INDEX idx_activity_created_at ON user_activity_log(created_at DESC);
CREATE INDEX idx_activity_ip ON user_activity_log(ip_address);
```

---

#### Table: `user_login_history`
Login attempts (success + failed). Kept separate from activity for quick security queries.

```sql
CREATE TABLE user_login_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address      INET,
  user_agent      TEXT,
  country         TEXT,
  city            TEXT,
  device_type     TEXT,        -- 'mobile' | 'desktop' | 'tablet'
  browser         TEXT,
  success         BOOLEAN NOT NULL,
  failure_reason  TEXT,        -- 'wrong_password' | 'account_suspended' | '2fa_failed' etc.
  used_2fa        BOOLEAN NOT NULL DEFAULT FALSE,
  session_id      TEXT,        -- Supabase session ID for active session correlation
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_user_id ON user_login_history(user_id);
CREATE INDEX idx_login_created_at ON user_login_history(created_at DESC);
CREATE INDEX idx_login_ip ON user_login_history(ip_address);
CREATE INDEX idx_login_success ON user_login_history(user_id, success);
```

---

#### Table: `admin_user_notes`
Internal admin notes on a user.

```sql
CREATE TABLE admin_user_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  priority    note_priority NOT NULL DEFAULT 'normal',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_user_id ON admin_user_notes(user_id);
CREATE INDEX idx_notes_admin_id ON admin_user_notes(admin_id);
```

---

#### Table: `user_2fa_config`
Tracks 2FA enrollment state (supplements Supabase auth.mfa_factors).

```sql
CREATE TABLE user_2fa_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  is_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  method          TEXT DEFAULT 'totp',    -- 'totp' | 'sms'
  enabled_at      TIMESTAMPTZ,
  disabled_at     TIMESTAMPTZ,
  disabled_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL = self, UUID = admin
  backup_codes_generated_at TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_2fa_user_id ON user_2fa_config(user_id);
```

---

#### Table: `referrals`
Tracks who referred whom and commission earned.

```sql
CREATE TABLE referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status          referral_status NOT NULL DEFAULT 'pending',
  commission      NUMERIC(12, 2) DEFAULT 0.00,
  rewarded_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_id ON referrals(referred_id);
```

---

#### Table: `orders`
*(Existing concept — defined for FK references above.)*

```sql
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL,   -- references products table
  quantity        INTEGER NOT NULL DEFAULT 1,
  total_amount    NUMERIC(12, 2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'PKS',
  status          TEXT NOT NULL DEFAULT 'pending',
  payment_method  TEXT,
  payment_id      TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

---

### 6.3 Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_kyc ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_2fa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- profiles: users read their own, admins read all
CREATE POLICY "profiles_user_read_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_admin_read_all"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support'))
  );

CREATE POLICY "profiles_user_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    -- Users cannot change their own role or status
    role = (SELECT role FROM profiles WHERE id = auth.uid()) AND
    status = (SELECT status FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "profiles_admin_update_any"
  ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- wallet_transactions: users read their own, admins read all, inserts via service role only
CREATE POLICY "wallet_tx_user_read_own"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "wallet_tx_admin_read_all"
  ON wallet_transactions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support'))
  );

-- wallet inserts must go through the service role (adjust_wallet_balance function)
-- No direct INSERT policy for end users

-- admin_user_notes: only admin/support can read/write
CREATE POLICY "notes_admin_only"
  ON admin_user_notes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support'))
  );

-- user_settings: user reads/writes own, admin reads all
CREATE POLICY "settings_user_own"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "settings_admin_read"
  ON user_settings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support'))
  );

-- user_activity_log: user reads own, admin reads all, insert via service role
CREATE POLICY "activity_user_read_own"
  ON user_activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "activity_admin_read_all"
  ON user_activity_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'support'))
  );
```

---

### 6.4 Supabase Realtime Subscriptions Required

| Table | Channel | Subscriber | Purpose |
|---|---|---|---|
| `wallet_transactions` | `wallet:user_id=eq.{id}` | Frontend user | Live balance update |
| `profiles` | `profile:id=eq.{id}` | Frontend user | Live profile/status sync |
| `user_settings` | `settings:user_id=eq.{id}` | Frontend user | Live settings sync |
| `user_2fa_config` | `2fa:user_id=eq.{id}` | Frontend user | Show 2FA status change |
| `user_kyc` | `kyc:user_id=eq.{id}` | Frontend user | Show tier upgrade |

---

## 7. API Endpoints

All admin endpoints require `Authorization: Bearer <admin_token>` and the authenticated admin's role is checked server-side.

### 7.1 Admin User Endpoints

```
GET    /admin/users                          List users (paginated, filterable)
GET    /admin/users/:id                      Get full user detail
PATCH  /admin/users/:id                      Update profile info (name, email, phone, role)
DELETE /admin/users/:id                      Delete user (requires confirmation token)

PATCH  /admin/users/:id/status               Update status (active/inactive/suspended/banned)
POST   /admin/users/:id/ban                  Ban user (body: reason, expires_at?)
POST   /admin/users/:id/unban                Lift ban (body: lift_reason)

POST   /admin/users/:id/reset-password       Send password reset email via Supabase Auth
POST   /admin/users/:id/force-logout         Revoke all Supabase sessions for user
POST   /admin/users/:id/change-email         Override email (body: new_email)
POST   /admin/users/:id/disable-2fa          Disable all MFA factors (body: reason)

GET    /admin/users/:id/wallet               Get wallet summary (balance, stats)
POST   /admin/users/:id/wallet/adjust        Credit/debit wallet (body: amount, type, reference)
GET    /admin/users/:id/wallet/transactions  Paginated transaction history

GET    /admin/users/:id/sessions             Get active sessions list
DELETE /admin/users/:id/sessions/:sessionId  Revoke specific session

GET    /admin/users/:id/activity             Paginated activity log (filterable)
GET    /admin/users/:id/login-history        Paginated login history

GET    /admin/users/:id/kyc                  Get KYC status
PATCH  /admin/users/:id/kyc                  Update KYC tier (body: tier, reason)

GET    /admin/users/:id/2fa                  Get 2FA config
DELETE /admin/users/:id/2fa                  Disable 2FA (body: reason)

GET    /admin/users/:id/notes                Get admin notes
POST   /admin/users/:id/notes                Create note
PATCH  /admin/users/:id/notes/:noteId        Edit note
DELETE /admin/users/:id/notes/:noteId        Delete note

GET    /admin/users/:id/referrals            Get referral data
PATCH  /admin/users/:id/rewards              Adjust reward points

POST   /admin/users/:id/notify               Send notification (body: title, message, channels)

GET    /admin/users/export                   Export users CSV/XLSX
GET    /admin/users/stats                    Aggregate stats (total, active, new this month, etc.)
```

### 7.2 User (Self-Service) Endpoints

```
GET    /user/profile                         Get own profile
PATCH  /user/profile                         Update own profile (name, phone, bio, username)
POST   /user/profile/avatar                  Upload avatar to Supabase Storage

GET    /user/settings                        Get own settings
PATCH  /user/settings                        Update own settings

GET    /user/wallet/balance                  Get current balance
GET    /user/wallet/transactions             Paginated own transaction history

POST   /user/security/change-password        Change own password (body: currentPassword, newPassword)
POST   /user/security/change-email           Request email change (body: newEmail, password)
POST   /user/security/verify-email-change    Confirm email change token

GET    /user/security/2fa/status             Get 2FA enrollment status
POST   /user/security/2fa/enroll             Start TOTP enrollment (returns QR code)
POST   /user/security/2fa/verify             Verify TOTP code to confirm enrollment
POST   /user/security/2fa/disable            Disable 2FA (body: password + totp code)
GET    /user/security/2fa/backup-codes       Get/regenerate backup codes

GET    /user/security/sessions               Get active sessions
DELETE /user/security/sessions/:sessionId    Revoke specific session
DELETE /user/security/sessions/others        Revoke all sessions except current

GET    /user/security/login-history          Paginated own login history

GET    /user/kyc                             Get own KYC status
POST   /user/kyc/submit                      Submit KYC documents

GET    /user/referrals                       Get referral summary + referred users list
GET    /user/rewards                         Get points balance + history
```

### 7.3 Response Envelope Format

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "meta": {               // for paginated responses
    "page": 1,
    "limit": 20,
    "total": 450,
    "totalPages": 23
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "User does not have enough wallet balance",
    "details": { "current": 10.00, "requested": 50.00 }
  }
}
```

---

## 8. Security Considerations

### 8.1 Admin Action Security
- **All admin mutations** must be logged in `user_activity_log` with `actor_id` = admin's ID.
- **Destructive actions** (delete user, ban, disable 2FA) must show a confirmation modal requiring the admin to type the action word.
- **Support role** is explicitly restricted from: changing roles, banning users, deleting accounts, making wallet adjustments. Enforced at both UI (buttons hidden) and API (middleware check).
- **Admin session timeout**: set to 30 minutes of inactivity. Already partially implemented via `updateLastActivity` in `AuthContext`.

### 8.2 Wallet Security
- All balance changes go through the `adjust_wallet_balance()` Postgres function — **never direct UPDATE on `wallet_balance`**.
- Balance is double-tracked: `profiles.wallet_balance` for fast reads + `wallet_transactions` ledger for reconciliation.
- A nightly cron (Supabase Edge Function + `pg_cron`) should reconcile the two and alert on discrepancies.
- Admin wallet adjustments require a mandatory `reference` field (not optional).

### 8.3 2FA Security
- Use Supabase's built-in MFA via `supabase.auth.mfa.*` — do not implement custom TOTP.
- When admin disables a user's 2FA, write a record to `user_activity_log` with `action = '2fa_disabled'` and `actor_id = admin_id`.
- Backup codes must be hashed (bcrypt) before storing. Show once, never show again.
- Admin cannot VIEW backup codes — only the user can generate them.

### 8.4 Email Change Security
- Email changes require the user to verify the new address before it takes effect.
- Admin-forced email change bypasses user verification but still sends a notification to the old email.
- All email changes logged in both `user_activity_log` and `user_security_log` (optional separate table).

### 8.5 Input Validation Rules

| Field | Rule |
|---|---|
| name | 2–100 chars, no HTML |
| email | RFC 5322 format, Supabase uniqueness check |
| phone | E.164 format (`+{country}{number}`), optional |
| username | 3–30 chars, alphanumeric + underscore + hyphen, no spaces, unique |
| wallet adjustment amount | Positive number, max 1,000,000, 2 decimal places |
| ban reason | 10–500 chars, required |
| admin note | 10–1000 chars |
| password (new) | Min 8 chars, 1 uppercase, 1 digit, 1 special char, zxcvbn score ≥ 2 |

### 8.6 Rate Limiting
- `POST /user/security/change-password` → 3 attempts per hour per user
- `POST /user/security/2fa/verify` → 5 attempts per 15 min (lockout on 5th failure)
- `POST /admin/users/:id/reset-password` → 1 per 5 minutes per target user
- Implement via Supabase Edge Functions + Upstash Redis, or use Supabase's built-in auth rate limits

### 8.7 Supabase Storage for Avatars
- Bucket: `avatars` — public read, authenticated write
- RLS: user can only upload to path `avatars/{user_id}/*`
- Max file size: 2MB, accepted types: `image/jpeg, image/png, image/webp`
- Admin can delete any avatar

---

## 9. Recommended Development Order

### Sprint 1 — Database Foundation (Week 1)
**Goal:** All Supabase tables exist and RLS is correctly configured.

1. Create all enums
2. Create `profiles`, `user_settings`, `orders` tables
3. Create `wallet_transactions` + `adjust_wallet_balance()` function
4. Create `user_status_history`, `user_bans`
5. Create `user_kyc`, `user_kyc_history`
6. Create `user_activity_log`, `user_login_history`
7. Create `admin_user_notes`, `user_2fa_config`, `referrals`
8. Apply all RLS policies
9. Enable Realtime on `wallet_transactions`, `profiles`, `user_settings`, `user_2fa_config`, `user_kyc`
10. Write and test `adjust_wallet_balance()` edge cases

**Deliverable:** Supabase schema is live. No UI work.

---

### Sprint 2 — Admin User Detail Page Shell (Week 2)
**Goal:** Dedicated `/users/:id` page with header + tab navigation. No tab content yet.

1. Add route `users/:id` to `App.tsx`
2. Create `admin/src/pages/users/UserDetail.tsx` with:
   - User header card (avatar, name, status badge, quick actions)
   - Tab navigation component (8 tabs)
   - Loading skeleton
3. Create `admin/src/pages/users/index.tsx` (re-export)
4. Update `ManageUsers.tsx` — "View" and "Edit" buttons now navigate to `/users/:id` instead of modal
5. Create `useUserDetail` hook for data fetching

**Deliverable:** Clicking a user in the list opens their detail page (skeleton shown).

---

### Sprint 3 — Overview Tab + Wallet Tab (Week 3)
**Goal:** Two most critical tabs fully functional.

1. Overview tab: profile info form (wired to `PATCH /admin/users/:id`), stats row, status controls
2. Status change modal with reason input → writes to `user_status_history`
3. Force password reset button → calls `POST /admin/users/:id/reset-password`
4. Wallet tab: balance display, adjust form (wired to `adjust_wallet_balance()`), transaction history table

**Deliverable:** Admin can edit a user's profile and credit/debit their wallet.

---

### Sprint 4 — Security Tab + Admin Notes Tab (Week 4)
**Goal:** Admin can manage user's auth security and leave internal notes.

1. Security tab: 2FA status + disable button, force logout, change email form, email verified badge
2. Admin notes tab: create/edit/delete notes with priority

**Deliverable:** Admin can disable 2FA, force logout, and leave internal notes.

---

### Sprint 5 — Activity, Sessions, KYC, Referrals Tabs (Week 5)

1. Activity log tab with filters and pagination
2. Sessions tab: active sessions list + revoke buttons
3. KYC tab: tier controls, history timeline
4. Referrals tab: referral summary + referred users table

**Deliverable:** All 8 admin tabs are functional.

---

### Sprint 6 — Frontend: Wire Edit Profile + Settings (Week 6)
**Goal:** Frontend user dashboard stops being static.

1. `EditProfilePage.jsx` — wire `handleSubmit` to `PATCH /user/profile`
2. `SettingsPage.jsx` — load settings from `user_settings` table on mount, PATCH on toggle
3. Wallet panel — real balance + transaction history from API
4. Orders panel — real orders from API

**Deliverable:** User's profile and settings actually save and load from Supabase.

---

### Sprint 7 — Frontend: Security Pages (Week 7)
**Goal:** Full user security self-service.

1. Create `/account/security` hub page
2. Create `/account/security/change-password` page (functional)
3. Create `/account/security/change-email` page (functional with verification flow)
4. Create `/account/security/two-factor` page (TOTP enroll/disable with QR code)
5. Create `/account/security/sessions` page (view + revoke)
6. Add "Security" nav item to `AccountSidebar` and `sectionItems`

**Deliverable:** Users can change password, set up 2FA, and manage sessions.

---

### Sprint 8 — Realtime Sync + Polish (Week 8)
**Goal:** Live data sync admin ↔ user frontend.

1. Supabase Realtime subscription for wallet balance on frontend
2. Supabase Realtime for profile status (show "Account Suspended" if admin suspends)
3. Supabase Realtime for 2FA config changes
4. Login history writer (Edge Function triggered on Supabase Auth events)
5. Activity log writer utility function — integrate into all critical actions
6. KYC frontend page (`/account/verification`)
7. Referrals frontend page (`/account?section=rewards` → real data)

**Deliverable:** Full feature parity between admin actions and user-facing state.

---

## 10. Folder & Component Structure

### Admin Panel (`admin/src/`)

```
pages/
  users/
    index.tsx                 ← Re-export + route guard
    UserList.tsx              ← Renamed from ManageUsers.tsx (list view)
    UserDetail.tsx            ← NEW: Main detail page container
    tabs/
      OverviewTab.tsx
      WalletTab.tsx
      SecurityTab.tsx
      KycTab.tsx
      ActivityTab.tsx
      SessionsTab.tsx
      NotesTab.tsx
      ReferralsTab.tsx
    components/
      UserHeaderCard.tsx      ← Avatar, name, status, quick actions
      UserStatChips.tsx       ← Stats row (orders, spent, balance, etc.)
      StatusChangeModal.tsx   ← With reason field + status history
      BanModal.tsx
      WalletAdjustForm.tsx
      TransactionTable.tsx
      ActivityFeed.tsx
      SessionsList.tsx
      NoteEditor.tsx
      KycTierControl.tsx

hooks/
  useUserDetail.ts            ← Fetch + cache user detail data
  useWalletTransactions.ts
  useUserActivity.ts
  useUserSessions.ts

services/
  userService.ts              ← Extend with all new endpoints
  walletService.ts            ← NEW
  adminNotesService.ts        ← NEW
  kycService.ts               ← NEW
```

### Frontend (`main/src/`)

```
pages/
  account/
    index.jsx                 ← Add Security to section items
    DesktopAccountView.jsx    ← Add security section
    MobileAccountView.jsx     ← Add security section
    EditProfilePage.jsx       ← Wire to API
    SettingsPage.jsx          ← Wire to user_settings table
    security/
      SecurityHub.jsx         ← NEW: /account/security
      ChangePasswordPage.jsx  ← NEW
      ChangeEmailPage.jsx     ← NEW
      TwoFactorPage.jsx       ← NEW
      SessionsPage.jsx        ← NEW
      LoginHistoryPage.jsx    ← NEW
    kyc/
      VerificationPage.jsx    ← NEW: /account/verification

contexts/
  UserContext.jsx             ← NEW: Real user data + Supabase Realtime sub

hooks/
  useUserProfile.js           ← NEW: Load + subscribe to profile
  useWalletBalance.js         ← NEW: Load + subscribe to wallet
  useUserSettings.js          ← NEW: Load + patch settings
```

---

## 11. Validation Rules & Edge Cases

### Edge Cases to Handle

1. **Email already taken during admin email change** → API must check Supabase Auth uniqueness before updating; return 409 with clear message.

2. **Wallet debit exceeds balance** → `adjust_wallet_balance()` raises EXCEPTION, API returns 422 `INSUFFICIENT_BALANCE`. Frontend shows toast.

3. **Admin tries to ban another admin** → Backend: check if target user has `role = admin` and if so, require `super_admin` role (or just block). Currently: block with 403.

4. **2FA disable while user is mid-authentication** → Supabase handles this — `signOut` invalidates all sessions. User will be redirected to login.

5. **Concurrent wallet adjustments** → Handled by `FOR UPDATE` lock in `adjust_wallet_balance()`. Sequential execution guaranteed.

6. **User changes email at same time admin changes it** → Last write wins is unacceptable. Implement optimistic locking: include `updated_at` in PATCH body; reject if server's `updated_at` is newer.

7. **Account suspended → user mid-session** → Admin action calls `auth.admin.signOut(userId)`. User gets 401 on next API call. Frontend auth interceptor in `api.ts` redirects to `/login` on 401 only if it can't refresh. Add check: if account suspended, show "Account suspended" page instead of login.

8. **KYC document upload fails** → Use Supabase Storage resumable uploads. On failure, do not update `user_kyc.status`. Show retry prompt.

9. **Referral code collision** → Generate with `nanoid(8)` and retry on unique constraint violation (extremely rare with 8 chars + alphanumeric = 2.8 trillion combinations).

10. **Deleting a user with active orders** → Block deletion if user has orders in `processing` status. Require admin to cancel/refund those orders first, then delete.

---

## 12. Migration Strategy

### From Current State (Modal-Based) to New Architecture

#### Phase 1: Non-Breaking (can deploy independently)
- Add new Supabase tables alongside existing PostgreSQL tables
- The existing `PATCH /admin/users/:id` still works — new tabs are additive
- New route `/users/:id` is additive — old list page still shows

#### Phase 2: Deprecate Modal
- Once `UserDetail.tsx` is complete and tested, update `ManageUsers.tsx`:
  - "Edit" button → navigate to `/users/:id?tab=overview` instead of opening modal
  - Keep modal as fallback for 2 weeks, then remove
- The 5-field `EditUserForm` interface is replaced by the full `UserProfile` type

#### Phase 3: Frontend Settings Migration
- `SettingsPage.jsx` currently uses `useState` with no persistence
- Migration: on first load, if no `user_settings` row exists for user → create one with defaults via `INSERT ... ON CONFLICT DO NOTHING`
- Wire all toggles to `PATCH /user/settings` — no user-facing change in UX, settings just start persisting

#### Phase 4: Auth Migration (Supabase)
- Current: custom JWT with `admin_token` in localStorage + custom auth server at `localhost:3001`
- Target: Supabase Auth tokens
- The `AuthContext.tsx` already abstracts auth — swap `authService` implementation from custom API to Supabase client. No component changes needed outside `authService.ts`.
- Keep existing `ROLE_PERMISSIONS` structure — map Supabase JWT `app_metadata.role` to existing `UserRole` enum.

---

## Summary Table: All New Database Tables

| Table | Rows Est. | Realtime | RLS | Key Purpose |
|---|---|---|---|---|
| `profiles` | 1 per user | ✅ | ✅ | Core user data + balance |
| `user_settings` | 1 per user | ✅ | ✅ | User preferences |
| `wallet_transactions` | High (1000s/day) | ✅ | ✅ | Immutable wallet ledger |
| `user_status_history` | Low | ❌ | ✅ | Status change audit |
| `user_bans` | Low | ❌ | ✅ | Active bans + reasons |
| `user_kyc` | 1 per user | ✅ | ✅ | KYC verification tier |
| `user_kyc_history` | Low | ❌ | ✅ | KYC change audit |
| `user_activity_log` | Very High | ❌ | ✅ | Full user audit trail |
| `user_login_history` | High | ❌ | ✅ | Login attempts log |
| `admin_user_notes` | Low | ❌ | ✅ | Internal admin notes |
| `user_2fa_config` | 1 per user | ✅ | ✅ | 2FA enrollment state |
| `referrals` | Medium | ❌ | ✅ | Referral relationships |
| `orders` | High | ❌ | ✅ | Purchase records |

**Total new tables: 13** | **Realtime-enabled: 5** | **All with RLS: 13**

---

*Document version 1.0 — Pixie-Kat internal use only*
