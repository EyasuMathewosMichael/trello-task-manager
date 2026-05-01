# Requirements Document

## Introduction

This document defines the requirements for an Advanced Trello-like Task Manager — a full-stack web application that enables teams to organize work using boards, lists, and task cards. The system supports real-time collaboration, drag-and-drop task management, user authentication with role-based access, smart dashboards with productivity analytics, due date tracking with notifications, file attachments, comments, and activity logging. The tech stack is React (frontend), Node.js + Express (backend), and MongoDB (database), with Socket.io for real-time updates, Redis for caching, and Cloudinary/AWS S3 for file storage.

## Glossary

- **System**: The Task Manager application as a whole.
- **API_Server**: The Node.js + Express backend service.
- **Auth_Service**: The component responsible for JWT-based authentication and authorization.
- **Board**: A top-level project container that holds lists and tasks (analogous to a Trello board).
- **List**: An ordered column within a Board representing a workflow stage (e.g., To Do, In Progress, Done).
- **Task**: A card within a List representing a unit of work.
- **Comment**: A text message attached to a Task by a User.
- **Activity_Log**: A chronological record of actions performed on a Board, List, or Task.
- **User**: An authenticated person who interacts with the System.
- **Admin**: A User with elevated permissions to manage a Board, its members, and its settings.
- **Member**: A User with standard permissions to create and manage Tasks within a Board they belong to.
- **Dashboard**: The analytics view that displays task statistics and productivity insights for a User or Board.
- **Notification_Service**: The component responsible for sending email and in-app notifications.
- **Realtime_Service**: The Socket.io-based component that pushes live updates to connected clients.
- **Search_Service**: The component responsible for querying and filtering Tasks.
- **Cache**: The Redis-based caching layer used to improve read performance.
- **File_Store**: The Cloudinary or AWS S3 storage service for file attachments.
- **JWT**: JSON Web Token used for stateless authentication.
- **Drag_Drop_Client**: The frontend drag-and-drop component (react-beautiful-dnd or dnd-kit).

---

## Requirements

### Requirement 1: User Registration and Authentication

**User Story:** As a visitor, I want to register and log in securely, so that I can access my boards and tasks.

#### Acceptance Criteria

1. THE Auth_Service SHALL accept a registration request containing a unique email address, a display name, and a password of at least 8 characters.
2. WHEN a registration request is received with a duplicate email address, THE Auth_Service SHALL return an error response with HTTP status 409 and a message indicating the email is already in use.
3. WHEN a valid registration request is received, THE Auth_Service SHALL store the User record with the password hashed using bcrypt and return HTTP status 201.
4. WHEN a login request is received with valid credentials, THE Auth_Service SHALL return a signed JWT with an expiry of 24 hours and a refresh token with an expiry of 7 days.
5. WHEN a login request is received with invalid credentials, THE Auth_Service SHALL return HTTP status 401 and a generic error message that does not reveal which field is incorrect.
6. WHEN a JWT expires, THE Auth_Service SHALL accept a valid refresh token and issue a new JWT without requiring the User to re-enter credentials.
7. WHEN a refresh token is used, THE Auth_Service SHALL invalidate the previous refresh token and issue a new one (token rotation).
8. IF a request is received without a valid JWT, THEN THE API_Server SHALL return HTTP status 401.

---

### Requirement 2: Role-Based Access Control

**User Story:** As a Board Admin, I want to control who can access and modify my board, so that sensitive project data stays protected.

#### Acceptance Criteria

1. THE System SHALL assign exactly one role — Admin or Member — to each User per Board.
2. WHEN a User creates a Board, THE System SHALL assign the Admin role to that User for that Board.
3. WHILE a User holds the Admin role on a Board, THE API_Server SHALL permit that User to add Members, remove Members, change Member roles, rename the Board, and delete the Board.
4. WHILE a User holds the Member role on a Board, THE API_Server SHALL permit that User to create Lists, create Tasks, update Tasks, move Tasks, add Comments, and upload file attachments.
5. IF a Member attempts an Admin-only action, THEN THE API_Server SHALL return HTTP status 403.
6. WHEN an Admin removes a Member from a Board, THE System SHALL revoke that Member's access to all Lists and Tasks within that Board.

---

### Requirement 3: User Invitation via Email

**User Story:** As a Board Admin, I want to invite collaborators by email, so that new team members can join the board without manual account setup.

#### Acceptance Criteria

1. WHEN an Admin submits an invitation request with a valid email address, THE Notification_Service SHALL send an invitation email containing a unique, single-use invitation link that expires after 72 hours.
2. WHEN an invitation link is followed by a User who does not have an account, THE System SHALL present a registration form pre-filled with the invited email address.
3. WHEN an invitation link is followed by a User who already has an account, THE System SHALL add that User to the Board as a Member without requiring re-registration.
4. WHEN an invitation link is used, THE System SHALL mark the link as consumed and reject any subsequent use of the same link with HTTP status 410.
5. IF an invitation link has expired, THEN THE System SHALL return HTTP status 410 and prompt the Admin to resend the invitation.

