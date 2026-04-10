## Context

This is a greenfield Node.js project to build a self-hosted RTSP camera management system. No existing codebase — starting from scratch. The target environment is a local server or small VPS running Linux/macOS with FFmpeg installed. Users manage IP cameras that expose RTSP streams (e.g., Hikvision, Dahua, Reolink, generic ONVIF cameras).

**Constraints:**
- Browsers cannot play RTSP natively — transcoding pipeline required
- Each active stream = 1 FFmpeg process + WebSocket connection per viewer
- Recording storage grows fast — retention policies essential
- PTZ control varies by camera vendor — ONVIF provides standardization
- System must handle cameras going offline/online gracefully

## Goals / Non-Goals

**Goals:**
- Full camera lifecycle management (CRUD, grouping, status monitoring)
- Real-time RTSP viewing in browser with multi-camera grid
- Video recording with playback and download
- Snapshot capture on demand
- Motion detection with configurable alerts
- PTZ control for compatible cameras
- User authentication with role-based access
- Responsive dashboard with system overview

**Non-Goals:**
- Cloud hosting / SaaS deployment (self-hosted only)
- AI-based analytics (face recognition, object detection, license plate reading)
- Multi-server clustering / distributed deployment
- Mobile native app (responsive web only)
- Audio streaming (video-only for v1)

## Decisions

### 1. Streaming Pipeline: FFmpeg → WebSocket → JSMpeg

**Choice:** RTSP → FFmpeg (MPEG1 encoding) → WebSocket server → JSMpeg canvas player in browser

**Alternatives considered:**
- **HLS/DASH**: Higher latency (5-30s segment-based), requires packaging step. Better for VOD but poor for live surveillance.
- **WebRTC**: Lowest latency but complex signaling, STUN/TURN servers, harder to multi-cast.
- **RTMP → Flash**: Dead technology.

**Rationale:** JSMpeg approach provides ~1-2s latency, simple architecture, no browser plugins. Each camera gets its own FFmpeg process and WebSocket port. MPEG1 is lightweight to decode in JavaScript canvas.

### 2. Database: SQLite via better-sqlite3

**Choice:** SQLite with synchronous better-sqlite3 driver

**Alternatives considered:**
- **PostgreSQL/MySQL**: Overkill for camera metadata (dozens to hundreds of records)
- **JSON files**: No query capabilities, concurrent access issues
- **MongoDB**: Unnecessary complexity for structured relational data

**Rationale:** Zero-config, embedded, file-based. Perfect for self-hosted single-server deployment. better-sqlite3 is synchronous (simpler code) and fast.

### 3. Motion Detection: FFmpeg frame-diff based

**Choice:** Use FFmpeg's scene change detection filter + frame comparison

**Alternatives considered:**
- **OpenCV Node bindings**: Heavy dependency, complex installation
- **Pixel-diff libraries**: CPU-intensive on full frames, not production-grade
- **Hardware camera motion events**: Not universally supported

**Rationale:** FFmpeg is already a dependency. `select='gt(scene,0.01)'` filter detects scene changes efficiently. For more advanced detection, capture keyframes and do server-side pixel diff with configurable sensitivity.

### 4. PTZ: ONVIF protocol

**Choice:** node-onvif library for PTZ control

**Rationale:** ONVIF is the industry standard for IP camera control. Most modern cameras support ONVIF Profile S (streaming) and Profile G (recording). Provides unified PTZ API regardless of camera brand.

### 5. Authentication: JWT + bcrypt

**Choice:** Stateless JWT tokens with bcrypt password hashing

**Rationale:** Simple, well-understood, no external auth service needed. Three roles: admin (full control), operator (view + control cameras), viewer (view only).

### 6. Frontend: Server-rendered EJS + vanilla JS

**Choice:** EJS templates with vanilla JavaScript, no frontend framework

**Alternatives considered:**
- **React/Vue/Angular**: Overkill SPA overhead for what is primarily a dashboard
- **HTMX**: Good fit but adds learning curve for contributors

