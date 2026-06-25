# Quick Start Guide - Fix "Failed to load pages"

## Problem
The admin panel shows "Failed to load pages" because:
1. PostgreSQL database is not running
2. `.env` file is missing database credentials

## Solution

### Step 1: Install PostgreSQL (if not installed)

**Windows:**
```bash
# Download from: https://www.postgresql.org/download/windows/
# Or use chocolatey:
choco install postgresql

# Start PostgreSQL service
net start postgresql-x64-14
```

**Alternative: Use SQLite (Simpler)**
If you don't want to install PostgreSQL, I can switch the backend to use SQLite instead (much simpler for development).

### Step 2: Create Database

```bash
# Open PostgreSQL command line
psql -U postgres

# Create database
CREATE DATABASE pixiekat;

# Create user (optional)
CREATE USER pixiekat_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE pixiekat TO pixiekat_user;

# Exit
\q
```

### Step 3: Configure .env File

Create `main/server/.env` with:

```env
# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server
PORT=3001
NODE_ENV=development

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pixiekat
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# CORS (for admin panel)
CORS_ORIGIN=http://localhost:5174
```

### Step 4: Start Server

```bash
cd main/server
npm run dev
```

You should see:
```
✓ Database initialized
✓ CMS tables initialized
🚀 Server running on http://localhost:3001
📁 CMS API: http://localhost:3001/api/admin/pages
🖼️  Media API: http://localhost:3001/api/admin/media
```

### Step 5: Create Admin Account

```bash
# In a new terminal, create an account
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Admin\",\"email\":\"admin@test.com\",\"password\":\"admin123\",\"confirmPassword\":\"admin123\"}"
```

### Step 6: Login to Admin Panel

1. Open admin panel: `http://localhost:5174`
2. Login with:
   - Email: `admin@test.com`
   - Password: `admin123`
3. Navigate to Pages section
4. You should now see the CMS working!

---

## Alternative: Use SQLite (Easier)

If PostgreSQL is too complex, I can switch to SQLite:

**Pros:**
- No installation needed
- File-based database
- Perfect for development
- Easier to backup

**Cons:**
- Less scalable for production
- No concurrent writes

Let me know if you want me to switch to SQLite!

---

## Troubleshooting

### "ECONNREFUSED ::1:5432"
**Problem:** PostgreSQL not running or wrong credentials

**Fix:**
1. Check if PostgreSQL is running:
   ```bash
   # Windows
   sc query postgresql-x64-14
   
   # If not running, start it:
   net start postgresql-x64-14
   ```

2. Verify credentials in `.env` match your PostgreSQL setup

3. Test connection:
   ```bash
   psql -h localhost -U postgres -d pixiekat
   ```

### "Failed to load pages" in admin
**Problem:** Not logged in or server not running

**Fix:**
1. Make sure server is running (`npm run dev` in `main/server`)
2. Login to admin panel first
3. Check browser console for errors (F12)

### "Invalid credentials" when logging in
**Problem:** Account doesn't exist

**Fix:**
1. Create account using signup endpoint (see Step 5 above)
2. Or use the signup form in the admin panel

---

## Current Status

✅ **Frontend (Admin Panel)**
- Pages management UI
- Trash system UI
- Media library UI
- All connected to real API

✅ **Backend (API)**
- All endpoints implemented
- Database schema ready
- Authentication working

❌ **Database**
- PostgreSQL needs to be installed and running
- `.env` needs database credentials

Once you complete Steps 1-3 above, everything will work!
