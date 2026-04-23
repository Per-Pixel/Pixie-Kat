# PixieKat Authentication Server

Backend authentication server for PixieKat with SQLite database, bcrypt password hashing, and JWT-based sessions.

## Features

- ✅ User registration with validation
- ✅ Secure login with bcrypt password hashing
- ✅ JWT tokens stored in httpOnly cookies
- ✅ Rate limiting (5 login attempts per 15 minutes)
- ✅ Password requirements (8+ chars, uppercase, number)
- ✅ Email validation and duplicate prevention
- ✅ Session expiration (7 days)
- ✅ Protected routes with auth middleware

## Setup

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Update `JWT_SECRET` with a strong secret key

3. **Start the server:**
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:3001`

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user (protected)

### Protected Example

- `GET /api/protected` - Example protected route

## Database

SQLite database (`auth.db`) is automatically created on first run with the following schema:

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Features

- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Tokens**: Signed with secret, 7-day expiration
- **httpOnly Cookies**: Prevents XSS attacks
- **Rate Limiting**: 5 login attempts per 15 minutes per IP
- **Generic Error Messages**: "Invalid email or password" (doesn't reveal if email exists)
- **Email Normalization**: Lowercase storage
- **CORS**: Configured for localhost:5173 (frontend)

## Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- Must match confirmation password

## Environment Variables

```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3001
NODE_ENV=development
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure CORS for your production domain
4. Use HTTPS
5. Consider using PostgreSQL instead of SQLite
6. Add additional security headers (helmet.js)
7. Implement refresh tokens for better security
