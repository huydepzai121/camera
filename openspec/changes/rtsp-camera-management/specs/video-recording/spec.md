## ADDED Requirements

### Requirement: Manual recording
The system SHALL allow users to manually start and stop recording of any camera stream.

#### Scenario: Start manual recording
- **WHEN** operator clicks "Record" on a camera view
- **THEN** system starts an FFmpeg process that saves the RTSP stream to an MP4 file with H.264 video codec, timestamped filename, and camera ID metadata

#### Scenario: Stop manual recording
- **WHEN** operator clicks "Stop Recording"
- **THEN** system stops the FFmpeg recording process, finalizes the MP4 file, and adds the recording entry to the database

### Requirement: Scheduled recording
The system SHALL support time-based recording schedules per camera.

#### Scenario: Create a recording schedule
- **WHEN** admin sets camera "Front Door" to record daily from 18:00 to 06:00
- **THEN** system automatically starts recording at 18:00 and stops at 06:00 each day

#### Scenario: Overlapping schedules
- **WHEN** a camera has multiple overlapping schedules
- **THEN** system SHALL merge them into continuous recording for the union of all schedule periods

### Requirement: Recording playback
The system SHALL provide in-browser playback of recorded video files.

#### Scenario: Play a recording
- **WHEN** user selects a recording from the recordings list
- **THEN** system serves the MP4 file for in-browser playback with standard video controls (play, pause, seek, speed)

#### Scenario: Timeline view
- **WHEN** user views recordings for a camera
- **THEN** system displays a timeline showing recording segments for the selected date range

### Requirement: Recording download
The system SHALL allow users to download recording files.

#### Scenario: Download single recording
- **WHEN** user clicks "Download" on a recording
- **THEN** system serves the MP4 file as a download with filename format: `{camera-name}_{date}_{time}.mp4`

### Requirement: Recording retention policy
The system SHALL enforce configurable retention policies to manage storage.

#### Scenario: Auto-delete old recordings
- **WHEN** recordings exceed the retention period (default 30 days)
- **THEN** system automatically deletes the oldest recordings and frees disk space

#### Scenario: Storage limit enforcement
- **WHEN** total recording storage reaches the configured limit (e.g., 100GB)
- **THEN** system stops new recordings, alerts the admin, and auto-deletes oldest recordings if auto-cleanup is enabled

#### Scenario: Per-camera retention override
- **WHEN** admin sets camera "Server Room" to retain recordings for 90 days
- **THEN** that camera's recordings follow the 90-day policy regardless of the global default

### Requirement: Recording file segmentation
The system SHALL split recordings into manageable segments.

#### Scenario: Segment by duration
- **WHEN** a recording is in progress
- **THEN** system SHALL create new segment files every 15 minutes to prevent single large files and enable partial playback
