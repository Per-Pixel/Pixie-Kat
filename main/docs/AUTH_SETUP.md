# Authentication System Setup Guide

This document explains the new authentication system that replaces the mock authentication.

## Overview

The authentication system has been completely rebuilt with:

- **Backend**: Express.js server with SQLite database
- **Security**: bcrypt password hashing + JWT tokens in httpOnly cookies
- **Frontend**: Redesigned login page matching the provided layout
- **Protection**: Rate limiting, route guards, and secure session management

## Quick Start

### 1. Start the Backend Server

```bash
cd server
npm install
npm start
```

The server will run on `http://localhost:3001`

### 2. Start the Frontend

```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

### 3. Create an Account

1. Navigate to `http://localhost:5173/register`
2. Fill in your details:
   - Name (required)
   - Email (valid email format)
   - Password (8+ chars, 1 uppercase, 1 number)
   - Confirm Password (must match)
3. Click "Create Account"

### 4. Login

1. Navigate to `http://localhost:5173/login`
2. Enter your email and password
3. Click "Login"

## What Changed

### ✅ Removed Mock Authentication

**Before:**
- Hardcoded demo credentials (`demo@client.com` / `password123`)
- Client-side only authentication
- No real security
- Data stored in localStorage/sessionStorage

**After:**
- Real user registration and login
- Backend validation and authentication
- Secure password hashing with bcrypt
- JWT tokens in httpOnly cookies
- SQL database for user storage

### ✅ New Login Page Design

The login page has been redesigned to match the provided image layout:

- **Split-screen layout**: Left side shows branding with character image, right side has the login form
- **Dark theme**: Background color `#0a0a0a` (preserved from existing app)
- **Emerald accent**: Buttons and focus states use emerald-500
- **Responsive**: Stacks vertically on mobile, side-by-side on desktop
- **Smooth animations**: Framer Motion for entrance effects

### ✅ Backend Security Features

1. **Password Hashing**: bcrypt with 10 salt rounds
2. **JWT Tokens**: Signed, 7-day expiration, httpOnly cookies
3. **Rate Limiting**: 5 login attempts per 15 minutes
4. **Input Validation**: Email format, password strength, duplicate prevention
5. **Generic Errors**: "Invalid email or password" (doesn't reveal if email exists)
6. **CORS Protection**: Configured for localhost:5173

### ✅ Frontend Updates

1. **AuthContext**: Now uses real API calls instead of mock data
2. **ProtectedRoute**: Component for guarding authenticated routes
3. **Login/Signup Forms**: Updated to work with real backend
4. **Error Handling**: Displays backend validation errors

## API Endpoints

### Public Endpoints

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user (rate limited)

### Protected Endpoints

- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

## Database Schema

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 number (0-9)
- Confirm password must match

## Security Best Practices Implemented

✅ **Never store passwords in plain text** - Using bcrypt hashing  
✅ **httpOnly cookies** - Prevents XSS attacks  
✅ **Secure flag in production** - HTTPS only in production  
✅ **Rate limiting** - Prevents brute force attacks  
✅ **Generic error messages** - Doesn't reveal if email exists  
✅ **Backend validation** - Never trust client-side validation  
✅ **Session expiration** - Tokens expire after 7 days  
✅ **CORS configuration** - Only allows requests from frontend  

## Using Protected Routes

To protect a route, wrap it with the `ProtectedRoute` component:

```jsx
import ProtectedRoute from './components/auth/ProtectedRoute';

<Route 
  path="/account/*" 
  element={
    <ProtectedRoute>
      <AccountPage />
    </ProtectedRoute>
  } 
/>
```

## Environment Variables

### Backend (`server/.env`)

```
JWT_SECRET=pixiekat-dev-secret-key-2024-change-in-production
PORT=3001
NODE_ENV=development
```

⚠️ **Important**: Change `JWT_SECRET` to a strong random string in production!

## File Structure

```
main/
├── server/                    # Backend server
│   ├── index.js              # Main server file
│   ├── database.js           # SQLite database setup
│   ├── middleware/
│   │   └── auth.js           # JWT authentication middleware
│   ├── utils/
│   │   └── validation.js     # Input validation functions
│   ├── package.json          # Backend dependencies
│   ├── .env                  # Environment variables
│   └── auth.db              # SQLite database (auto-created)
│
├── src/
│   ├── contexts/
│   │   └── AuthContext.jsx   # Updated with real API calls
│   ├── components/
│   │   └── auth/
│   │       └── ProtectedRoute.jsx  # Route protection component
│   └── pages/
│       └── auth/
│           └── index.jsx     # Redesigned login/signup page
```

## Testing the System

1. **Create a new account** at `/register`
2. **Login** at `/login`
3. **Check authentication** - You should see your name in the navbar
4. **Try protected routes** - Navigate to `/account`
5. **Logout** - Click logout in the navbar
6. **Try accessing protected route** - You should be redirected to login

## Troubleshooting

### Server won't start
- Make sure port 3001 is not in use
- Check that all dependencies are installed: `cd server && npm install`

### Login fails with network error
- Ensure backend server is running on `http://localhost:3001`
- Check browser console for CORS errors
- Verify `.env` file exists in `server/` directory

### "Invalid email or password" error
- Check that you're using the correct credentials
- Password must meet requirements (8+ chars, uppercase, number)
- Email must be valid format

### Rate limit error
- Wait 15 minutes after 5 failed login attempts
- Or restart the server to reset rate limits

## Production Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Set `NODE_ENV=production`
- [ ] Update CORS origin to your production domain
- [ ] Use HTTPS (secure cookies)
- [ ] Consider PostgreSQL instead of SQLite
- [ ] Add security headers (helmet.js)
- [ ] Implement refresh tokens
- [ ] Add email verification
- [ ] Add password reset functionality
- [ ] Set up proper logging
- [ ] Add monitoring and alerts

## Next Steps

Consider adding:

1. **Email verification** - Send confirmation email on signup
2. **Password reset** - "Forgot password" functionality
3. **Refresh tokens** - More secure than long-lived JWTs
4. **OAuth** - Google/Facebook login
5. **2FA** - Two-factor authentication
6. **Account management** - Update profile, change password
7. **Session management** - View/revoke active sessions
