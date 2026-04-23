# Authentication Flow Diagram

## Registration Flow

```
┌─────────────┐
│   Browser   │
│  /register  │
└──────┬──────┘
       │
       │ 1. User fills form
       │    - Name
       │    - Email
       │    - Password
       │    - Confirm Password
       │
       ▼
┌─────────────────┐
│  Auth Component │
│  (Frontend)     │
└────────┬────────┘
         │
         │ 2. Form validation
         │    - Passwords match?
         │
         ▼
┌─────────────────┐
│  AuthContext    │
│  register()     │
└────────┬────────┘
         │
         │ 3. POST /api/auth/signup
         │    {name, email, password, confirmPassword}
         │
         ▼
┌──────────────────────┐
│  Backend Server      │
│  /api/auth/signup    │
└──────────┬───────────┘
           │
           │ 4. Validate input
           │    - Name required?
           │    - Email valid?
           │    - Email unique?
           │    - Password 8+ chars?
           │    - Has uppercase?
           │    - Has number?
           │    - Passwords match?
           │
           ▼
┌──────────────────────┐
│  bcrypt.hash()       │
│  (10 rounds)         │
└──────────┬───────────┘
           │
           │ 5. Hash password
           │
           ▼
┌──────────────────────┐
│  SQLite Database     │
│  INSERT user         │
└──────────┬───────────┘
           │
           │ 6. Store user
           │    - id (auto)
           │    - name
           │    - email (lowercase)
           │    - password_hash
           │    - created_at
           │
           ▼
┌──────────────────────┐
│  jwt.sign()          │
│  Create token        │
└──────────┬───────────┘
           │
           │ 7. Generate JWT
           │    - userId
           │    - email
           │    - name
           │    - expires: 7d
           │
           ▼
┌──────────────────────┐
│  Set Cookie          │
│  httpOnly, secure    │
└──────────┬───────────┘
           │
           │ 8. Response
           │    - success: true
           │    - user: {id, name, email}
           │    - Cookie: token=...
           │
           ▼
┌──────────────────────┐
│  AuthContext         │
│  setUser()           │
└──────────┬───────────┘
           │
           │ 9. Update state
           │
           ▼
┌──────────────────────┐
│  Navigate to home    │
│  User is logged in   │
└──────────────────────┘
```

## Login Flow

```
┌─────────────┐
│   Browser   │
│   /login    │
└──────┬──────┘
       │
       │ 1. User enters credentials
       │    - Email
       │    - Password
       │
       ▼
┌─────────────────┐
│  Auth Component │
└────────┬────────┘
         │
         │ 2. POST /api/auth/login
         │    {email, password}
         │
         ▼
┌──────────────────────┐
│  Rate Limiter        │
│  (5 tries / 15 min)  │
└──────────┬───────────┘
           │
           │ 3. Check rate limit
           │    ✓ Under limit
           │
           ▼
┌──────────────────────┐
│  Backend Server      │
│  /api/auth/login     │
└──────────┬───────────┘
           │
           │ 4. Validate email format
           │
           ▼
┌──────────────────────┐
│  SQLite Database     │
│  SELECT user         │
└──────────┬───────────┘
           │
           │ 5. Find user by email
           │    ✓ User found
           │
           ▼
┌──────────────────────┐
│  bcrypt.compare()    │
└──────────┬───────────┘
           │
           │ 6. Compare passwords
           │    ✓ Password matches
           │
           ▼
┌──────────────────────┐
│  jwt.sign()          │
└──────────┬───────────┘
           │
           │ 7. Generate JWT
           │
           ▼
┌──────────────────────┐
│  Set Cookie          │
└──────────┬───────────┘
           │
           │ 8. Response + Cookie
           │
           ▼
┌──────────────────────┐
│  AuthContext         │
│  setUser()           │
└──────────┬───────────┘
           │
           │ 9. Update state
           │
           ▼
┌──────────────────────┐
│  Navigate to home    │
│  User is logged in   │
└──────────────────────┘
```

## Authentication Check Flow (Page Load)

