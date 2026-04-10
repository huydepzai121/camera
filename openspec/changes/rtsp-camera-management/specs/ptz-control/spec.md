## ADDED Requirements

### Requirement: PTZ control for ONVIF-compatible cameras
The system SHALL provide Pan, Tilt, and Zoom controls for cameras that support ONVIF Profile S.

#### Scenario: Detect PTZ capability
- **WHEN** a camera is added or its RTSP URL is updated
- **THEN** system SHALL probe the camera via ONVIF to determine if PTZ is supported and store the capability flag

#### Scenario: Show PTZ controls for capable cameras
- **WHEN** user views a camera that supports PTZ
- **THEN** system displays directional pad (up/down/left/right), zoom in/out buttons, and preset buttons

#### Scenario: Hide PTZ controls for non-PTZ cameras
- **WHEN** user views a camera that does not support PTZ
- **THEN** system SHALL NOT display PTZ controls

### Requirement: Directional movement control
The system SHALL allow users to pan and tilt PTZ cameras in real-time.

#### Scenario: Pan left
- **WHEN** user clicks the "left" arrow on PTZ controls
- **THEN** system sends ONVIF continuous move command to pan the camera left at configurable speed

#### Scenario: Stop movement
- **WHEN** user releases the directional button
- **THEN** system sends ONVIF stop command to halt camera movement immediately

### Requirement: Zoom control
The system SHALL allow users to zoom PTZ cameras in and out.

#### Scenario: Zoom in
- **WHEN** user clicks the zoom-in button or scrolls mouse wheel up on the stream
- **THEN** system sends ONVIF zoom command to increase zoom level

#### Scenario: Zoom out
- **WHEN** user clicks the zoom-out button or scrolls mouse wheel down on the stream
- **THEN** system sends ONVIF zoom command to decrease zoom level

### Requirement: PTZ presets
The system SHALL support saving and recalling PTZ position presets.

#### Scenario: Save current position as preset
- **WHEN** admin clicks "Save Preset" and provides a name (e.g., "Main Entrance")
- **THEN** system saves the current PTZ position via ONVIF SetPreset and stores the preset in the database

#### Scenario: Go to preset
- **WHEN** user selects a saved preset from the preset list
- **THEN** system sends ONVIF GotoPreset command and the camera moves to the saved position

#### Scenario: Delete preset
- **WHEN** admin deletes a preset
- **THEN** system removes it from the database and the ONVIF preset store

### Requirement: PTZ access control
The system SHALL restrict PTZ control based on user roles.

#### Scenario: Admin and operator can control PTZ
- **WHEN** an admin or operator user accesses PTZ controls
- **THEN** system allows full PTZ operation

#### Scenario: Viewer cannot control PTZ
- **WHEN** a viewer-role user views a PTZ camera
- **THEN** PTZ controls are hidden or disabled
