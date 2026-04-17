# Auth Migration Checklist: SQLite → PostgreSQL (AWS RDS)

## Summary of Changes

Your authentication system has been updated to work with PostgreSQL on AWS with enhanced security. Here's what changed:

---

## Files Modified

### ✅ **1. database-postgres.js** (NEW)
- **Location**: `server/database-postgres.js`
- **Purpose**: PostgreSQL database layer replacing SQLite
- **Key Changes**:
  - Uses `pg` (node-postgres) instead of `sql.js`
  - All functions are now async (return Promises)
  - Connection pooling for better performance
  - SSL support for AWS RDS
  - Error handling and logging

### ✅ **2. index.js** (MODIFIED)
- **Changes Made**:
  - Import from `database-postgres.js` instead of `database.js`
  - Added `await` to all database calls:
    - `await findUserByEmail(email)`
    - `await createUser(name, email, passwordHash)`
    - `await findUserById(id)`
  - Updated CORS to support production origins
  - Environment-based CORS configuration
  - **Security enhancements**:
    - Added `helmet()` for security headers
    - Global rate limiting (100 requests/15min)
    - Auth rate limiting on signup and login (5 attempts/15min)

### ✅ **3. package.json** (MODIFIED)
- **Changes Made**:
  - Removed: `sql.js` (SQLite)
  - Added: `pg` (PostgreSQL driver)
  - Added: `helmet` (Security headers)

### ✅ **4. .env.example.aws** (NEW)
- **Purpose**: Template for production environment variables
- **Contains**:
  - AWS RDS connection details
  - JWT secret configuration
  - CORS origin for CloudFront

---

## Database Schema Changes

### Old (SQLite)
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### New (PostgreSQL)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,                    -- Changed from INTEGER AUTOINCREMENT
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);  -- Added index for performance
```

**Key Difference**: `SERIAL` in PostgreSQL = `INTEGER AUTOINCREMENT` in SQLite

---

## Code Changes Required

### Before (SQLite - Synchronous)
```javascript
const user = findUserByEmail(email);
const userId = createUser(name, email, passwordHash);
```

### After (PostgreSQL - Asynchronous)
```javascript
const user = await findUserByEmail(email);
const userId = await createUser(name, email, passwordHash);
```

**All database functions now return Promises and must use `await`**

---

## Environment Variables Required

Create a `.env` file on your EC2 instance with these variables:

```env
# Server
PORT=3000
NODE_ENV=production

# AWS RDS PostgreSQL
DB_HOST=your-db-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=pixiekat_auth
DB_USER=pixiekat_admin
DB_PASSWORD=your_secure_password

# Security
JWT_SECRET=generate_a_long_random_string_here

# CORS (Update after frontend deployment)
CORS_ORIGIN=https://your-cloudfront-domain.cloudfront.net
```

---

## Installation Steps

### Local Testing (Optional)
```bash
cd server

# Install new dependencies
npm install

# Setup local PostgreSQL (if testing locally)
# Or skip to AWS deployment
```

### AWS Deployment
```bash
# On EC2 instance
cd ~/pixiekat-backend/server

# Install dependencies
npm install

# Create .env file (see above)
nano .env

# Test database connection
node -e "import('./database-postgres.js').then(m => m.initDb()).then(() => console.log('✓ Connected')).catch(e => console.error('✗ Error:', e))"

# Start with PM2
pm2 start index.js --name pixiekat-backend
pm2 save
```

---

## Data Migration (If Needed)

If you have existing users in SQLite that need to be migrated:

### Step 1: Export from SQLite
```javascript
// Run locally with old database.js
import { getDb } from './database.js';
import fs from 'fs';

const db = getDb();
const stmt = db.prepare('SELECT * FROM users');
const users = [];

while (stmt.step()) {
  users.push(stmt.getAsObject());
}
stmt.free();

fs.writeFileSync('users-export.json', JSON.stringify(users, null, 2));
console.log(`Exported ${users.length} users`);
```

### Step 2: Install Dependencies

```bash
# Install all required packages
npm install pg dotenv helmet

