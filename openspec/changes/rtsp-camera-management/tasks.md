## 1. Project Setup

- [x] 1.1 Initialize Node.js project with package.json (name, scripts: start, dev)
- [x] 1.2 Install core dependencies: express, ejs, better-sqlite3, ws, fluent-ffmpeg, jsonwebtoken, bcrypt, dotenv, uuid, archiver
- [x] 1.3 Install dev dependencies: nodemon
- [x] 1.4 Create project directory structure (src/, public/, views/, data/)
- [x] 1.5 Create .env.example with all config variables (PORT, JWT_SECRET, DB_PATH, RECORDINGS_DIR, SNAPSHOTS_DIR, FFMPEG_PATH, SMTP settings)
- [x] 1.6 Create src/config/index.js — load and validate environment config ← (verify: all env vars documented, defaults sensible, missing required vars throw clear errors)

## 2. Database Layer

- [x] 2.1 Create src/db/schema.sql — tables: users, cameras, camera_groups, recordings, snapshots, motion_alerts, ptz_presets, recording_schedules, settings
- [x] 2.2 Create src/db/database.js — SQLite connection, migration runner, query helpers
- [x] 2.3 Seed default admin account on first run (prompt password or use env var) ← (verify: schema covers all spec requirements, relationships correct, indexes on frequently queried columns)

## 3. Authentication & Authorization

- [x] 3.1 Create src/middleware/auth.js — JWT token verification middleware, extract user from token
- [x] 3.2 Create src/middleware/rbac.js — role-based access control middleware (admin, operator, viewer)
- [x] 3.3 Create src/routes/auth.js — POST /api/auth/login, POST /api/auth/register (admin-only), POST /api/auth/refresh, POST /api/auth/logout
- [x] 3.4 Create views/login.ejs — login form with error handling
- [x] 3.5 Implement login rate limiting (5 attempts per IP per 15 min) ← (verify: JWT flow works end-to-end, roles enforced correctly, rate limiting functional)

## 4. Express Server & Base Layout

- [x] 4.1 Create src/server.js — Express app setup, middleware chain (static files, JSON parsing, cookie parser, auth), EJS view engine, error handler
- [x] 4.2 Create views/layout.ejs — base HTML layout with sidebar navigation, header with user info/logout, content area
- [x] 4.3 Create public/css/style.css — responsive layout, sidebar, grid system, dark theme, camera cards, form styles, alerts
- [x] 4.4 Create public/js/app.js — client-side utilities (fetch wrapper with auth token, notifications, modals, WebSocket helpers) ← (verify: server starts, layout renders, static assets served, auth middleware protects routes)

## 5. Camera CRUD

- [x] 5.1 Create src/routes/cameras.js — GET /api/cameras (list, search, filter), POST /api/cameras, PUT /api/cameras/:id, DELETE /api/cameras/:id
- [x] 5.2 Implement RTSP URL validation (format check + optional connectivity test)
- [x] 5.3 Create src/routes/camera-groups.js — CRUD for camera groups
- [x] 5.4 Create views/cameras/index.ejs — camera list page with search, filter by group, status indicators
- [x] 5.5 Create camera add/edit modal or form (name, RTSP URL, location, group, tags, description)
- [x] 5.6 Implement camera status monitoring — periodic RTSP probe every 30s, update online/offline status ← (verify: CRUD operations work for all roles, search/filter functional, status monitoring runs and updates UI)

## 6. RTSP Streaming Pipeline

- [x] 6.1 Create src/services/stream-manager.js — FFmpeg process lifecycle: start, stop, restart with exponential backoff
- [x] 6.2 Implement WebSocket server on same HTTP server — multiplexed channels (one channel per camera ID, broadcast to all viewers)
- [x] 6.3 Implement lazy start (start FFmpeg when first viewer connects) and auto-stop (stop when last viewer disconnects + timeout)
- [x] 6.4 Download and include public/js/jsmpeg.min.js — JSMpeg canvas player
- [x] 6.5 Create public/js/stream-viewer.js — connect to WebSocket channel, initialize JSMpeg player on canvas element
- [x] 6.6 Create views/cameras/view.ejs — single camera live view page with stream player, camera info, action buttons
- [x] 6.7 Create views/cameras/grid.ejs — multi-camera grid view with selectable layout (1x1, 2x2, 3x3, 4x4), fullscreen support
- [x] 6.8 Implement stream quality settings (resolution, bitrate, fps) — default and low-bandwidth modes ← (verify: RTSP stream displays in browser, multi-viewer sharing works, grid layout responsive, FFmpeg crash recovery functional)

## 7. Video Recording

