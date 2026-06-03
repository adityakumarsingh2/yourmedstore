const bcrypt = require('bcryptjs');
const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticateToken, getJwtSecret, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
const validRoles = new Set(['Admin', 'User']);

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.created_at
  };
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

router.post('/register', async (req, res) => {
  const { email, password, role = 'User' } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  if (!validRoles.has(role)) {
    return res.status(400).json({ message: 'Role must be Admin or User.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at`,
      [email.toLowerCase().trim(), passwordHash, role]
    );

    const user = result.rows[0];

    return res.status(201).json({
      token: signToken(user),
      user: sanitizeUser(user)
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    return res.status(500).json({ message: 'Unable to register user.' });
  }
});

router.post('/login', async (req, res) => {
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

  return res.json({
    token: signToken(user),
    user: sanitizeUser(user)
  });
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

module.exports = router;
