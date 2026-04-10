const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { getDb } = require('../db/database');

function captureSnapshot(cameraId, type = 'manual') {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(cameraId);
    if (!camera) return reject(new Error('Camera not found'));

    const dateStr = new Date().toISOString().slice(0, 10);
    const dir = path.join(config.storage.snapshotsDir, cameraId, dateStr);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const id = uuidv4();
    const timeStr = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
    const filename = `${camera.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timeStr}.jpg`;
    const filePath = path.join(dir, filename);

    const args = [
      '-rtsp_transport', 'tcp',
      '-i', camera.rtsp_url,
      '-frames:v', '1',
      '-q:v', '2',
      '-y',
      filePath,
    ];

    const ffmpeg = spawn(config.ffmpeg.path, args, { timeout: 15000 });

    ffmpeg.on('close', (code) => {
      if (code !== 0 || !fs.existsSync(filePath)) {
        return reject(new Error('Failed to capture snapshot'));
      }

      const fileSize = fs.statSync(filePath).size;
      db.prepare(`INSERT INTO snapshots (id, camera_id, file_path, file_size, capture_type)
        VALUES (?, ?, ?, ?, ?)`).run(id, cameraId, filePath, fileSize, type);

      resolve({ id, filePath, fileSize });
    });

    ffmpeg.on('error', (err) => reject(err));
  });
}

// Cleanup old snapshots
function cleanupSnapshots() {
  const db = getDb();
  const retention = config.storage.snapshotRetentionDays;
  const cutoff = new Date(Date.now() - retention * 24 * 60 * 60 * 1000).toISOString();

  const old = db.prepare('SELECT * FROM snapshots WHERE created_at < ?').all(cutoff);
  for (const snap of old) {
    try { fs.unlinkSync(snap.file_path); } catch {}
    db.prepare('DELETE FROM snapshots WHERE id = ?').run(snap.id);
  }
}

module.exports = { captureSnapshot, cleanupSnapshots };