---

### Requirement 4: Board Management

**User Story:** As a User, I want to create and manage boards, so that I can organize separate projects independently.

#### Acceptance Criteria

1. WHEN an authenticated User submits a create-board request with a non-empty name, THE API_Server SHALL create a Board record, assign the Admin role to the creator, and return the Board object with HTTP status 201.
2. THE API_Server SHALL return only the Boards for which the requesting User holds a role when a list-boards request is received.
3. WHEN an Admin submits an update-board request with a new name, THE API_Server SHALL update the Board name and record an entry in the Activity_Log.
4. WHEN an Admin submits a delete-board request, THE API_Server SHALL delete the Board and all associated Lists, Tasks, Comments, and Activity_Log entries, then return HTTP status 200.
5. IF a delete-board request is received from a non-Admin User, THEN THE API_Server SHALL return HTTP status 403.

---

### Requirement 5: List Management

**User Story:** As a Board Member, I want to create and reorder lists within a board, so that I can define the workflow stages for my project.

#### Acceptance Criteria

1. WHEN a Member submits a create-list request with a non-empty name and a valid Board ID, THE API_Server SHALL create a List record appended to the end of the Board's list order and return HTTP status 201.
2. THE API_Server SHALL return all Lists belonging to a Board in their stored order when a get-lists request is received for that Board.
3. WHEN a Member submits a reorder-lists request with a new position index, THE API_Server SHALL update the position of the List within the Board and record an entry in the Activity_Log.
4. WHEN a Member submits a rename-list request with a non-empty name, THE API_Server SHALL update the List name and record an entry in the Activity_Log.
5. WHEN an Admin submits a delete-list request, THE API_Server SHALL delete the List and all Tasks within it, then return HTTP status 200.

---

### Requirement 6: Task (Card) Management

**User Story:** As a Board Member, I want to create, update, and delete tasks within lists, so that I can track individual units of work.

#### Acceptance Criteria

1. WHEN a Member submits a create-task request with a non-empty title and a valid List ID, THE API_Server SHALL create a Task record and return HTTP status 201.
2. THE Task SHALL store the following optional fields: description (text), due date (ISO 8601 datetime), priority (Low, Medium, High), assigned User IDs, and label tags.
3. WHEN a Member submits an update-task request, THE API_Server SHALL update only the fields included in the request body and record an entry in the Activity_Log.
4. WHEN a Member submits a delete-task request, THE API_Server SHALL delete the Task and all associated Comments and file attachment references, then return HTTP status 200.
5. WHEN a Member submits a move-task request with a target List ID and position index, THE API_Server SHALL update the Task's List reference and position, record an entry in the Activity_Log, and emit a real-time event via the Realtime_Service.

---

### Requirement 7: Drag-and-Drop Task Reordering

**User Story:** As a Board Member, I want to drag tasks between lists and reorder them within a list, so that I can visually manage workflow without manual form submissions.

#### Acceptance Criteria

1. WHILE a User is viewing a Board, THE Drag_Drop_Client SHALL allow the User to drag a Task card and drop it into any List on the same Board.
2. WHEN a drag-and-drop operation completes, THE Drag_Drop_Client SHALL immediately update the UI to reflect the new Task position before the API response is received (optimistic update).
3. WHEN a drag-and-drop operation completes, THE Drag_Drop_Client SHALL send a move-task request to the API_Server with the target List ID and new position index.
4. IF the move-task API request fails, THEN THE Drag_Drop_Client SHALL revert the Task to its original List and position and display an error message to the User.
5. WHEN a move-task request is processed, THE Realtime_Service SHALL broadcast the updated Task position to all other Users viewing the same Board.

---

### Requirement 8: Real-Time Collaboration

**User Story:** As a Board Member, I want to see changes made by teammates instantly, so that I always have an up-to-date view of the board without refreshing.

#### Acceptance Criteria

1. WHEN a User opens a Board, THE Realtime_Service SHALL add the User's socket connection to a room identified by the Board ID.
2. WHEN a Task is created, updated, moved, or deleted on a Board, THE Realtime_Service SHALL broadcast the change event to all socket connections in that Board's room except the originating connection.
3. WHEN a Comment is added to a Task, THE Realtime_Service SHALL broadcast the new Comment to all socket connections in the Board's room.
4. WHEN a User joins a Board via invitation, THE Realtime_Service SHALL broadcast a member-joined event to all socket connections in that Board's room.
5. WHEN a User closes or navigates away from a Board, THE Realtime_Service SHALL remove the User's socket connection from the Board's room.

---

### Requirement 9: Comments and Activity Log

**User Story:** As a Board Member, I want to comment on tasks and view an activity history, so that my team can communicate in context and track changes over time.

#### Acceptance Criteria

