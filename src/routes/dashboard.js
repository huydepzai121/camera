const express = require('express');
const os = require('os');
const { getDb } = require('../db/database');
const { getActiveStreamCount, getActiveViewerCount } = require('../services/stream-manager');
const { getActiveRecordingCount, checkStorageLimits } = require('../services/recorder');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', (req, res) => {
  const db = getDb();

  const totalCameras = db.prepare('SELECT COUNT(*) as count FROM cameras').get().count;
  const onlineCameras = db.prepare("SELECT COUNT(*) as count FROM cameras WHERE status = 'online'").get().count;
  const offlineCameras = totalCameras - onlineCameras;

  const activeStreams = getActiveStreamCount();
  const activeViewers = getActiveViewerCount();
  const activeRecordings = getActiveRecordingCount();

  const storage = checkStorageLimits();
  const recSize = db.prepare('SELECT SUM(file_size) as total FROM recordings').get().total || 0;
  const snapSize = db.prepare('SELECT SUM(file_size) as total FROM snapshots').get().total || 0;

  const newAlerts = db.prepare("SELECT COUNT(*) as count FROM motion_alerts WHERE status = 'new'").get().count;
  const recentAlerts = db.prepare(`SELECT a.*, c.name as camera_name FROM motion_alerts a
    JOIN cameras c ON a.camera_id = c.id ORDER BY a.created_at DESC LIMIT 10`).all();

  // System health
  const cpus = os.cpus();
  const cpuUsage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return acc + ((total - idle) / total);
  }, 0) / cpus.length * 100;

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsage = ((totalMem - freeMem) / totalMem) * 100;

  res.json({
    cameras: { total: totalCameras, online: onlineCameras, offline: offlineCameras },
    streams: { active: activeStreams, viewers: activeViewers },
    recordings: { active: activeRecordings },
    storage: {
      recordings: recSize,
      snapshots: snapSize,
      total: recSize + snapSize,
      limit: storage.limitBytes,
      usage: storage.usage,
    },
    alerts: { new: newAlerts, recent: recentAlerts },
    system: {
      cpu: Math.round(cpuUsage),
      memory: Math.round(memUsage),
      uptime: os.uptime(),
      ffmpegProcesses: activeStreams + activeRecordings,
      wsConnections: activeViewers,
    },
  });
});

module.exports = router;