# pg - PostgreSQL driver for database
# dotenv - Environment variable management
# helmet - Security headers middleware
```

### Step 3: Import to PostgreSQL
```javascript
// Run on EC2 with database-postgres.js
import { createUser } from './database-postgres.js';
import fs from 'fs';

const users = JSON.parse(fs.readFileSync('users-export.json', 'utf8'));

for (const user of users) {
  try {
    // Note: password_hash is already hashed, so we insert it directly
    await pool.query(
      'INSERT INTO users (name, email, password_hash, created_at) VALUES ($1, $2, $3, $4)',
      [user.name, user.email, user.password_hash, user.created_at]
    );
    console.log(`✓ Migrated: ${user.email}`);
  } catch (error) {
    console.error(`✗ Failed: ${user.email}`, error.message);
  }
}
```

---

## Testing Checklist

### ✅ Database Connection
```bash
# Test connection
psql -h YOUR_RDS_ENDPOINT -U pixiekat_admin -d pixiekat_auth
# Enter password when prompted
```

### ✅ API Endpoints
```bash
# Health check
curl http://YOUR_EC2_IP:3000/api/health

# Test signup
curl -X POST http://YOUR_EC2_IP:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test123!","confirmPassword":"Test123!"}'

# Test login
curl -X POST http://YOUR_EC2_IP:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### ✅ Database Queries
```sql
-- Connect to database
psql -h YOUR_RDS_ENDPOINT -U pixiekat_admin -d pixiekat_auth

-- Check users table
SELECT * FROM users;

-- Verify index
\d users
```

---

## Security Considerations

### ✅ **Connection Security**
- SSL enabled for RDS connections in production
- Connection pooling limits (max 20 connections)
- Timeout configurations

### ✅ **Environment Variables**
- Never commit `.env` to Git
- Use strong, random JWT secret (64+ characters)
- Rotate database password regularly

### ✅ **Database Access**
- Restrict RDS security group to EC2 IP only
- Use strong database password
- Enable automated backups (7 days)

---

## Rollback Plan

If you need to rollback to SQLite:

1. Change import in `index.js`:
   ```javascript
   import { initDb, findUserByEmail, createUser, findUserById } from './database.js';
   ```

2. Remove `await` from database calls (revert to synchronous)

3. Reinstall `sql.js`:
   ```bash
   npm install sql.js
   npm uninstall pg
   ```

---

## Performance Improvements

PostgreSQL offers several advantages over SQLite:

- **Concurrent Access**: Multiple connections simultaneously
- **Connection Pooling**: Reuse connections for better performance
- **Indexing**: Email lookups are faster with index
- **Scalability**: Can handle more users and requests
- **ACID Compliance**: Better data integrity
- **Backup & Recovery**: Automated backups on AWS

---

## Troubleshooting

### Error: "Connection refused"
- Check RDS security group allows EC2 IP
- Verify DB_HOST endpoint is correct
- Ensure RDS instance is running

### Error: "password authentication failed"
- Verify DB_USER and DB_PASSWORD in .env
- Check RDS master password

### Error: "SSL connection required"
- Ensure SSL is enabled in database-postgres.js
- RDS requires SSL in production

### Error: "too many connections"
- Check connection pool settings
- Ensure connections are being released
- Monitor RDS connections in AWS Console

---

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Create `.env` file with AWS RDS credentials
3. ✅ Test database connection
4. ✅ Deploy to EC2
5. ✅ Update frontend API endpoint
6. ✅ Test authentication flow end-to-end
7. ✅ Monitor logs and performance

---

## Support

- AWS RDS Docs: https://docs.aws.amazon.com/rds/
- node-postgres Docs: https://node-postgres.com/
- PostgreSQL Docs: https://www.postgresql.org/docs/

---

**Migration Status**: ✅ Code Ready for Deployment
**Estimated Migration Time**: 30-60 minutes
**Downtime Required**: ~5 minutes (during deployment)
