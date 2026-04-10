const express = require('express');
const { getDb } = require('../db/database');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// GET /api/settings
router.get('/', requireRole('admin'), (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json(settings);
});

// PUT /api/settings
router.put('/', requireRole('admin'), (req, res) => {
  const db = getDb();
  const upsert = db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`);

  const transaction = db.transaction((entries) => {
    for (const [key, value] of entries) {
      upsert.run(key, String(value), String(value));
    }
  });

  transaction(Object.entries(req.body));
  res.json({ message: 'Settings updated' });
});

module.exports = router;