- [x] 7.1 Create src/services/recorder.js — start/stop recording per camera, FFmpeg process to save RTSP to MP4 (H.264 passthrough), 15-min segment rotation
- [x] 7.2 Create src/routes/recordings.js — GET /api/recordings (list by camera, date range), POST /api/recordings/start, POST /api/recordings/stop, GET /api/recordings/:id/stream (serve MP4), GET /api/recordings/:id/download
- [x] 7.3 Implement recording schedules — CRUD for schedules, cron-like scheduler to start/stop recording
- [x] 7.4 Create views/recordings/index.ejs — recordings browser with timeline view, camera filter, date picker, playback with video controls, download button
- [x] 7.5 Implement retention policy engine — auto-delete by age (default 30 days) and storage limit, per-camera overrides ← (verify: manual recording creates valid MP4, scheduled recording starts/stops on time, retention auto-cleanup works, playback functional in browser)

## 8. Snapshot Capture

- [x] 8.1 Create src/services/snapshot.js — capture JPEG from RTSP stream via FFmpeg single-frame extraction
- [x] 8.2 Create src/routes/snapshots.js — POST /api/snapshots/capture/:cameraId, GET /api/snapshots (list by camera, date range), GET /api/snapshots/:id (serve image), POST /api/snapshots/bulk-download
- [x] 8.3 Implement scheduled snapshots — configurable interval per camera, stored with metadata
- [x] 8.4 Create views/snapshots/index.ejs — snapshot gallery with thumbnail grid, date filter, bulk selection, download ← (verify: snapshot captures valid JPEG, gallery loads and filters correctly, bulk download creates ZIP)

## 9. Motion Detection

- [x] 9.1 Create src/services/motion-detector.js — FFmpeg scene change detection, configurable sensitivity (low/medium/high thresholds), cooldown period
- [x] 9.2 Create src/services/alert-service.js — alert generation, notification dispatch (email via SMTP, webhook POST, in-app via WebSocket)
- [x] 9.3 Create src/routes/alerts.js — GET /api/alerts (list, filter by camera, status), PUT /api/alerts/:id/acknowledge, PUT /api/alerts/:id/dismiss
- [x] 9.4 Create views/alerts/index.ejs — alert history page with filters, acknowledge/dismiss actions, snapshot thumbnails
- [x] 9.5 Add motion detection enable/disable per camera in camera settings UI ← (verify: motion detection triggers alerts on scene change, cooldown prevents flooding, notifications delivered, alert history queryable)

## 10. PTZ Control

- [x] 10.1 Install node-onvif dependency
- [x] 10.2 Create src/services/ptz-controller.js — ONVIF device discovery, capability detection, continuous move (pan/tilt), zoom, stop, preset management (save/goto/delete)
- [x] 10.3 Create API routes for PTZ — POST /api/cameras/:id/ptz/move, POST /api/cameras/:id/ptz/stop, POST /api/cameras/:id/ptz/zoom, CRUD /api/cameras/:id/ptz/presets
- [x] 10.4 Create public/js/ptz-controls.js — directional pad UI (mousedown=start, mouseup=stop), zoom slider, preset buttons
- [x] 10.5 Integrate PTZ controls into camera view page — show/hide based on camera PTZ capability ← (verify: PTZ movements work on ONVIF camera, presets save/recall correctly, controls hidden for non-PTZ cameras, role-based access enforced)

## 11. Dashboard

- [x] 11.1 Create src/routes/dashboard.js — GET /api/dashboard/stats (camera counts, storage usage, active streams, system health), serve dashboard page
- [x] 11.2 Create views/dashboard.ejs — overview cards (total cameras, online, offline, recording), storage bar, recent alerts widget, camera status grid
- [x] 11.3 Create public/js/dashboard.js — real-time status updates via WebSocket, storage chart, system health indicators (CPU, memory, FFmpeg process count)
- [x] 11.4 Implement system health monitoring — os module for CPU/memory, count active FFmpeg processes and WebSocket connections ← (verify: dashboard loads all widgets, real-time updates work, storage stats accurate, health warnings trigger at thresholds)

## 12. User Management

- [x] 12.1 Create src/routes/users.js — admin-only CRUD: GET /api/users, POST /api/users, PUT /api/users/:id, DELETE /api/users/:id (with self-delete protection)
- [x] 12.2 Create views/users/index.ejs — user management page with list, add/edit form, role selector, enable/disable toggle ← (verify: admin can manage users, role changes take effect, non-admins cannot access user management)

## 13. Settings & Configuration

- [x] 13.1 Create src/routes/settings.js — GET/PUT /api/settings (recording retention, storage limits, SMTP config, motion detection defaults)
- [x] 13.2 Create views/settings/index.ejs — system settings page with sections for general, recording, motion detection, notifications, storage ← (verify: settings persist to database, changes take effect without restart)

## 14. Final Integration & Polish

- [x] 14.1 Add responsive design tweaks — mobile sidebar collapse, touch-friendly controls
- [x] 14.2 Add error pages (404, 500) and global error handling
- [x] 14.3 Create README.md with setup instructions, FFmpeg installation guide, environment config reference
- [x] 14.4 Test end-to-end flow: login → dashboard → add camera → view stream → record → snapshot → motion alert → PTZ control ← (verify: complete user journey works, no broken routes, auth enforced everywhere, responsive on tablet)
