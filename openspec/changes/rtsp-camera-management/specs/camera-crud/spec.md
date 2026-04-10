## ADDED Requirements

### Requirement: Add a new camera
The system SHALL allow authenticated users with admin or operator role to add a new camera by providing a name, RTSP URL, and optional metadata (location, group, tags, description).

#### Scenario: Successful camera creation
- **WHEN** user submits a valid camera form with name "Front Door" and RTSP URL "rtsp://192.168.1.100:554/stream1"
- **THEN** system creates the camera record, validates the RTSP URL format, and returns the camera details with a unique ID

#### Scenario: Duplicate camera name
- **WHEN** user submits a camera with a name that already exists
- **THEN** system SHALL reject the request with a descriptive error message

#### Scenario: Invalid RTSP URL format
- **WHEN** user submits a camera with an RTSP URL that does not match the pattern `rtsp://host:port/path`
- **THEN** system SHALL reject the request and indicate the URL format is invalid

### Requirement: Edit camera details
The system SHALL allow admin or operator users to update any camera's name, RTSP URL, location, group, tags, or description.

#### Scenario: Update camera name
- **WHEN** user changes camera name from "Front Door" to "Main Entrance"
- **THEN** system updates the record and reflects the new name everywhere

#### Scenario: Update RTSP URL while stream is active
- **WHEN** user changes the RTSP URL of a camera that is currently streaming
- **THEN** system SHALL stop the active stream, update the URL, and allow the user to restart the stream

### Requirement: Delete a camera
The system SHALL allow admin users to delete a camera permanently.

#### Scenario: Delete camera with confirmation
- **WHEN** admin clicks delete and confirms the action
- **THEN** system removes the camera record, stops any active streams, and optionally deletes associated recordings and snapshots

#### Scenario: Non-admin cannot delete
- **WHEN** a user with operator or viewer role attempts to delete a camera
- **THEN** system SHALL deny the action with a 403 Forbidden response

### Requirement: List and search cameras
The system SHALL provide a paginated list of all cameras with search and filter capabilities.

#### Scenario: List all cameras
- **WHEN** user navigates to the cameras page
- **THEN** system displays all cameras with their name, status (online/offline), group, location, and thumbnail

#### Scenario: Search by name
- **WHEN** user types "entrance" in the search box
- **THEN** system filters cameras whose name contains "entrance" (case-insensitive)

#### Scenario: Filter by group
- **WHEN** user selects group "Building A" from the filter dropdown
- **THEN** system shows only cameras assigned to that group

### Requirement: Camera grouping
The system SHALL allow cameras to be organized into named groups.

#### Scenario: Create a group
- **WHEN** admin creates a new group named "Parking Lot"
- **THEN** system creates the group and it becomes available for camera assignment

#### Scenario: Assign camera to group
- **WHEN** user assigns a camera to group "Parking Lot"
- **THEN** the camera appears under that group in all views

#### Scenario: View cameras by group
- **WHEN** user selects a group in the sidebar
- **THEN** system displays only cameras belonging to that group in the grid view

### Requirement: Camera status monitoring
The system SHALL periodically check camera connectivity and display online/offline status.

#### Scenario: Camera goes offline
- **WHEN** the system cannot reach a camera's RTSP URL for 30 seconds
- **THEN** the camera status changes to "offline" and the thumbnail shows an offline indicator

#### Scenario: Camera comes back online
- **WHEN** a previously offline camera becomes reachable
- **THEN** the camera status changes to "online" and the stream becomes available
