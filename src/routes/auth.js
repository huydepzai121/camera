const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { getDb } = require('../db/database');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// Rate limiting store (in-memory)
const loginAttempts = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const window = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const attempts = loginAttempts.get(ip) || [];
  const recent = attempts.filter(t => now - t < window);
  loginAttempts.set(ip, recent);

  if (recent.length >= maxAttempts) {
    return false;
  }
  return true;
}

function recordAttempt(ip) {
  const attempts = loginAttempts.get(ip) || [];
  attempts.push(Date.now());
  loginAttempts.set(ip, attempts);
}

function generateTokens(userId) {
  const token = jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  const refreshToken = uuidv4();
  const db = getDb();

  // Clean old refresh tokens for this user
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)').run(
    uuidv4(), userId, refreshToken, expiresAt
  );

  return { token, refreshToken };
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const ip = req.ip;
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    recordAttempt(ip);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!user.enabled) {
    return res.status(401).json({ error: 'Account disabled' });
  }

  const { token, refreshToken } = generateTokens(user.id);

  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 3600000 });
  res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600000 });

  res.json({
    token,
    refreshToken,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

// POST /api/auth/register (admin only)
router.post('/register', requireRole('admin'), (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const validRoles = ['admin', 'operator', 'viewer'];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const hash = bcrypt.hashSync(password, 12);
  const id = uuidv4();
  db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
    id, username, hash, role || 'viewer'
  );

  res.status(201).json({ id, username, role: role || 'viewer' });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  const db = getDb();
  const stored = db.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(refreshToken);

  if (!stored || new Date(stored.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const user = db.prepare('SELECT id, enabled FROM users WHERE id = ?').get(stored.user_id);
  if (!user || !user.enabled) {
    return res.status(401).json({ error: 'Account not found or disabled' });
  }

  const tokens = generateTokens(user.id);
  res.cookie('token', tokens.token, { httpOnly: true, sameSite: 'lax', maxAge: 3600000 });
  res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600000 });

  res.json({ token: tokens.token, refreshToken: tokens.refreshToken });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    const db = getDb();
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
  }
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

module.exports = router;
