const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const getJwtSecret = () => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'development-only-jwt-secret-change-me';
  }

  throw new Error('JWT_SECRET is required in production.');
};

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;

  return req.cookies?.accessToken || bearerToken;
}

async function authenticateToken(req, res, next) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is required.' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const sessionResult = await pool.query(
      `SELECT id, revoked_at, expires_at
       FROM user_sessions
       WHERE id = $1 AND user_id = $2`,
      [payload.sessionId, payload.id]
    );

    const session = sessionResult.rows[0];

    if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
      return res.status(401).json({ message: 'Session is no longer active.' });
    }

    req.user = payload;
    req.session = session;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to access this resource.' });
    }

    return next();
  };
}

module.exports = {
  authenticateToken,
  getJwtSecret,
  getTokenFromRequest,
  requireRole
};
