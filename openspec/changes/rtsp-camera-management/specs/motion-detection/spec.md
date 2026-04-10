## ADDED Requirements

### Requirement: Motion detection on camera streams
The system SHALL detect motion in camera feeds using FFmpeg scene change detection and frame comparison.

#### Scenario: Enable motion detection for a camera
- **WHEN** admin enables motion detection on camera "Back Door" with sensitivity level "medium"
- **THEN** system starts analyzing the camera feed for motion events using FFmpeg scene detection filter

#### Scenario: Disable motion detection
- **WHEN** admin disables motion detection on a camera
- **THEN** system stops motion analysis for that camera and no new alerts are generated

### Requirement: Configurable motion sensitivity
The system SHALL allow configuration of motion detection sensitivity per camera.

#### Scenario: Set sensitivity levels
- **WHEN** admin selects sensitivity level (low, medium, high) for a camera
- **THEN** system adjusts the FFmpeg scene change threshold accordingly (low=0.05, medium=0.02, high=0.005)

#### Scenario: Custom detection zone
- **WHEN** admin defines a rectangular detection zone on the camera view
- **THEN** system SHALL only analyze motion within the specified region, ignoring activity outside it

### Requirement: Motion alert generation
The system SHALL generate alerts when motion is detected.

#### Scenario: Motion detected
- **WHEN** motion is detected exceeding the sensitivity threshold
- **THEN** system creates a motion alert with timestamp, camera ID, confidence score, and a snapshot of the moment

#### Scenario: Cooldown period
- **WHEN** continuous motion is detected
- **THEN** system SHALL generate at most one alert per configurable cooldown period (default 60 seconds) to avoid alert flooding

### Requirement: Alert notification delivery
The system SHALL deliver motion alerts through configured notification channels.

#### Scenario: Email notification
- **WHEN** a motion alert is generated and email notifications are configured
- **THEN** system sends an email with alert details and the motion snapshot attached

#### Scenario: Webhook notification
- **WHEN** a motion alert is generated and a webhook URL is configured
- **THEN** system sends a POST request to the webhook URL with alert JSON payload

#### Scenario: In-app notification
- **WHEN** a motion alert is generated
- **THEN** a real-time notification appears in the web UI for all logged-in users

### Requirement: Alert history and management
The system SHALL maintain a searchable history of all motion alerts.

#### Scenario: View alert history
- **WHEN** user navigates to the alerts page
- **THEN** system displays a paginated list of alerts with timestamp, camera name, snapshot thumbnail, and status (new/acknowledged/dismissed)

#### Scenario: Acknowledge alert
- **WHEN** operator clicks "Acknowledge" on an alert
- **THEN** the alert status changes to "acknowledged" and is marked with the operator's name and timestamp

#### Scenario: Filter alerts by camera
- **WHEN** user filters alerts by camera "Back Door"
- **THEN** system shows only motion alerts from that specific camera
