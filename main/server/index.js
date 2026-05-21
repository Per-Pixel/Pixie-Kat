import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initDb, findUserByEmail, createUser, findUserById, getAllUsers, updateUserById, softDeleteUserById } from './database-postgres.js';
import { authMiddleware } from './middleware/auth.js';
import { validateSignup, validateEmail } from './utils/validation.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.CORS_ORIGIN]
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    const validation = validateSignup(name, email, password, confirmPassword);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userId = await createUser(name.trim(), email, passwordHash);

    const token = jwt.sign(
      { userId, email: email.toLowerCase(), name: name.trim() },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.status(201).json({
      success: true,
      user: {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase(),
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'An error occurred during signup' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'An error occurred during login' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

const adminKeyMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    return res.status(500).json({ message: 'Admin API key not configured on server' });
  }

  if (!authHeader || authHeader !== `Bearer ${adminKey}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  next();
};

app.get('/api/admin/users', adminKeyMiddleware, async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({
      success: true,
      users: users.map(u => ({
        id: String(u.id),
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status,
        joinedAt: u.created_at,
        updatedAt: u.updated_at,
      })),
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

app.patch('/api/admin/users/:id', adminKeyMiddleware, async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const { name, email, phone, role, status } = req.body;
    const allowedRoles = new Set(['user', 'admin', 'reseller', 'support']);
    const allowedStatuses = new Set(['active', 'inactive', 'suspended']);
    const updates = {};

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ message: 'Name is required' });
      }
      if (trimmedName.length > 100) {
        return res.status(400).json({ message: 'Name must be 100 characters or less' });
      }
      updates.name = trimmedName;
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!validateEmail(normalizedEmail)) {
        return res.status(400).json({ message: 'Valid email is required' });
      }
      updates.email = normalizedEmail;
    }

    if (phone !== undefined) {
      const normalizedPhone = String(phone).trim();
      updates.phone = normalizedPhone || null;
    }

    if (role !== undefined) {
      if (!allowedRoles.has(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      updates.role = role;
    }

    if (status !== undefined) {
      if (!allowedStatuses.has(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid user fields provided' });
    }

    const updatedUser = await updateUserById(req.params.id, updates);

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: String(updatedUser.id),
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        status: updatedUser.status,
        joinedAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
      },
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Email already registered' });
    }

    console.error('Admin update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

app.delete('/api/admin/users/:id', adminKeyMiddleware, async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const deletedUser = await softDeleteUserById(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ ok: true, message: 'This is a protected route', user: req.user });
});

const startServer = async () => {
  try {
    await initDb();
    console.log('✓ Database initialized');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
