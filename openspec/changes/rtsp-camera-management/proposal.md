## Why

There is no centralized camera management system in this project. Security and surveillance setups require a web-based platform to manage RTSP cameras — view live streams, record footage, capture snapshots, detect motion, and control PTZ — all from a browser. Building this with Node.js provides a lightweight, self-hosted solution suitable for small-to-medium installations.

## What Changes

- Add a full-stack Node.js web application for RTSP camera management
- Implement RTSP-to-browser streaming pipeline using FFmpeg + WebSocket + JSMpeg
- Add camera CRUD with grouping, tagging, and search
- Add live stream viewer with multi-camera grid layout and fullscreen mode
- Add video recording with playback and download capabilities
- Add snapshot capture from live streams
- Add motion detection with configurable alerts
- Add PTZ (Pan/Tilt/Zoom) control for supported cameras
- Add user authentication and role-based access control
- Add dashboard with camera status overview and system statistics
- Add responsive UI that works on desktop and tablet

## Capabilities

### New Capabilities
- `camera-crud`: Camera management — add, edit, delete, group, tag, and search cameras with RTSP URL validation
- `rtsp-streaming`: RTSP-to-browser streaming pipeline — FFmpeg transcoding, WebSocket transport, JSMpeg canvas player, multi-stream grid layout, fullscreen mode
- `video-recording`: Scheduled and manual recording of camera streams — storage management, playback, download, retention policies
- `snapshot-capture`: On-demand and scheduled snapshot capture from live camera feeds with storage and gallery view
- `motion-detection`: Motion detection on camera feeds with configurable sensitivity, alert zones, notification system (email/webhook)
- `ptz-control`: Pan/Tilt/Zoom control interface for PTZ-capable cameras via ONVIF protocol
- `user-auth`: User authentication with JWT, role-based access control (admin/operator/viewer), session management
- `dashboard`: System dashboard — camera status overview, online/offline indicators, storage usage, stream health, recent alerts

### Modified Capabilities

(none — this is a greenfield project)

## Impact

- **New dependencies**: express, better-sqlite3, fluent-ffmpeg, ws, jsonwebtoken, bcrypt, node-onvif, jsmpeg (client-side)
- **System requirement**: FFmpeg must be installed on the host system
- **Storage**: Video recordings and snapshots require disk space — configurable retention policies needed
- **Network**: Each active stream consumes bandwidth (RTSP in + WebSocket out per viewer)
- **APIs**: RESTful API for all CRUD operations, WebSocket endpoints for live streams and PTZ control
