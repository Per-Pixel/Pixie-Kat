# Pixie-Kat — Supabase Setup Guide

## Step 1 — Create a Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com) and sign in
2. Click **New project**
3. Choose a name (e.g. `pixiekat`), set a strong database password, pick your region
4. Wait ~2 minutes for the project to provision

---

## Step 2 — Get Your API Keys

In your Supabase project dashboard:
- Go to **Project Settings → API**
- Copy:
  - **Project URL** → `https://xxxx.supabase.co`
  - **anon / public key** → starts with `eyJ...`
  - **service_role key** → starts with `eyJ...` (**keep this secret — server only**)

---

## Step 3 — Run the SQL Migrations

In your Supabase project:
1. Go to **SQL Editor**
2. Open `supabase/migrations/001_initial_schema.sql` and paste + run it
3. Open `supabase/migrations/002_functions_triggers.sql` and paste + run it

Both should complete with no errors.

---

## Step 4 — Configure Environment Variables

### `admin/.env`
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_NAME=PixieKat Admin
VITE_APP_VERSION=1.0.0

VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### `main/.env`  *(create this file — it is gitignored)*
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### `main/server/.env`  *(copy from .env.example)*
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here   # ← service role, NOT anon
```

---

## Step 5 — Migrate Existing Users (optional)

If you have existing users in the old PostgreSQL database, you need to re-create them in Supabase Auth.

> **Note:** Password hashes are NOT compatible between bcrypt (old) and Supabase Auth (new). Users will need to reset their passwords. The script sends them a reset email.

Add your old PostgreSQL credentials to `main/server/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pixiekat
DB_USER=postgres
DB_PASSWORD=your-postgres-password
```

Then run:
```bash
cd scripts
node migrate-users-to-supabase.js
```

The script is safe to re-run — it skips already-migrated users.

---

## Step 6 — Create the First Admin User

Since admin users need `role = 'admin'` in the `profiles` table, do this after signing up:

1. Sign up via the app (or directly in Supabase Auth dashboard)
2. In Supabase SQL Editor, run:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
```

---

## Step 7 — Enable Realtime

In your Supabase project:
1. Go to **Database → Replication**
2. Verify these tables are in the `supabase_realtime` publication:
   - `profiles`
   - `user_settings`
   - `wallet_transactions`
   - `user_2fa_config`
   - `user_kyc`

If not, the `002_functions_triggers.sql` handles this — re-run the last block of that file.

---

## Step 8 — Configure Auth Settings (optional but recommended)

In **Authentication → Settings**:

| Setting | Recommended Value |
|---|---|
| Site URL | `http://localhost:5173` (dev) |
| Redirect URLs | `http://localhost:5173/**` |
| Enable email confirmations | Yes |
| Minimum password length | 8 |
| JWT expiry | 3600 (1 hour) |

---

## Architecture After Migration

```
Frontend (main)          Admin Panel (admin)        Admin Proxy (server)
     │                         │                           │
     │ anon key + JWT           │ anon key + JWT            │ service_role key
     ▼                         ▼                           ▼
 Supabase (RLS)         Supabase (RLS)           Supabase Admin SDK
  ├─ auth                ├─ profiles (read all)    ├─ force-logout
  ├─ profiles (own)      ├─ wallet_tx (read all)   ├─ disable-2fa
  ├─ user_settings       ├─ admin_notes            ├─ change-email
  ├─ wallet_tx (own)     └─ etc.                   ├─ reset-password
  └─ etc.                                          ├─ delete-user
                                                   └─ wallet/adjust
```

---

## Running the App

```bash
# Terminal 1 — Admin panel
cd admin && npm run dev

# Terminal 2 — Frontend
cd main && npm run dev

# Terminal 3 — Admin proxy server (for privileged ops)
cd main/server && npm run dev
```

Frontend: `http://localhost:5173`
Admin:    `http://localhost:5174` (or 5175)
Server:   `http://localhost:3001`
