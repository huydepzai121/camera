const { spawn } = require('child_process');
const config = require('../config');
const ffprobeStatic = require('ffprobe-static');
const { getDb } = require('../db/database');

// Track active camera status checks
let statusInterval = null;

function startStatusMonitoring() {
  if (statusInterval) return;
  statusInterval = setInterval(checkAllCameras, 30000);
  checkAllCameras();
}

function stopStatusMonitoring() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
}

function checkAllCameras() {
  const db = getDb();
  const cameras = db.prepare('SELECT id, rtsp_url FROM cameras').all();
  cameras.forEach(cam => checkCamera(cam));
}

function checkCamera(camera) {
  const ffprobePath = ffprobeStatic.path || config.ffmpeg.path.replace('ffmpeg', 'ffprobe') || 'ffprobe';
  const ffprobe = spawn(ffprobePath, [
    '-v', 'quiet',
    '-rtsp_transport', 'tcp',
    '-i', camera.rtsp_url,
    '-show_entries', 'stream=codec_type',
    '-of', 'json',
  ], { timeout: 10000 });

  let output = '';
  ffprobe.stdout.on('data', d => output += d);

  ffprobe.on('close', (code) => {
    const db = getDb();
    const newStatus = code === 0 ? 'online' : 'offline';
    const updates = newStatus === 'online'
      ? 'status = ?, last_seen_at = datetime(\'now\'), updated_at = datetime(\'now\')'
      : 'status = ?, updated_at = datetime(\'now\')';
    db.prepare(`UPDATE cameras SET ${updates} WHERE id = ?`).run(newStatus, camera.id);
  });

  ffprobe.on('error', () => {
    const db = getDb();
    db.prepare('UPDATE cameras SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run('offline', camera.id);
  });
}

module.exports = { startStatusMonitoring, stopStatusMonitoring, checkCamera };
