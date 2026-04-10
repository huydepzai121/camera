## ADDED Requirements

### Requirement: System overview dashboard
The system SHALL display a dashboard with key metrics and camera status overview on the home page.

#### Scenario: Dashboard loads on login
- **WHEN** user logs in or navigates to the home page
- **THEN** system displays the dashboard with: total cameras, online/offline count, active recordings count, total storage used, recent alerts

#### Scenario: Real-time status updates
- **WHEN** a camera goes online or offline
- **THEN** the dashboard updates the status in real-time without page refresh (via WebSocket)

### Requirement: Camera status grid
The system SHALL show a visual overview of all cameras with their current status.

#### Scenario: Camera status cards
- **WHEN** dashboard loads
- **THEN** each camera is shown as a card with: thumbnail (last snapshot or live preview), name, status indicator (green=online, red=offline, yellow=recording), group name

#### Scenario: Click camera card
- **WHEN** user clicks a camera status card
- **THEN** system navigates to that camera's live view page

### Requirement: Storage usage monitoring
The system SHALL display storage usage statistics on the dashboard.

#### Scenario: Storage bar chart
- **WHEN** dashboard loads
- **THEN** system shows total disk usage, recordings size, snapshots size, available space, and a visual progress bar

#### Scenario: Storage warning
- **WHEN** storage usage exceeds 80% of the configured limit
- **THEN** dashboard displays a warning banner with recommended actions

### Requirement: Recent alerts widget
The system SHALL display the most recent motion alerts on the dashboard.

#### Scenario: Show latest alerts
- **WHEN** dashboard loads
- **THEN** system shows the 10 most recent motion alerts with camera name, timestamp, thumbnail, and status

#### Scenario: Quick acknowledge from dashboard
- **WHEN** operator clicks "Acknowledge" on a dashboard alert
- **THEN** the alert is acknowledged without navigating away from the dashboard

### Requirement: System health indicators
The system SHALL display system resource information.

#### Scenario: Show system health
- **WHEN** dashboard loads
- **THEN** system displays: CPU usage, memory usage, number of active FFmpeg processes, total active WebSocket connections, system uptime

#### Scenario: Health warning
- **WHEN** CPU or memory usage exceeds 90%
- **THEN** dashboard displays a critical warning with suggestion to reduce active streams
