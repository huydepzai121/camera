const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { getDb } = require('../db/database');

// Active recordings: cameraId -> { process, recordingId, segmentNum, segmentTimer }
const activeRecordings = new Map();

function startRecording(cameraId, type = 'manual') {
  if (activeRecordings.has(cameraId)) {
    return { error: 'Recording already in progress' };
  }

  const db = getDb();
  const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(cameraId);
  if (!camera) return { error: 'Camera not found' };

  const recordingId = uuidv4();
  const startedAt = new Date().toISOString();
  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
  const dir = path.join(config.storage.recordingsDir, cameraId, dateStr);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${camera.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timeStr}_seg0.mp4`);

  const args = [
    '-rtsp_transport', 'tcp',
    '-i', camera.rtsp_url,
    '-c:v', 'copy',
    '-an',
    '-movflags', '+frag_keyframe+empty_moov+faststart',
    '-f', 'mp4',
    filePath,
  ];

  const ffmpeg = spawn(config.ffmpeg.path, args);

  db.prepare(`INSERT INTO recordings (id, camera_id, file_path, recording_type, started_at)
    VALUES (?, ?, ?, ?, ?)`).run(recordingId, cameraId, filePath, type, startedAt);

  const rec = {
    process: ffmpeg,
    recordingId,
    segmentNum: 0,
    filePath,
    startedAt,
    cameraId,
    type,
  };

  // Segment rotation every 15 minutes
  rec.segmentTimer = setInterval(() => {
    rotateSegment(cameraId);
  }, 15 * 60 * 1000);

  activeRecordings.set(cameraId, rec);

  ffmpeg.on('close', (code) => {
    finalizeRecording(cameraId, recordingId);
  });

  ffmpeg.on('error', (err) => {
    console.error(`[Recording ${cameraId}] Error:`, err.message);
  });

  return { recordingId, filePath };
}

function stopRecording(cameraId) {
  const rec = activeRecordings.get(cameraId);
  if (!rec) return { error: 'No active recording' };

  if (rec.segmentTimer) clearInterval(rec.segmentTimer);

  if (rec.process) {
    rec.process.stdin.write('q');
    setTimeout(() => {
      if (rec.process) rec.process.kill('SIGTERM');
    }, 3000);
  }

  activeRecordings.delete(cameraId);
  return { message: 'Recording stopped' };
}

function rotateSegment(cameraId) {
  const rec = activeRecordings.get(cameraId);
  if (!rec) return;

  // Stop current, start new segment
  const oldProcess = rec.process;
  rec.segmentNum++;

  const db = getDb();
  const camera = db.prepare('SELECT name FROM cameras WHERE id = ?').get(cameraId);
  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toISOString().slice(11, 19).replace(/:/g, '-');
  const dir = path.join(config.storage.recordingsDir, cameraId, dateStr);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const newFilePath = path.join(dir, `${(camera?.name || cameraId).replace(/[^a-zA-Z0-9]/g, '_')}_${timeStr}_seg${rec.segmentNum}.mp4`);
  const newRecId = uuidv4();

  const args = [
    '-rtsp_transport', 'tcp',
    '-i', db.prepare('SELECT rtsp_url FROM cameras WHERE id = ?').get(cameraId)?.rtsp_url,
    '-c:v', 'copy', '-an',
    '-movflags', '+frag_keyframe+empty_moov+faststart',
    '-f', 'mp4',
    newFilePath,
  ];

  const ffmpeg = spawn(config.ffmpeg.path, args);

  db.prepare(`INSERT INTO recordings (id, camera_id, file_path, segment_number, recording_type, started_at)
    VALUES (?, ?, ?, ?, ?, ?)`).run(newRecId, cameraId, newFilePath, rec.segmentNum, rec.type, new Date().toISOString());

  rec.process = ffmpeg;
  rec.recordingId = newRecId;
  rec.filePath = newFilePath;

  // Kill old process
  if (oldProcess) {
    oldProcess.stdin.write('q');
    setTimeout(() => oldProcess.kill('SIGTERM'), 2000);
  }

  ffmpeg.on('close', () => finalizeRecording(cameraId, newRecId));
}

function finalizeRecording(cameraId, recordingId) {
  const db = getDb();
  const rec = db.prepare('SELECT * FROM recordings WHERE id = ?').get(recordingId);
  if (!rec) return;

  let fileSize = 0;
  try { fileSize = fs.statSync(rec.file_path).size; } catch {}

  const duration = Math.floor((Date.now() - new Date(rec.started_at).getTime()) / 1000);

  db.prepare('UPDATE recordings SET file_size = ?, duration_seconds = ?, ended_at = datetime(\'now\') WHERE id = ?')
    .run(fileSize, duration, recordingId);
}

function isRecording(cameraId) {
  return activeRecordings.has(cameraId);
}

function getActiveRecordingCount() {
  return activeRecordings.size;
}

// Retention cleanup
function cleanupRecordings() {
  const db = getDb();
  const globalRetention = config.storage.recordingRetentionDays;

  // Get cameras with custom retention
  const cameras = db.prepare('SELECT id, recording_retention_days FROM cameras').all();
  const retentionMap = new Map();
  cameras.forEach(c => retentionMap.set(c.id, c.recording_retention_days || globalRetention));

  const recordings = db.prepare('SELECT * FROM recordings WHERE ended_at IS NOT NULL').all();
  const now = Date.now();

  for (const rec of recordings) {
    const retention = retentionMap.get(rec.camera_id) || globalRetention;
    const age = (now - new Date(rec.created_at).getTime()) / (1000 * 60 * 60 * 24);

    if (age > retention) {
      try { fs.unlinkSync(rec.file_path); } catch {}
      db.prepare('DELETE FROM recordings WHERE id = ?').run(rec.id);
    }
  }
}

// Check storage limits
function checkStorageLimits() {
  const db = getDb();
  const totalSize = db.prepare('SELECT SUM(file_size) as total FROM recordings').get()?.total || 0;
  const limitBytes = config.storage.maxStorageGB * 1024 * 1024 * 1024;

  if (totalSize > limitBytes) {
    // Delete oldest recordings
    const oldest = db.prepare('SELECT * FROM recordings WHERE ended_at IS NOT NULL ORDER BY created_at ASC LIMIT 10').all();
    for (const rec of oldest) {
      try { fs.unlinkSync(rec.file_path); } catch {}
      db.prepare('DELETE FROM recordings WHERE id = ?').run(rec.id);
    }
  }

  return { totalSize, limitBytes, usage: totalSize / limitBytes };
}

module.exports = {
  startRecording, stopRecording, isRecording,
  getActiveRecordingCount, cleanupRecordings, checkStorageLimits,
};
