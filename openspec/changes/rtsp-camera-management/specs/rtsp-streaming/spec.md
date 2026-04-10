## ADDED Requirements

### Requirement: Live stream viewing via RTSP-to-browser pipeline
The system SHALL convert RTSP streams to browser-viewable format using FFmpeg transcoding to MPEG1 over WebSocket, rendered by JSMpeg canvas player.

#### Scenario: Start viewing a camera stream
- **WHEN** user opens a camera's live view page
- **THEN** system starts an FFmpeg process that connects to the camera's RTSP URL, transcodes to MPEG1, and pipes output through a WebSocket channel to the JSMpeg player in the browser

#### Scenario: Stop viewing a camera stream
- **WHEN** user navigates away from the camera view or closes the tab
- **THEN** system detects WebSocket disconnection and stops the FFmpeg process after a configurable timeout (default 30s) if no other viewers are connected

### Requirement: Multi-camera grid view
The system SHALL display multiple camera streams simultaneously in a responsive grid layout.

#### Scenario: View 4-camera grid
- **WHEN** user opens the grid view with 4 cameras selected
- **THEN** system displays a 2x2 grid with all 4 streams playing simultaneously

#### Scenario: Configurable grid size
- **WHEN** user selects grid layout (1x1, 2x2, 3x3, 4x4)
- **THEN** system adjusts the grid to the selected layout, scaling stream resolution accordingly

#### Scenario: Grid with offline camera
- **WHEN** one camera in the grid is offline
- **THEN** that grid cell shows an offline placeholder with camera name and last-seen timestamp

### Requirement: Fullscreen stream view
The system SHALL allow users to view a single camera stream in fullscreen mode.

#### Scenario: Enter fullscreen
- **WHEN** user clicks the fullscreen button on a camera stream
- **THEN** the stream expands to fill the entire browser window with enhanced resolution

#### Scenario: Exit fullscreen
- **WHEN** user presses Escape or clicks the exit fullscreen button
- **THEN** the view returns to the previous layout (grid or single view)

### Requirement: Stream quality management
The system SHALL manage FFmpeg transcoding parameters for optimal performance.

#### Scenario: Default stream settings
- **WHEN** a stream starts with default settings
- **THEN** FFmpeg SHALL use: MPEG1 codec, 1024x768 resolution, 1000kbps bitrate, 30fps

#### Scenario: Low-bandwidth mode
- **WHEN** user or system enables low-bandwidth mode
- **THEN** FFmpeg reduces resolution to 640x480 and bitrate to 500kbps

### Requirement: Stream lifecycle management
The system SHALL manage FFmpeg processes reliably with automatic recovery.

#### Scenario: FFmpeg process crash
- **WHEN** an FFmpeg process crashes unexpectedly
- **THEN** system SHALL detect the crash, log the error, and attempt to restart the process with exponential backoff (1s, 2s, 4s, max 60s)

#### Scenario: Shared stream for multiple viewers
- **WHEN** multiple users view the same camera simultaneously
- **THEN** system SHALL use a single FFmpeg process and broadcast the WebSocket data to all connected viewers

#### Scenario: Lazy start and auto-stop
- **WHEN** no viewers are watching a camera
- **THEN** the FFmpeg process for that camera SHALL NOT be running, conserving system resources
