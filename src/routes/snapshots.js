const express = require('express');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { getDb } = require('../db/database');
const { requireRole } = require('../middleware/rbac');
const { captureSnapshot } = require('../services/snapshot');

const router = express.Router();

// POST /api/snapshots/capture/:cameraId
router.post('/capture/:cameraId', requireRole('admin', 'operator'), async (req, res) => {
  try {
    const result = await captureSnapshot(req.params.cameraId, 'manual');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/snapshots
router.get('/', (req, res) => {
  const db = getDb();
  const { camera_id, date_from, date_to, page = 1, limit = 50 } = req.query;

  let sql = `SELECT s.*, c.name as camera_name FROM snapshots s
    JOIN cameras c ON s.camera_id = c.id WHERE 1=1`;
  const params = [];

  if (camera_id) { sql += ' AND s.camera_id = ?'; params.push(camera_id); }
  if (date_from) { sql += ' AND s.created_at >= ?'; params.push(date_from); }
  if (date_to) { sql += ' AND s.created_at <= ?'; params.push(date_to + 'T23:59:59'); }

  sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  const snapshots = db.prepare(sql).all(...params);
  res.json(snapshots);
});

// GET /api/snapshots/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const snap = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(req.params.id);
  if (!snap) return res.status(404).json({ error: 'Snapshot not found' });
  if (!fs.existsSync(snap.file_path)) return res.status(404).json({ error: 'File not found' });

  res.sendFile(snap.file_path);
});

// POST /api/snapshots/bulk-download
router.post('/bulk-download', (req, res) => {
  const { ids } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: 'No snapshots selected' });

  const db = getDb();
  const snapshots = ids.map(id => db.prepare('SELECT * FROM snapshots WHERE id = ?').get(id)).filter(Boolean);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=snapshots.zip');

  const archive = archiver('zip', { zlib: { level: 5 } });
  archive.pipe(res);

  snapshots.forEach(snap => {
    if (fs.existsSync(snap.file_path)) {
      archive.file(snap.file_path, { name: path.basename(snap.file_path) });
    }
  });

  archive.finalize();
});

// DELETE /api/snapshots/:id
router.delete('/:id', requireRole('admin'), (req, res) => {
  const db = getDb();
  const snap = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(req.params.id);
  if (!snap) return res.status(404).json({ error: 'Snapshot not found' });

  try { fs.unlinkSync(snap.file_path); } catch {}
  db.prepare('DELETE FROM snapshots WHERE id = ?').run(req.params.id);
  res.json({ message: 'Snapshot deleted' });
});

module.exports = router;
