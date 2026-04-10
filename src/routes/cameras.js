const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// GET /api/cameras — list, search, filter
router.get('/', (req, res) => {
  const db = getDb();
  const { search, group_id, status, page = 1, limit = 50 } = req.query;

  let sql = 'SELECT c.*, g.name as group_name FROM cameras c LEFT JOIN camera_groups g ON c.group_id = g.id WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (c.name LIKE ? OR c.location LIKE ? OR c.tags LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (group_id) {
    sql += ' AND c.group_id = ?';
    params.push(group_id);
  }
  if (status) {
    sql += ' AND c.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY c.created_at DESC';

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const countSql = sql.replace(/SELECT c\.\*, g\.name as group_name/, 'SELECT COUNT(*) as total');
  const { total } = db.prepare(countSql).get(...params);

  sql += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const cameras = db.prepare(sql).all(...params);
  res.json({ cameras, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/cameras/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const camera = db.prepare('SELECT c.*, g.name as group_name FROM cameras c LEFT JOIN camera_groups g ON c.group_id = g.id WHERE c.id = ?').get(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });
  res.json(camera);
});

// POST /api/cameras
router.post('/', requireRole('admin', 'operator'), (req, res) => {
  const { name, rtsp_url, location, description, tags, group_id, onvif_host, onvif_port, onvif_user, onvif_pass } = req.body;

  if (!name || !rtsp_url) {
    return res.status(400).json({ error: 'Name and RTSP URL are required' });
  }

  if (!/^rtsp:\/\/.+/.test(rtsp_url)) {
    return res.status(400).json({ error: 'Invalid RTSP URL format. Must start with rtsp://' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM cameras WHERE name = ?').get(name);
  if (existing) {
    return res.status(409).json({ error: 'Camera name already exists' });
  }

  const id = uuidv4();
  db.prepare(`INSERT INTO cameras (id, name, rtsp_url, location, description, tags, group_id, onvif_host, onvif_port, onvif_user, onvif_pass)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, name, rtsp_url, location || '', description || '', tags || '', group_id || null,
    onvif_host || '', onvif_port || 80, onvif_user || '', onvif_pass || ''
  );

  const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(id);
  res.status(201).json(camera);
});

// PUT /api/cameras/:id
router.put('/:id', requireRole('admin', 'operator'), (req, res) => {
  const db = getDb();
  const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });

  const { name, rtsp_url, location, description, tags, group_id, onvif_host, onvif_port, onvif_user, onvif_pass,
    motion_detection_enabled, motion_sensitivity, snapshot_interval_seconds, recording_retention_days } = req.body;

  if (rtsp_url && !/^rtsp:\/\/.+/.test(rtsp_url)) {
    return res.status(400).json({ error: 'Invalid RTSP URL format' });
  }

  if (name && name !== camera.name) {
    const dup = db.prepare('SELECT id FROM cameras WHERE name = ? AND id != ?').get(name, req.params.id);
    if (dup) return res.status(409).json({ error: 'Camera name already exists' });
  }

  db.prepare(`UPDATE cameras SET
    name = ?, rtsp_url = ?, location = ?, description = ?, tags = ?, group_id = ?,
    onvif_host = ?, onvif_port = ?, onvif_user = ?, onvif_pass = ?,
    motion_detection_enabled = ?, motion_sensitivity = ?, snapshot_interval_seconds = ?,
    recording_retention_days = ?, updated_at = datetime('now')
    WHERE id = ?`).run(
    name || camera.name, rtsp_url || camera.rtsp_url, location ?? camera.location,
    description ?? camera.description, tags ?? camera.tags, group_id !== undefined ? group_id : camera.group_id,
    onvif_host ?? camera.onvif_host, onvif_port ?? camera.onvif_port,
    onvif_user ?? camera.onvif_user, onvif_pass ?? camera.onvif_pass,
    motion_detection_enabled ?? camera.motion_detection_enabled,
    motion_sensitivity || camera.motion_sensitivity,
    snapshot_interval_seconds ?? camera.snapshot_interval_seconds,
    recording_retention_days !== undefined ? recording_retention_days : camera.recording_retention_days,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/cameras/:id
router.delete('/:id', requireRole('admin'), (req, res) => {
  const db = getDb();
  const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(req.params.id);
  if (!camera) return res.status(404).json({ error: 'Camera not found' });

  db.prepare('DELETE FROM cameras WHERE id = ?').run(req.params.id);
  res.json({ message: 'Camera deleted' });
});

module.exports = router;