**Rationale:** Simple, fast, minimal build step. JSMpeg handles the complex rendering. CSS Grid for multi-camera layout. Progressive enhancement approach.

### 7. Project Structure

```
camera/
├── src/
│   ├── server.js              # Express app entry point
│   ├── config/
│   │   └── index.js           # Environment config
│   ├── db/
│   │   ├── schema.sql         # SQLite schema
│   │   └── database.js        # DB connection & helpers
│   ├── routes/
│   │   ├── auth.js            # Login/register/logout
│   │   ├── cameras.js         # Camera CRUD API
│   │   ├── recordings.js      # Recording management API
│   │   ├── snapshots.js       # Snapshot API
│   │   ├── alerts.js          # Motion alerts API
│   │   └── dashboard.js       # Dashboard page routes
│   ├── services/
│   │   ├── stream-manager.js  # FFmpeg process lifecycle
│   │   ├── recorder.js        # Recording service
│   │   ├── snapshot.js        # Snapshot service
│   │   ├── motion-detector.js # Motion detection service
│   │   ├── ptz-controller.js  # ONVIF PTZ service
│   │   └── alert-service.js   # Alert notification service
│   ├── middleware/
│   │   ├── auth.js            # JWT verification
│   │   └── rbac.js            # Role-based access control
│   └── utils/
│       ├── ffmpeg.js          # FFmpeg helper functions
│       └── logger.js          # Logging utility
├── public/
│   ├── css/
│   │   └── style.css          # Main stylesheet
│   ├── js/
│   │   ├── jsmpeg.min.js      # JSMpeg player library
│   │   ├── app.js             # Main client-side app
│   │   ├── stream-viewer.js   # Stream viewer component
│   │   ├── ptz-controls.js    # PTZ control UI
│   │   └── dashboard.js       # Dashboard charts/stats
│   └── img/                   # Static images
├── views/
│   ├── layout.ejs             # Base layout
│   ├── login.ejs              # Login page
│   ├── dashboard.ejs          # Dashboard page
│   ├── cameras/
│   │   ├── index.ejs          # Camera list
│   │   ├── view.ejs           # Single camera view
│   │   └── grid.ejs           # Multi-camera grid
│   ├── recordings/
│   │   └── index.ejs          # Recordings browser
│   └── snapshots/
│       └── index.ejs          # Snapshot gallery
├── data/                      # Runtime data directory
│   ├── camera.db              # SQLite database
│   ├── recordings/            # Video recording files
│   └── snapshots/             # Snapshot image files
├── package.json
├── .env.example
└── README.md
```

## Risks / Trade-offs

**[FFmpeg process scaling]** → Each active camera stream requires a dedicated FFmpeg process. 20+ cameras may strain CPU/memory on modest hardware. Mitigation: lazy start (only when viewer connects), auto-stop on disconnect timeout, system resource monitoring on dashboard.

**[WebSocket port management]** → Each stream needs a unique WebSocket port. Mitigation: use a single WebSocket server with multiplexed channels (room-based) instead of port-per-stream.

**[Recording storage]** → Continuous recording at 1080p ~= 1-2 GB/hour/camera. Mitigation: configurable retention policies, storage usage alerts, automatic cleanup of oldest recordings.

**[ONVIF compatibility]** → Not all cameras fully implement ONVIF profiles. Mitigation: graceful degradation — detect camera capabilities and show/hide PTZ controls accordingly.

**[Single-server bottleneck]** → No horizontal scaling. Mitigation: acceptable for target use case (small-to-medium installations, <50 cameras). Document hardware recommendations.

**[FFmpeg crashes]** → FFmpeg process may crash on malformed streams. Mitigation: process supervision with auto-restart, exponential backoff, health checks.

## Open Questions

- What video format for recordings? MP4 (H.264 passthrough from RTSP) vs re-encode
- Email provider for motion alerts? SMTP config vs webhook-only for v1
- Should recordings be segmented (e.g., 15-min chunks) or continuous files?