1. WHEN a Member submits a create-comment request with non-empty text and a valid Task ID, THE API_Server SHALL store the Comment with the author's User ID and a UTC timestamp, then return HTTP status 201.
2. THE API_Server SHALL return all Comments for a Task in ascending chronological order when a get-comments request is received for that Task.
3. WHEN a Member submits a delete-comment request for a Comment they authored, THE API_Server SHALL delete the Comment and return HTTP status 200.
4. IF a Member attempts to delete a Comment authored by another User, THEN THE API_Server SHALL return HTTP status 403.
5. THE Activity_Log SHALL record an entry for each of the following events: Board created, Board renamed, List created, List renamed, List deleted, Task created, Task updated, Task moved, Task deleted, Member added, Member removed, Comment added.
6. THE API_Server SHALL return Activity_Log entries for a Board in descending chronological order, paginated at 50 entries per page, when a get-activity request is received.

---

### Requirement 10: File Attachments

**User Story:** As a Board Member, I want to attach files to tasks, so that relevant documents and images are accessible in context.

#### Acceptance Criteria

1. WHEN a Member submits a file upload request for a Task, THE API_Server SHALL upload the file to the File_Store and store the resulting URL and metadata (filename, size, MIME type, uploader User ID, upload timestamp) on the Task record.
2. THE API_Server SHALL reject file upload requests where the file size exceeds 25 MB and return HTTP status 413.
3. THE API_Server SHALL reject file upload requests where the MIME type is not in the permitted list (image/jpeg, image/png, image/gif, application/pdf, text/plain, application/zip) and return HTTP status 415.
4. WHEN a Member submits a delete-attachment request for an attachment they uploaded, THE API_Server SHALL delete the file from the File_Store and remove the attachment record from the Task.
5. IF a Member attempts to delete an attachment uploaded by another User, THEN THE API_Server SHALL return HTTP status 403.

---

### Requirement 11: Due Dates and Overdue Notifications

**User Story:** As a Board Member, I want to set due dates on tasks and receive reminders, so that deadlines are not missed.

#### Acceptance Criteria

1. WHEN a Task's due date is set or updated, THE API_Server SHALL store the due date as a UTC ISO 8601 datetime on the Task record.
2. WHILE the current UTC time is within 24 hours before a Task's due date and the Task has not been marked complete, THE Notification_Service SHALL send a reminder email to all Users assigned to that Task.
3. WHILE the current UTC time is past a Task's due date and the Task has not been marked complete, THE System SHALL mark the Task as overdue.
4. WHILE a Task is marked overdue, THE Drag_Drop_Client SHALL render the Task card with a red visual indicator.
5. THE Notification_Service SHALL send at most one 24-hour reminder email per Task per due date value to prevent duplicate notifications.

---

### Requirement 12: Smart Dashboard and Analytics

**User Story:** As a User, I want a dashboard showing task statistics and productivity insights, so that I can monitor progress and identify bottlenecks.

#### Acceptance Criteria

1. WHEN a User opens the Dashboard, THE API_Server SHALL return the following metrics for each Board the User belongs to: total task count, completed task count, overdue task count, and tasks assigned to the User.
2. THE Dashboard SHALL display task completion trends as a chart using data grouped by calendar week for the past 12 weeks.
3. THE Dashboard SHALL display a breakdown of tasks by priority (Low, Medium, High) for each Board.
4. WHEN dashboard metrics are requested, THE API_Server SHALL serve the response from the Cache if a cached result exists and is less than 5 minutes old.
5. WHEN a Task status changes, THE API_Server SHALL invalidate the Cache entry for the affected Board's dashboard metrics.

---

### Requirement 13: Search and Filtering

**User Story:** As a Board Member, I want to search and filter tasks, so that I can quickly locate specific work items across a large board.

#### Acceptance Criteria

1. WHEN a search request is received with a non-empty query string, THE Search_Service SHALL return all Tasks within the User's accessible Boards whose title or description contains the query string (case-insensitive).
2. WHEN a filter request is received with one or more filter parameters, THE Search_Service SHALL return Tasks matching all specified filters simultaneously (AND logic).
3. THE Search_Service SHALL support the following filter parameters: priority (Low, Medium, High), due date range (start date and end date), and assigned User ID.
4. WHEN a search or filter request is received, THE Search_Service SHALL return results within 500 ms for boards containing up to 10,000 Tasks.
5. THE Search_Service SHALL return an empty array (not an error) when no Tasks match the search or filter criteria.

---

### Requirement 14: Dark/Light Mode and Responsive UI

**User Story:** As a User, I want to switch between dark and light themes and use the app on any device, so that I have a comfortable experience in any environment.

#### Acceptance Criteria

1. THE System SHALL provide a dark mode and a light mode theme selectable by the User.
2. WHEN a User selects a theme, THE System SHALL persist the selection in the User's browser local storage and apply it on subsequent visits without requiring re-selection.
3. THE System SHALL render all views correctly on viewport widths from 320 px to 2560 px without horizontal scrolling or content overflow.
4. WHILE the viewport width is below 768 px, THE System SHALL display the Board's Lists in a vertically stacked, single-column layout.
5. THE System SHALL meet WCAG 2.1 Level AA color contrast requirements for all text and interactive elements in both dark and light themes.
