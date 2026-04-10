const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { getDb } = require('../db/database');
const { captureSnapshot } = require('./snapshot');
const { broadcastNotification } = require('./stream-manager');

// Active detectors: cameraId -> { process, lastAlertTime }
const activeDetectors = new Map();

const SENSITIVITY_MAP = {
  low: 0.05,
  medium: 0.02,
  high: 0.005,
};

function startMotionDetection(cameraId) {
  if (activeDetectors.has(cameraId)) return;

  const db = getDb();
  const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(cameraId);
  if (!camera) return;

  const threshold = SENSITIVITY_MAP[camera.motion_sensitivity] || SENSITIVITY_MAP.medium;

  const args = [
    '-rtsp_transport', 'tcp',
    '-i', camera.rtsp_url,
    '-vf', `select='gt(scene,${threshold})',showinfo`,
    '-f', 'null',
    '-',
  ];

  const ffmpeg = spawn(config.ffmpeg.path, args);
  const detector = { process: ffmpeg, lastAlertTime: 0 };
  activeDetectors.set(cameraId, detector);

  ffmpeg.stderr.on('data', (data) => {
    const output = data.toString();
    // showinfo outputs scene score lines
    if (output.includes('showinfo') || output.includes('pts_time')) {
      handleMotionEvent(cameraId, detector);
    }
  });

  ffmpeg.on('close', () => {
    activeDetectors.delete(cameraId);
  });

  ffmpeg.on('error', () => {
    activeDetectors.delete(cameraId);
  });
}

function stopMotionDetection(cameraId) {
  const detector = activeDetectors.get(cameraId);
  if (!detector) return;

  if (detector.process) detector.process.kill('SIGTERM');
  activeDetectors.delete(cameraId);
}

async function handleMotionEvent(cameraId, detector) {
  const now = Date.now();
  const cooldown = config.motion.cooldownSeconds * 1000;

  if (now - detector.lastAlertTime < cooldown) return;
  detector.lastAlertTime = now;

  const db = getDb();
  const camera = db.prepare('SELECT name FROM cameras WHERE id = ?').get(cameraId);

  // Capture snapshot
  let snapshotId = null;
  try {
    const snap = await captureSnapshot(cameraId, 'motion');
    snapshotId = snap.id;
  } catch {}

  // Create alert
  const alertId = uuidv4();
  db.prepare(`INSERT INTO motion_alerts (id, camera_id, snapshot_id, confidence, status)
    VALUES (?, ?, ?, ?, 'new')`).run(alertId, cameraId, snapshotId, 0.8);

  // In-app notification
  broadcastNotification({
    type: 'motion_alert',
    alertId,
    cameraId,
    cameraName: camera?.name,
    snapshotId,
    timestamp: new Date().toISOString(),
  });

  // Webhook notification
  if (config.webhook.url) {
    fetch(config.webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'motion_detected',
        camera_id: cameraId,
        camera_name: camera?.name,
        alert_id: alertId,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  }

  console.log(`[Motion] Alert triggered for camera ${camera?.name || cameraId}`);
}

// Start detection for all cameras with it enabled
function initMotionDetectors() {
  const db = getDb();
  const cameras = db.prepare('SELECT id FROM cameras WHERE motion_detection_enabled = 1').all();
  cameras.forEach(cam => startMotionDetection(cam.id));
}

module.exports = { startMotionDetection, stopMotionDetection, initMotionDetectors };
