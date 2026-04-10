const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// GET /api/camera-groups
router.get('/', (req, res) => {
  const db = getDb();
  const groups = db.prepare(`
    SELECT g.*, COUNT(c.id) as camera_count
    FROM camera_groups g
    LEFT JOIN cameras c ON c.group_id = g.id
    GROUP BY g.id
    ORDER BY g.name
  `).all();
  res.json(groups);
});

// POST /api/camera-groups
router.post('/', requireRole('admin'), (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Group name is required' });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM camera_groups WHERE name = ?').get(name);
  if (existing) return res.status(409).json({ error: 'Group name already exists' });

  const id = uuidv4();
  db.prepare('INSERT INTO camera_groups (id, name, description) VALUES (?, ?, ?)').run(id, name, description || '');

  res.status(201).json({ id, name, description: description || '' });
});

// PUT /api/camera-groups/:id
router.put('/:id', requireRole('admin'), (req, res) => {
  const db = getDb();
  const group = db.prepare('SELECT * FROM camera_groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const { name, description } = req.body;
  if (name && name !== group.name) {
    const dup = db.prepare('SELECT id FROM camera_groups WHERE name = ? AND id != ?').get(name, req.params.id);
    if (dup) return res.status(409).json({ error: 'Group name already exists' });
  }

  db.prepare('UPDATE camera_groups SET name = ?, description = ? WHERE id = ?').run(
    name || group.name, description ?? group.description, req.params.id
  );

  const updated = db.prepare('SELECT * FROM camera_groups WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/camera-groups/:id
router.delete('/:id', requireRole('admin'), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE cameras SET group_id = NULL WHERE group_id = ?').run(req.params.id);
  db.prepare('DELETE FROM camera_groups WHERE id = ?').run(req.params.id);
  res.json({ message: 'Group deleted' });
});

module.exports = router;
