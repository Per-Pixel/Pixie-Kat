# Quick Start Guide

## 🚀 Start Development Servers

### Windows (PowerShell)
```powershell
.\start-dev.ps1
```

### Manual Start

**Terminal 1 - Backend:**
```bash
cd server
npm install  # First time only
npm start
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## 🔑 First Time Setup

1. **Install backend dependencies:**
   ```bash
   npm run server:install
   ```

2. **Start both servers** (see above)

3. **Create your account:**
   - Go to http://localhost:5173/register
   - Fill in name, email, password
   - Password must have: 8+ chars, 1 uppercase, 1 number

4. **Login:**
   - Go to http://localhost:5173/login
   - Use your email and password

## 📍 URLs

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001
- **Login:** http://localhost:5173/login
- **Signup:** http://localhost:5173/register

## 🔐 Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- Confirm password must match

## ⚡ Common Commands

```bash
# Frontend
npm run dev              # Start frontend dev server
npm run build           # Build for production

# Backend
npm run server          # Start backend server
npm run server:dev      # Start backend with auto-reload
npm run server:install  # Install backend dependencies
```

## 🐛 Troubleshooting

**Backend won't start:**
- Check port 3001 is available
- Run `npm run server:install`

**Login fails:**
- Ensure backend is running
- Check browser console for errors
- Verify credentials are correct

**Rate limited:**
- Wait 15 minutes after 5 failed attempts
- Or restart backend server

## 📚 More Info

- Full setup guide: `AUTH_SETUP.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.md`
- Backend docs: `server/README.md`
