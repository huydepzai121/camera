const express = require('express');
const { getDb } = require('../db/database');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// GET /api/alerts
router.get('/', (req, res) => {
  const db = getDb();
  const { camera_id, status, page = 1, limit = 50 } = req.query;

  let sql = `SELECT a.*, c.name as camera_name FROM motion_alerts a
    JOIN cameras c ON a.camera_id = c.id WHERE 1=1`;
  const params = [];

  if (camera_id) { sql += ' AND a.camera_id = ?'; params.push(camera_id); }
  if (status) { sql += ' AND a.status = ?'; params.push(status); }

  sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  const alerts = db.prepare(sql).all(...params);
  res.json(alerts);
});

// GET /api/alerts/count
router.get('/count', (req, res) => {
  const db = getDb();
  const { status } = req.query;
  let sql = 'SELECT COUNT(*) as count FROM motion_alerts';
  const params = [];
  if (status) { sql += ' WHERE status = ?'; params.push(status); }
  const result = db.prepare(sql).get(...params);
  res.json(result);
});

// PUT /api/alerts/:id/acknowledge
router.put('/:id/acknowledge', requireRole('admin', 'operator'), (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE motion_alerts SET status = 'acknowledged', acknowledged_by = ?, acknowledged_at = datetime('now')
    WHERE id = ?`).run(req.user.id, req.params.id);
  res.json({ message: 'Alert acknowledged' });
});

// PUT /api/alerts/:id/dismiss
router.put('/:id/dismiss', requireRole('admin', 'operator'), (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE motion_alerts SET status = 'dismissed' WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Alert dismissed' });
});

module.exports = router;
