## ADDED Requirements

### Requirement: User registration and login
The system SHALL provide user authentication via username/password with JWT tokens.

#### Scenario: First-time setup
- **WHEN** the system starts with no users in the database
- **THEN** system SHALL prompt creation of an admin account on first access

#### Scenario: Login with valid credentials
- **WHEN** user submits correct username and password
- **THEN** system returns a JWT access token (1h expiry) and a refresh token (7d expiry), and redirects to the dashboard

#### Scenario: Login with invalid credentials
- **WHEN** user submits incorrect username or password
- **THEN** system returns a 401 error with message "Invalid credentials" without revealing which field is wrong

#### Scenario: Token refresh
- **WHEN** the access token expires and client sends the refresh token
- **THEN** system issues a new access token without requiring re-login

### Requirement: Role-based access control
The system SHALL enforce three roles: admin, operator, viewer.

#### Scenario: Admin permissions
- **WHEN** user has admin role
- **THEN** user can: manage cameras (CRUD), manage users, configure system settings, control PTZ, view/record streams, manage recordings, configure motion detection

#### Scenario: Operator permissions
- **WHEN** user has operator role
- **THEN** user can: add/edit cameras, view streams, control PTZ, start/stop recordings, capture snapshots, acknowledge alerts. Cannot: delete cameras, manage users, change system settings

#### Scenario: Viewer permissions
- **WHEN** user has viewer role
- **THEN** user can: view live streams, view recordings, view snapshots, view alerts. Cannot: modify cameras, control PTZ, start recordings, change settings

### Requirement: User management
The system SHALL allow admins to manage user accounts.

#### Scenario: Create new user
- **WHEN** admin creates a new user with username, password, and role
- **THEN** system creates the user account with bcrypt-hashed password

#### Scenario: Change user role
- **WHEN** admin changes a user's role from "viewer" to "operator"
- **THEN** the user's permissions update on their next token refresh

#### Scenario: Disable user account
- **WHEN** admin disables a user account
- **THEN** the user's existing tokens are invalidated and they cannot log in

#### Scenario: Admin cannot delete themselves
- **WHEN** an admin attempts to delete their own account
- **THEN** system SHALL deny the action to prevent lockout

### Requirement: Session security
The system SHALL implement security best practices for authentication.

#### Scenario: Password hashing
- **WHEN** a user password is stored
- **THEN** system SHALL hash it using bcrypt with a minimum cost factor of 12

#### Scenario: Rate limiting login attempts
- **WHEN** more than 5 failed login attempts occur from the same IP within 15 minutes
- **THEN** system SHALL temporarily block login attempts from that IP for 15 minutes

#### Scenario: Logout
- **WHEN** user clicks logout
- **THEN** system invalidates the refresh token and clears the client-side tokens
