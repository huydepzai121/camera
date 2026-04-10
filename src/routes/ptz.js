const express = require('express');
const { requireRole } = require('../middleware/rbac');
const ptz = require('../services/ptz-controller');

const router = express.Router({ mergeParams: true });

// POST /api/cameras/:id/ptz/move
router.post('/move', requireRole('admin', 'operator'), async (req, res) => {
  try {
    const { pan, tilt, zoom } = req.body;
    await ptz.continuousMove(req.params.id, { pan, tilt, zoom });
    res.json({ message: 'Moving' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cameras/:id/ptz/stop
router.post('/stop', requireRole('admin', 'operator'), async (req, res) => {
  try {
    await ptz.stopMove(req.params.id);
    res.json({ message: 'Stopped' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cameras/:id/ptz/presets
router.get('/presets', (req, res) => {
  const presets = ptz.getPresets(req.params.id);
  res.json(presets);
});

// POST /api/cameras/:id/ptz/presets
router.post('/presets', requireRole('admin', 'operator'), async (req, res) => {
  try {
    const result = await ptz.savePreset(req.params.id, req.body.name);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cameras/:id/ptz/presets/:presetId/goto
router.post('/presets/:presetId/goto', requireRole('admin', 'operator'), async (req, res) => {
  try {
    const result = await ptz.gotoPreset(req.params.id, req.params.presetId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cameras/:id/ptz/presets/:presetId
router.delete('/presets/:presetId', requireRole('admin'), (req, res) => {
  ptz.deletePreset(req.params.presetId);
  res.json({ message: 'Preset deleted' });
});

module.exports = router;
