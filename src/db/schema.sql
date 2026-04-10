CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin', 'operator', 'viewer')),
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS camera_groups (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cameras (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  rtsp_url TEXT NOT NULL,
  location TEXT DEFAULT '',
  description TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  group_id TEXT,
  status TEXT NOT NULL DEFAULT 'offline' CHECK(status IN ('online', 'offline')),
  ptz_supported INTEGER NOT NULL DEFAULT 0,
  onvif_host TEXT DEFAULT '',
  onvif_port INTEGER DEFAULT 80,
  onvif_user TEXT DEFAULT '',
  onvif_pass TEXT DEFAULT '',
  motion_detection_enabled INTEGER NOT NULL DEFAULT 0,
  motion_sensitivity TEXT DEFAULT 'medium' CHECK(motion_sensitivity IN ('low', 'medium', 'high')),
  snapshot_interval_seconds INTEGER DEFAULT 0,
  recording_retention_days INTEGER DEFAULT NULL,
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES camera_groups(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY,
  camera_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  segment_number INTEGER DEFAULT 0,
  recording_type TEXT NOT NULL DEFAULT 'manual' CHECK(recording_type IN ('manual', 'scheduled', 'motion')),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  camera_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  capture_type TEXT NOT NULL DEFAULT 'manual' CHECK(capture_type IN ('manual', 'scheduled', 'motion')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS motion_alerts (
  id TEXT PRIMARY KEY,
  camera_id TEXT NOT NULL,
  snapshot_id TEXT,
  confidence REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'acknowledged', 'dismissed')),
  acknowledged_by TEXT,
  acknowledged_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE,
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE SET NULL,
  FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ptz_presets (
  id TEXT PRIMARY KEY,
  camera_id TEXT NOT NULL,
  name TEXT NOT NULL,
  onvif_preset_token TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE,
  UNIQUE(camera_id, name)
);

CREATE TABLE IF NOT EXISTS recording_schedules (
  id TEXT PRIMARY KEY,
  camera_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  days_of_week TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cameras_group ON cameras(group_id);
CREATE INDEX IF NOT EXISTS idx_cameras_status ON cameras(status);
CREATE INDEX IF NOT EXISTS idx_recordings_camera ON recordings(camera_id);
CREATE INDEX IF NOT EXISTS idx_recordings_started ON recordings(started_at);
CREATE INDEX IF NOT EXISTS idx_snapshots_camera ON snapshots(camera_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created ON snapshots(created_at);
CREATE INDEX IF NOT EXISTS idx_motion_alerts_camera ON motion_alerts(camera_id);
CREATE INDEX IF NOT EXISTS idx_motion_alerts_status ON motion_alerts(status);
CREATE INDEX IF NOT EXISTS idx_motion_alerts_created ON motion_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_ptz_presets_camera ON ptz_presets(camera_id);
CREATE INDEX IF NOT EXISTS idx_recording_schedules_camera ON recording_schedules(camera_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
