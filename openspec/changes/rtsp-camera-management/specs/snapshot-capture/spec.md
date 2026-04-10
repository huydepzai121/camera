## ADDED Requirements

### Requirement: On-demand snapshot capture
The system SHALL allow users to capture a still image from any active camera stream.

#### Scenario: Capture snapshot from live view
- **WHEN** user clicks "Snapshot" on a camera's live view
- **THEN** system captures a JPEG image from the current RTSP stream using FFmpeg, stores it with timestamp and camera metadata, and displays a confirmation

#### Scenario: Capture snapshot from offline camera
- **WHEN** user attempts to capture a snapshot from an offline camera
- **THEN** system SHALL display an error message indicating the camera is not reachable

### Requirement: Scheduled snapshot capture
The system SHALL support automatic snapshot capture at configurable intervals.

#### Scenario: Configure interval snapshots
- **WHEN** admin sets camera "Lobby" to capture snapshots every 5 minutes
- **THEN** system automatically captures and stores a snapshot every 5 minutes while the camera is online

#### Scenario: Snapshot schedule with offline camera
- **WHEN** a scheduled snapshot is due but the camera is offline
- **THEN** system SHALL skip the capture, log the miss, and retry at the next interval

### Requirement: Snapshot gallery
The system SHALL provide a browsable gallery of captured snapshots.

#### Scenario: View snapshot gallery
- **WHEN** user navigates to snapshots for camera "Front Door"
- **THEN** system displays a paginated grid of thumbnails sorted by capture time (newest first)

#### Scenario: Filter snapshots by date range
- **WHEN** user selects a date range filter
- **THEN** system shows only snapshots captured within that range

### Requirement: Snapshot download
The system SHALL allow downloading individual snapshots or bulk export.

#### Scenario: Download single snapshot
- **WHEN** user clicks download on a snapshot
- **THEN** system serves the full-resolution JPEG file

#### Scenario: Bulk download
- **WHEN** user selects multiple snapshots and clicks "Download Selected"
- **THEN** system creates a ZIP archive containing all selected snapshots and serves it for download

### Requirement: Snapshot storage management
The system SHALL manage snapshot storage with configurable retention.

#### Scenario: Auto-cleanup old snapshots
- **WHEN** snapshots exceed the retention period (default 7 days)
- **THEN** system automatically deletes expired snapshots
