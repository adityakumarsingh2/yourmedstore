const bcrypt = require('bcryptjs');
const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../config/db');
const { authenticateToken, getJwtSecret, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
const validRoles = new Set(['Admin', 'User']);
const isProduction = process.env.NODE_ENV === 'production';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Try again later.' }
});

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.created_at
  };
}

function sessionDurationMs() {
  return 24 * 60 * 60 * 1000;
}

async function createSession(user) {
  const expiresAt = new Date(Date.now() + sessionDurationMs());
  const sessionResult = await pool.query(
    `INSERT INTO user_sessions (user_id, expires_at)
     VALUES ($1, $2)
     RETURNING id, expires_at`,
    [user.id, expiresAt]
  );

  const session = sessionResult.rows[0];
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  return { token, expiresAt: session.expires_at };
}

function setAuthCookie(res, token) {
  res.cookie('accessToken', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: sessionDurationMs(),
    path: '/'
  });
}

function clearAuthCookie(res) {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/'
  });
}

router.post('/register', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'A valid email address is required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'User')
       RETURNING id, email, role, created_at`,
      [email.toLowerCase().trim(), passwordHash]
    );

    const user = result.rows[0];
    const session = await createSession(user);
    setAuthCookie(res, session.token);

    return res.status(201).json({
      user: sanitizeUser(user),
      expiresAt: session.expiresAt
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    return res.status(500).json({ message: 'Unable to register user.' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const result = await pool.query(
    `SELECT id, email, password_hash, role, created_at
     FROM users
     WHERE email = $1`,
    [email.toLowerCase().trim()]
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const session = await createSession(user);
  setAuthCookie(res, session.token);

  return res.json({
    user: sanitizeUser(user),
    expiresAt: session.expiresAt
  });
});

router.post('/logout', authenticateToken, async (req, res) => {
  await pool.query(
    `UPDATE user_sessions
     SET revoked_at = NOW()
     WHERE id = $1`,
    [req.user.sessionId]
  );

  clearAuthCookie(res);
  return res.status(204).send();
});

router.get('/me', authenticateToken, async (req, res) => {
  const result = await pool.query(
    `SELECT id, email, role, created_at
     FROM users
     WHERE id = $1`,
    [req.user.id]
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(404).json({ message: 'Authenticated user no longer exists.' });
  }

  return res.json({ user: sanitizeUser(user) });
});

router.get('/admin-check', authenticateToken, requireRole('Admin'), (req, res) => {
  res.json({ message: 'Admin access verified.' });
});

router.get('/users', authenticateToken, requireRole('Admin'), async (req, res) => {
  const result = await pool.query(
    `SELECT id, email, role, created_at
     FROM users
     ORDER BY created_at DESC`
  );

  res.json({ users: result.rows.map(sanitizeUser) });
});

router.patch('/users/:id/role', authenticateToken, requireRole('Admin'), async (req, res) => {
  const { role } = req.body;

  if (!validRoles.has(role)) {
    return res.status(400).json({ message: 'Role must be Admin or User.' });
  }

  const result = await pool.query(
    `UPDATE users
     SET role = $1,
         role_updated_by = $2,
         role_updated_at = NOW()
     WHERE id = $3
     RETURNING id, email, role, created_at`,
    [role, req.user.id, req.params.id]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ message: 'User not found.' });
  }

  await pool.query(
    `UPDATE user_sessions
     SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [req.params.id]
  );

  return res.json({ user: sanitizeUser(result.rows[0]) });
});

module.exports = router;
