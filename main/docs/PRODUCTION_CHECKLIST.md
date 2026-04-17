# Production Security Checklist

Before deploying to production, complete these security steps:

## 🚨 Critical (Must Do)

- [ ] **Change JWT_SECRET to a strong random string**
  ```bash
  # Generate a secure secret:
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

- [ ] **Set NODE_ENV=production**
  ```bash
  NODE_ENV=production
  ```

- [ ] **Enable HTTPS**
  - Most hosting providers (Vercel, Netlify, Railway) do this automatically
  - If self-hosting, use Let's Encrypt or Cloudflare

- [ ] **Update CORS origin to your production domain**
  ```javascript
  origin: 'https://your-actual-domain.com'
  ```

- [ ] **Never commit .env file to Git**
  - Already in .gitignore, but double-check
  - Use environment variables in hosting platform

## ⚠️ Highly Recommended

- [ ] **Upgrade to PostgreSQL or MySQL**
  - SQLite has concurrency issues
  - Most hosting platforms offer free PostgreSQL (Supabase, Neon, Railway)

- [ ] **Add security headers with helmet.js**
  ```bash
  npm install helmet
  ```
  ```javascript
  import helmet from 'helmet';
  app.use(helmet());
  ```

- [ ] **Add request logging**
  ```bash
  npm install morgan
  ```
  ```javascript
  import morgan from 'morgan';
  app.use(morgan('combined'));
  ```

- [ ] **Set up monitoring**
  - Use services like Sentry, LogRocket, or Datadog
  - Monitor for errors and suspicious activity

- [ ] **Implement refresh tokens**
  - Current: 7-day JWT (if stolen, valid for 7 days)
  - Better: Short-lived access token + refresh token

- [ ] **Add email verification**
  - Prevent fake email signups
  - Use services like SendGrid, Mailgun, or Resend

- [ ] **Add password reset functionality**
  - Currently "Forgot password?" is just a placeholder
  - Implement email-based password reset

- [ ] **Rate limit all endpoints**
  - Currently only login is rate limited
  - Add global rate limiting for all API calls

## 📊 Optional but Good

- [ ] **Add 2FA (Two-Factor Authentication)**
  - Use libraries like `speakeasy` or `otplib`

- [ ] **Implement account lockout**
  - Lock account after X failed attempts
  - Require email verification to unlock

- [ ] **Add IP-based restrictions**
  - Block known malicious IPs
  - Use services like Cloudflare

- [ ] **Database backups**
  - Automatic daily backups
  - Test restore process

- [ ] **Add CAPTCHA to signup/login**
  - Prevent bot signups
  - Use Google reCAPTCHA or hCaptcha

- [ ] **Implement session management**
  - Allow users to view active sessions
  - Allow users to revoke sessions

- [ ] **Add audit logging**
  - Log all authentication events
  - Track login attempts, password changes, etc.

## 🔍 Security Testing

Before going live:

- [ ] **Test SQL injection**
  - Try malicious inputs in all forms
  - Should be protected by parameterized queries

- [ ] **Test XSS attacks**
  - Try injecting scripts in inputs
  - Should be protected by httpOnly cookies

- [ ] **Test CSRF attacks**
  - Should be protected by sameSite cookies

- [ ] **Test rate limiting**
  - Try 6+ login attempts
  - Should block after 5 attempts

- [ ] **Test password requirements**
  - Try weak passwords
  - Should reject passwords without uppercase/number

- [ ] **Test duplicate email**
  - Try registering same email twice
  - Should reject with proper error

## 📝 Environment Variables for Production

Create these in your hosting platform:

```bash
# Required
NODE_ENV=production
JWT_SECRET=<your-64-char-random-string>
PORT=3001

# If using PostgreSQL
DATABASE_URL=postgresql://user:password@host:port/database

# If using email services
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<your-sendgrid-api-key>

# Optional
FRONTEND_URL=https://your-frontend-domain.com
```

## 🚀 Recommended Hosting Platforms

### Backend (Node.js + Database)
- **Railway** - Easy deployment, includes PostgreSQL
- **Render** - Free tier, auto-deploys from Git
- **Fly.io** - Global deployment
- **Heroku** - Classic choice (paid)

### Database Only
- **Supabase** - Free PostgreSQL + auth features
- **Neon** - Serverless PostgreSQL
- **PlanetScale** - MySQL alternative

### Frontend
- **Vercel** - Best for React/Vite
- **Netlify** - Easy deployment
- **Cloudflare Pages** - Fast global CDN

## ⚡ Quick Production Setup Example

### Using Railway (Recommended)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Add authentication system"
   git push
   ```

2. **Deploy on Railway**
   - Connect GitHub repo
   - Railway auto-detects Node.js
   - Add PostgreSQL database (one click)
   - Set environment variables in dashboard

3. **Update frontend**
   - Change API_BASE_URL to Railway URL
   - Deploy frontend to Vercel

### Using Render

1. **Create Web Service**
   - Connect GitHub
   - Build: `cd server && npm install`
   - Start: `cd server && npm start`

2. **Add PostgreSQL**
   - Create database in Render
   - Copy DATABASE_URL to environment

3. **Set environment variables**
   - Add all variables from checklist above

## 🔐 Security Best Practices Summary

| Feature | Current Status | Production Ready? |
|---------|---------------|-------------------|
| Password Hashing | ✅ bcryptjs | ✅ Yes |
| httpOnly Cookies | ✅ Enabled | ✅ Yes |
| HTTPS | ❌ Local only | ❌ Need hosting |
| JWT Secret | ⚠️ Weak | ❌ Must change |
| CORS | ⚠️ Localhost | ❌ Must update |
| Rate Limiting | ✅ Login only | ⚠️ Add global |
| Database | ⚠️ SQLite | ⚠️ Upgrade to PostgreSQL |
| Email Verification | ❌ None | ⚠️ Recommended |
| Password Reset | ❌ None | ⚠️ Recommended |
| 2FA | ❌ None | 📊 Optional |

## 📞 Need Help?

Common issues and solutions:

**"My JWT_SECRET got leaked!"**
- Immediately change it in production
- All users will be logged out
- They'll need to log in again

**"Someone is spamming signups"**
- Add CAPTCHA to signup form
- Implement email verification
- Add IP-based rate limiting

**"Database is slow"**
- Upgrade from SQLite to PostgreSQL
- Add database indexes
- Use connection pooling

**"Users can't stay logged in"**
- Check cookie settings
- Ensure HTTPS is enabled
- Verify sameSite settings

## ✅ Minimum for Production

At the very least, do these 3 things:

1. **Change JWT_SECRET** to a strong random string
2. **Enable HTTPS** (hosting provider handles this)
3. **Update CORS** to your production domain

Everything else can be added incrementally as your app grows.