```
┌─────────────┐
│   Browser   │
│  Page Load  │
└──────┬──────┘
       │
       │ 1. App starts
       │
       ▼
┌─────────────────┐
│  AuthProvider   │
│  useEffect()    │
└────────┬────────┘
         │
         │ 2. GET /api/auth/me
         │    Cookie: token=...
         │
         ▼
┌──────────────────────┐
│  Backend Server      │
│  /api/auth/me        │
└──────────┬───────────┘
           │
           │ 3. authMiddleware
           │
           ▼
┌──────────────────────┐
│  Check Cookie        │
│  jwt.verify()        │
└──────────┬───────────┘
           │
           ├─── ✓ Valid token
           │
           ▼
┌──────────────────────┐
│  SQLite Database     │
│  SELECT user by id   │
└──────────┬───────────┘
           │
           │ 4. Get user info
           │
           ▼
┌──────────────────────┐
│  Response            │
│  {success, user}     │
└──────────┬───────────┘
           │
           │ 5. Return user data
           │
           ▼
┌──────────────────────┐
│  AuthContext         │
│  setUser()           │
└──────────┬───────────┘
           │
           │ 6. Update state
           │    isAuthenticated = true
           │
           ▼
┌──────────────────────┐
│  App renders with    │
│  authenticated state │
└──────────────────────┘
```

## Protected Route Flow

```
┌─────────────┐
│   Browser   │
│  /account   │
└──────┬──────┘
       │
       │ 1. Navigate to protected route
       │
       ▼
┌─────────────────────┐
│  ProtectedRoute     │
│  Component          │
└──────────┬──────────┘
           │
           │ 2. Check isAuthenticated
           │
           ├─── ✓ Authenticated
           │    │
           │    ▼
           │  ┌──────────────┐
           │  │ Render page  │
           │  └──────────────┘
           │
           └─── ✗ Not authenticated
                │
                ▼
              ┌────────────────────┐
              │ Navigate to /login │
              │ Save intended path │
              └────────────────────┘
```

## Logout Flow

```
┌─────────────┐
│   Browser   │
│ Click Logout│
└──────┬──────┘
       │
       │ 1. User clicks logout
       │
       ▼
┌─────────────────┐
│  AuthContext    │
│  logout()       │
└────────┬────────┘
         │
         │ 2. POST /api/auth/logout
         │    Cookie: token=...
         │
         ▼
┌──────────────────────┐
│  Backend Server      │
│  /api/auth/logout    │
└──────────┬───────────┘
           │
           │ 3. Clear cookie
           │    res.clearCookie('token')
           │
           ▼
┌──────────────────────┐
│  Response            │
│  {success: true}     │
└──────────┬───────────┘
           │
           │ 4. Cookie cleared
           │
           ▼
┌──────────────────────┐
│  AuthContext         │
│  setUser(null)       │
└──────────┬───────────┘
           │
           │ 5. Clear user state
           │    isAuthenticated = false
           │
           ▼
┌──────────────────────┐
│  Navigate to home    │
│  User is logged out  │
└──────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────┐
│           Frontend Security             │
├─────────────────────────────────────────┤
│  • Form validation                      │
│  • Password strength indicator          │
│  • Protected routes                     │
│  • No token in localStorage             │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│          Transport Security             │
├─────────────────────────────────────────┤
│  • HTTPS (production)                   │
│  • CORS protection                      │
│  • httpOnly cookies                     │
│  • Secure flag (production)             │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│           Backend Security              │
├─────────────────────────────────────────┤
│  • Rate limiting (5/15min)              │
│  • Input validation                     │
│  • bcrypt hashing (10 rounds)           │
│  • JWT verification                     │
│  • Generic error messages               │
│  • Email normalization                  │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│          Database Security              │
├─────────────────────────────────────────┤
│  • Password hashes only                 │
│  • Unique email constraint              │
│  • Prepared statements (SQL injection)  │
└─────────────────────────────────────────┘
```

## Error Handling

```
Registration Errors:
├─ Name required
├─ Valid email required
├─ Email already registered
├─ Password min 8 chars
├─ Password needs uppercase
├─ Password needs number
└─ Passwords do not match

Login Errors:
├─ Invalid email or password (generic)
├─ Too many attempts (rate limit)
└─ Server error

Protected Route Errors:
├─ Unauthorized (no token)
├─ Unauthorized (invalid token)
└─ Unauthorized (expired token)
```
