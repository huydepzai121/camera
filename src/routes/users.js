const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// All user routes require admin
router.use(requireRole('admin'));

// GET /api/users
router.get('/', (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, username, role, enabled, created_at, updated_at FROM users ORDER BY created_at').all();
  res.json(users);
});

// POST /api/users
router.post('/', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const validRoles = ['admin', 'operator', 'viewer'];
  if (role && !validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Username already exists' });

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(id, username, hash, role || 'viewer');

  res.status(201).json({ id, username, role: role || 'viewer' });
});

// PUT /api/users/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { username, password, role, enabled } = req.body;

  if (username && username !== user.username) {
    const dup = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.params.id);
    if (dup) return res.status(409).json({ error: 'Username already exists' });
  }

  let hash = user.password_hash;
  if (password) hash = bcrypt.hashSync(password, 12);

  db.prepare(`UPDATE users SET username = ?, password_hash = ?, role = ?, enabled = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(username || user.username, hash, role || user.role, enabled !== undefined ? (enabled ? 1 : 0) : user.enabled, req.params.id);

  // Invalidate refresh tokens if disabled
  if (enabled === false) {
    db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(req.params.id);
  }

  res.json({ message: 'User updated' });
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const db = getDb();
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

module.exports = router;
