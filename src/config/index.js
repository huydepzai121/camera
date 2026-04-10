const path = require('path');
const ffmpegStatic = require('ffmpeg-static');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '0.0.0.0',

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',

  db: {
    path: path.resolve(__dirname, '../../', process.env.DB_PATH || './data/camera.db'),
  },

  storage: {
    recordingsDir: path.resolve(__dirname, '../../', process.env.RECORDINGS_DIR || './data/recordings'),
    snapshotsDir: path.resolve(__dirname, '../../', process.env.SNAPSHOTS_DIR || './data/snapshots'),
    maxStorageGB: parseFloat(process.env.MAX_STORAGE_GB) || 100,
    recordingRetentionDays: parseInt(process.env.RECORDING_RETENTION_DAYS, 10) || 30,
    snapshotRetentionDays: parseInt(process.env.SNAPSHOT_RETENTION_DAYS, 10) || 7,
  },

  ffmpeg: {
    path: process.env.FFMPEG_PATH || ffmpegStatic || 'ffmpeg',
  },

  stream: {
    resolution: process.env.STREAM_RESOLUTION || '1024x768',
    bitrate: process.env.STREAM_BITRATE || '1000k',
    fps: parseInt(process.env.STREAM_FPS, 10) || 30,
  },

  motion: {
    sensitivity: process.env.MOTION_SENSITIVITY || 'medium',
    cooldownSeconds: parseInt(process.env.MOTION_COOLDOWN_SECONDS, 10) || 60,
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'camera-alerts@localhost',
  },

  webhook: {
    url: process.env.WEBHOOK_URL || '',
  },
};

if (config.jwt.secret === 'default-secret-change-me') {
  console.warn('WARNING: Using default JWT secret. Set JWT_SECRET in .env for production.');
}

module.exports = config;
