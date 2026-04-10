const jwt = require('jsonwebtoken');
const config = require('../config');
const { getDb } = require('../db/database');

function authenticateToken(req, res, next) {
  // Skip auth for login page and auth API
  const publicPaths = ['/login', '/api/auth/login', '/api/auth/refresh'];
  if (publicPaths.includes(req.path)) return next();

  // Check cookie first, then Authorization header
  let token = req.cookies?.token;
  if (!token) {
    const authHeader = req.headers.authorization;
    token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  }

  if (!token) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    return res.redirect('/login');
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const db = getDb();
    const user = db.prepare('SELECT id, username, role, enabled FROM users WHERE id = ?').get(payload.userId);
    if (!user || !user.enabled) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Account disabled or not found' });
      }
      res.clearCookie('token');
      return res.redirect('/login');
    }
    req.user = user;
    next();
  } catch (err) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    res.clearCookie('token');
    return res.redirect('/login');
  }
}

module.exports = { authenticateToken };
