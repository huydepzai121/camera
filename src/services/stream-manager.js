const { spawn } = require('child_process');
const WebSocket = require('ws');
const config = require('../config');
const { getDb } = require('../db/database');
const { startStatusMonitoring } = require('./camera-monitor');

// Active streams: cameraId -> { process, viewers: Set<ws>, restartCount, restartTimer }
const activeStreams = new Map();
let wss = null;

function setupWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const cameraId = url.searchParams.get('camera');
    const action = url.searchParams.get('action');

    if (action === 'notifications') {
      ws._notificationClient = true;
      return;
    }

    if (!cameraId) {
      ws.close(1008, 'Camera ID required');
      return;
    }

    ws._cameraId = cameraId;

    // Add viewer and start stream if needed
    addViewer(cameraId, ws);

    ws.on('close', () => {
      removeViewer(cameraId, ws);
    });

    ws.on('error', () => {
      removeViewer(cameraId, ws);
    });
  });

  // Start camera status monitoring
  startStatusMonitoring();

  console.log('WebSocket server ready on /ws');
}

function addViewer(cameraId, ws) {
  let stream = activeStreams.get(cameraId);
  if (!stream) {
    stream = { process: null, viewers: new Set(), restartCount: 0, restartTimer: null, stopTimer: null };
    activeStreams.set(cameraId, stream);
  }

  stream.viewers.add(ws);

  // Cancel auto-stop timer if someone reconnects
  if (stream.stopTimer) {
    clearTimeout(stream.stopTimer);
    stream.stopTimer = null;
  }

  // Start FFmpeg if not running
  if (!stream.process) {
    startStream(cameraId);
  }
}

function removeViewer(cameraId, ws) {
  const stream = activeStreams.get(cameraId);
  if (!stream) return;

  stream.viewers.delete(ws);

  // Auto-stop after timeout if no viewers
  if (stream.viewers.size === 0) {
    stream.stopTimer = setTimeout(() => {
      stopStream(cameraId);
    }, 30000); // 30s timeout
  }
}

function startStream(cameraId) {
  const db = getDb();
  const camera = db.prepare('SELECT * FROM cameras WHERE id = ?').get(cameraId);
  if (!camera) return;

  const stream = activeStreams.get(cameraId);
  if (!stream) return;

  const [width, height] = config.stream.resolution.split('x');

  const args = [
    '-rtsp_transport', 'tcp',
    '-i', camera.rtsp_url,
    '-f', 'mpegts',
    '-codec:v', 'mpeg1video',
    '-b:v', config.stream.bitrate,
    '-r', String(config.stream.fps),
    '-s', `${width}x${height}`,
    '-bf', '0',
    '-an',
    '-q:v', '5',
    'pipe:1',
  ];

  const ffmpeg = spawn(config.ffmpeg.path, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  stream.process = ffmpeg;

  ffmpeg.stdout.on('data', (data) => {
    // Broadcast to all viewers
    for (const viewer of stream.viewers) {
      if (viewer.readyState === WebSocket.OPEN) {
        viewer.send(data);
      }
    }
  });

  ffmpeg.stderr.on('data', (data) => {
    // FFmpeg logs to stderr, only log errors
    const msg = data.toString();
    if (msg.includes('error') || msg.includes('Error')) {
      console.error(`[Stream ${cameraId}] FFmpeg: ${msg.trim()}`);
    }
  });

  ffmpeg.on('close', (code) => {
    stream.process = null;

    if (stream.viewers.size > 0 && code !== 0) {
      // Restart with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, stream.restartCount), 60000);
      stream.restartCount++;
      console.log(`[Stream ${cameraId}] FFmpeg exited (code ${code}), restarting in ${delay}ms`);

      stream.restartTimer = setTimeout(() => {
        if (stream.viewers.size > 0) {
          startStream(cameraId);
        }
      }, delay);
    }
  });

  ffmpeg.on('error', (err) => {
    console.error(`[Stream ${cameraId}] FFmpeg error:`, err.message);
    stream.process = null;
  });

  // Reset restart count on successful start
  setTimeout(() => {
    if (stream.process === ffmpeg) {
      stream.restartCount = 0;
    }
  }, 5000);
}

function stopStream(cameraId) {
  const stream = activeStreams.get(cameraId);
  if (!stream) return;

  if (stream.restartTimer) {
    clearTimeout(stream.restartTimer);
    stream.restartTimer = null;
  }

  if (stream.process) {
    stream.process.kill('SIGTERM');
    stream.process = null;
  }

  if (stream.viewers.size === 0) {
    activeStreams.delete(cameraId);
  }
}

function getActiveStreamCount() {
  let count = 0;
  for (const [, stream] of activeStreams) {
    if (stream.process) count++;
  }
  return count;
}

function getActiveViewerCount() {
  let count = 0;
  for (const [, stream] of activeStreams) {
    count += stream.viewers.size;
  }
  return count;
}

function broadcastNotification(data) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client._notificationClient && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function stopAllStreams() {
  for (const [cameraId] of activeStreams) {
    stopStream(cameraId);
  }
}

module.exports = {
  setupWebSocket,
  startStream,
  stopStream,
  getActiveStreamCount,
  getActiveViewerCount,
  broadcastNotification,
  stopAllStreams,
};
