const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { requireRole } = require('../middleware/rbac');
const { startRecording, stopRecording } = require('../services/recorder');
const config = require('../config');

const router = express.Router();

// GET /api/recordings
router.get('/', (req, res) => {
  const db = getDb();
  const { camera_id, date_from, date_to, page = 1, limit = 50 } = req.query;

  let sql = `SELECT r.*, c.name as camera_name FROM recordings r
    JOIN cameras c ON r.camera_id = c.id WHERE 1=1`;
  const params = [];

  if (camera_id) {
    sql += ' AND r.camera_id = ?';
    params.push(camera_id);
  }
  if (date_from) {
    sql += ' AND r.started_at >= ?';
    params.push(date_from);
  }
  if (date_to) {
    sql += ' AND r.started_at <= ?';
    params.push(date_to + 'T23:59:59');
  }

  sql += ' ORDER BY r.started_at DESC';
  const offset = (parseInt(page) - 1) * parseInt(limit);
  sql += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const recordings = db.prepare(sql).all(...params);
  res.json(recordings);
});

// POST /api/recordings/start
router.post('/start', requireRole('admin', 'operator'), (req, res) => {
  const { camera_id } = req.body;
  if (!camera_id) return res.status(400).json({ error: 'camera_id required' });

  const result = startRecording(camera_id, 'manual');
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// POST /api/recordings/stop
router.post('/stop', requireRole('admin', 'operator'), (req, res) => {
  const { camera_id } = req.body;
  if (!camera_id) return res.status(400).json({ error: 'camera_id required' });

  const result = stopRecording(camera_id);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// GET /api/recordings/:id/stream
router.get('/:id/stream', (req, res) => {
  const db = getDb();
  const rec = db.prepare('SELECT * FROM recordings WHERE id = ?').get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'Recording not found' });

  if (!fs.existsSync(rec.file_path)) {
    return res.status(404).json({ error: 'Recording file not found' });
  }

  const stat = fs.statSync(rec.file_path);
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(rec.file_path, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(rec.file_path).pipe(res);
  }
});

// GET /api/recordings/:id/download
router.get('/:id/download', (req, res) => {
  const db = getDb();
  const rec = db.prepare('SELECT r.*, c.name as camera_name FROM recordings r JOIN cameras c ON r.camera_id = c.id WHERE r.id = ?').get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'Recording not found' });
  if (!fs.existsSync(rec.file_path)) return res.status(404).json({ error: 'File not found' });

  const date = new Date(rec.started_at).toISOString().slice(0, 19).replace(/[T:]/g, '_');
  const filename = `${rec.camera_name}_${date}.mp4`.replace(/[^a-zA-Z0-9._-]/g, '_');
  res.download(rec.file_path, filename);
});

// DELETE /api/recordings/:id
router.delete('/:id', requireRole('admin'), (req, res) => {
  const db = getDb();
  const rec = db.prepare('SELECT * FROM recordings WHERE id = ?').get(req.params.id);
  if (!rec) return res.status(404).json({ error: 'Recording not found' });

  try { fs.unlinkSync(rec.file_path); } catch {}
  db.prepare('DELETE FROM recordings WHERE id = ?').run(req.params.id);
  res.json({ message: 'Recording deleted' });
});

// Recording schedules
router.get('/schedules', (req, res) => {
  const db = getDb();
  const { camera_id } = req.query;
  let sql = 'SELECT rs.*, c.name as camera_name FROM recording_schedules rs JOIN cameras c ON rs.camera_id = c.id';
  const params = [];
  if (camera_id) {
    sql += ' WHERE rs.camera_id = ?';
    params.push(camera_id);
  }
  res.json(db.prepare(sql).all(...params));
});

router.post('/schedules', requireRole('admin', 'operator'), (req, res) => {
  const { camera_id, start_time, end_time, days_of_week, enabled } = req.body;
  if (!camera_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'camera_id, start_time, end_time required' });
  }

  const db = getDb();
  const id = uuidv4();
  db.prepare(`INSERT INTO recording_schedules (id, camera_id, start_time, end_time, days_of_week, enabled)
    VALUES (?, ?, ?, ?, ?, ?)`).run(id, camera_id, start_time, end_time, days_of_week || '0,1,2,3,4,5,6', enabled !== false ? 1 : 0);

  res.status(201).json({ id });
});

router.delete('/schedules/:id', requireRole('admin', 'operator'), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM recording_schedules WHERE id = ?').run(req.params.id);
  res.json({ message: 'Schedule deleted' });
});

module.exports = router;
