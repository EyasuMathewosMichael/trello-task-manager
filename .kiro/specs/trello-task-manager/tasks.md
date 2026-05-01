# Implementation Plan: Advanced Trello-like Task Manager

## Overview

This plan breaks the full-stack application into incremental coding tasks, building from the data layer upward through the API, real-time layer, and finally the React frontend. Each task builds on the previous one and ends with all code wired together. Property-based tests (fast-check) are placed immediately after the units they validate to catch regressions early.

---

## Tasks

- [x] 1. Project scaffolding and shared configuration
  - Initialize the monorepo structure: `server/` (Node.js/Express) and `client/` (React + Vite)
  - Configure ESLint, Prettier, and `.editorconfig` for both workspaces
  - Set up Jest for the server with `--testEnvironment node` and configure `@jest/globals`
  - Set up Vitest (or Jest) for the client
  - Add `fast-check` to server dev-dependencies
  - Create `.env.example` with all required environment variable keys (MongoDB URI, Redis URL, JWT secrets, Cloudinary/S3 credentials, SMTP config)
  - _Requirements: all_

- [x] 2. MongoDB models and database connection
  - [x] 2.1 Implement Mongoose connection module (`server/src/db/connection.js`)
    - Connect with retry logic; export a `connectDB()` function
    - _Requirements: 4.1, 6.1_

  - [x] 2.2 Implement all Mongoose schemas and models
    - Create `User`, `RefreshToken`, `Board`, `List`, `Task`, `Comment`, `ActivityLog`, `Invitation` schemas exactly as specified in the design
    - Add all indexes (unique, TTL, text) defined in the data models section
    - Export each model from `server/src/models/index.js`
    - _Requirements: 1.3, 2.1, 4.1, 5.1, 6.1, 9.1, 10.1, 11.1_

  - [ ]* 2.3 Write unit tests for Mongoose model validation
    - Test required field enforcement, enum constraints, and default values for each schema
    - _Requirements: 1.1, 6.2, 10.2_

- [x] 3. Authentication service and routes
  - [x] 3.1 Implement `authService.js` — register, login, refreshTokens, revokeRefreshToken
    - Use `bcrypt` (cost 12) for password hashing
    - Issue JWTs (24 h) and refresh tokens (7 d) using `jsonwebtoken`
    - Implement refresh token rotation: mark old token `used = true`, issue new token
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 3.2 Write property test — password hashing irreversibility and uniqueness (Property 1)
    - **Property 1: Password hashing is irreversible and unique**
    - **Validates: Requirements 1.3**
    - Generate arbitrary valid passwords; assert `hash !== plaintext` and two hashes of the same password differ

  - [ ]* 3.3 Write property test — JWT expiry enforcement (Property 2)
    - **Property 2: JWT expiry is enforced**
    - **Validates: Requirements 1.4, 1.8**
    - Generate tokens with past `exp` values; assert the auth middleware rejects them with 401

  - [ ]* 3.4 Write property test — refresh token no-reuse (Property 3)
    - **Property 3: Refresh token rotation — no reuse**
    - **Validates: Requirements 1.7**
    - Generate random token strings, use once via `refreshTokens`, assert second use is rejected

  - [x] 3.5 Implement JWT auth middleware (`server/src/middleware/authMiddleware.js`)
    - Validate `Authorization: Bearer <token>` header; attach `req.user` on success; return 401 on failure
    - _Requirements: 1.8_

  - [x] 3.6 Implement auth routes (`POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`)
    - Wire routes to `authService`; apply input validation with `express-validator`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 3.7 Write integration tests for auth flow
    - Test register → login → refresh → protected route using Supertest + MongoDB Memory Server
    - Test duplicate email returns 409, invalid credentials return 401
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8_

- [x] 4. Role-based access control middleware
  - [x] 4.1 Implement `roleMiddleware.js` — `requireBoardRole(minRole)` factory
    - Look up the requesting user's role on the target board; return 403 if insufficient
    - _Requirements: 2.3, 2.4, 2.5_

  - [ ]* 4.2 Write property test — board creator is always Admin (Property 4)
    - **Property 4: Role invariant — board creator is always Admin**
    - **Validates: Requirements 2.2**
    - Generate random user IDs and board names; assert membership role equals 'Admin' after creation

  - [ ]* 4.3 Write property test — Member cannot perform Admin actions (Property 5)
    - **Property 5: Role enforcement — Member cannot perform Admin actions**
    - **Validates: Requirements 2.4, 2.5**
    - Generate random Member users and admin-only action types; assert all return 403

  - [ ]* 4.4 Write integration tests for RBAC boundaries
    - Test Member attempting board rename, delete, and member management returns 403
    - _Requirements: 2.3, 2.4, 2.5_

- [x] 5. Board service and routes
  - [x] 5.1 Implement `boardService.js` — createBoard, listBoards, updateBoard, deleteBoard
    - `createBoard` assigns Admin role to creator; `deleteBoard` cascades to lists/tasks/comments/logs
    - Log activity for board create, rename, and delete events
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 5.2 Write property test — board visibility isolation (Property 6)
    - **Property 6: Board visibility isolation**
    - **Validates: Requirements 4.2**
    - Generate boards with random member sets; assert `listBoards` returns only boards where the user has membership

  - [x] 5.3 Implement board routes (`GET /api/boards`, `POST /api/boards`, `PUT /api/boards/:id`, `DELETE /api/boards/:id`)
    - Apply `authMiddleware` and `requireBoardRole` where appropriate
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 5.4 Write integration tests for board lifecycle
    - Test create → list → update → delete with cascade verification
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. List service and routes
  - [x] 6.1 Implement `listService.js` — createList, getLists, reorderList, renameList, deleteList
    - `createList` appends at end (max position + 1); `reorderList` recalculates contiguous positions
    - Log activity for list create, rename, reorder, and delete events
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 6.2 Write property test — list order preservation (Property 7)
    - **Property 7: List order preservation**
    - **Validates: Requirements 5.2, 5.3**
    - Generate random reorder sequences; assert positions are contiguous with no duplicates after each operation

  - [x] 6.3 Implement list routes (`GET /api/boards/:id/lists`, `POST /api/boards/:id/lists`, `PUT /api/boards/:id/lists/:listId`, `PUT /api/boards/:id/lists/reorder`, `DELETE /api/boards/:id/lists/:listId`)
    - Apply `authMiddleware` and `requireBoardRole`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 6.4 Write integration tests for list lifecycle
    - Test create → reorder → rename → delete with cascade verification
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Task service and routes
  - [x] 7.1 Implement `taskService.js` — createTask, updateTask, moveTask, deleteTask
    - `moveTask` updates `listId` and `position`; emits `task:moved` Socket.io event to board room
    - `deleteTask` removes associated comments and attachment records
    - Log activity for task create, update, move, and delete events
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 7.2 Write property test — task move consistency (Property 8)
    - **Property 8: Task move consistency**
    - **Validates: Requirements 6.5, 7.3**
    - Generate random source/target list + position combinations; assert task's `listId` and `position` equal requested values after move

  - [x] 7.3 Implement task routes (`GET /api/lists/:listId/tasks`, `POST /api/lists/:listId/tasks`, `PUT /api/tasks/:id`, `PUT /api/tasks/:id/move`, `DELETE /api/tasks/:id`)
    - Apply `authMiddleware` and `requireBoardRole`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 7.4 Write integration tests for task lifecycle
    - Test create → move → update → delete; verify cascade deletion of comments
    - _Requirements: 6.1, 6.3, 6.4, 6.5_

- [x] 8. Checkpoint — Ensure all server unit and integration tests pass
  - Run `jest` in `server/`; all tests must be green before proceeding
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Comment service and routes
  - [x] 9.1 Implement `commentService.js` — addComment, getComments, deleteComment
    - `addComment` stores `authorId` and UTC timestamp; emits `comment:added` Socket.io event
    - `deleteComment` validates authorship; returns 403 if requester is not the author
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ]* 9.2 Write property test — comment authorship enforcement (Property 10)
    - **Property 10: Comment authorship enforcement**
    - **Validates: Requirements 9.3, 9.4**
    - Generate random user pairs (author vs. non-author); assert non-author delete returns 403 and comment persists

  - [ ]* 9.3 Write property test — comment ordering (Property 11)
    - **Property 11: Comment ordering**
    - **Validates: Requirements 9.2**
    - Generate comments with random `createdAt` timestamps; assert `getComments` returns them in ascending order

  - [x] 9.4 Implement comment routes (`GET /api/tasks/:id/comments`, `POST /api/tasks/:id/comments`, `DELETE /api/comments/:id`)
    - Apply `authMiddleware` and `requireBoardRole`
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 10. Activity log service and route
  - [x] 10.1 Implement `activityLogService.js` — logActivity, getActivityLog
    - `logActivity` writes an `ActivityLog` document with `boardId`, `userId`, `action`, `entityId`, `entityType`, and `meta`
    - `getActivityLog` returns entries in descending chronological order, paginated at 50 per page
    - Wire `logActivity` calls into all service methods that require it (board, list, task, comment, member events)
    - _Requirements: 9.5, 9.6_

  - [x] 10.2 Implement activity log route (`GET /api/boards/:id/activity`)
    - Apply `authMiddleware` and `requireBoardRole('Member')`
    - _Requirements: 9.6_

- [x] 11. File attachment service and routes
  - [x] 11.1 Implement `attachmentService.js` — uploadAttachment, deleteAttachment
    - Validate file size (≤ 25 MB) and MIME type before uploading to Cloudinary/S3
    - Store URL, filename, size, mimeType, uploadedBy, uploadedAt on the Task's `attachments` array
    - `deleteAttachment` validates uploader ownership; returns 403 if requester is not the uploader
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 11.2 Write property test — file upload validation (Property 12)
    - **Property 12: File upload validation**
    - **Validates: Requirements 10.2, 10.3**
    - Generate file sizes and MIME types across boundary values; assert oversized or disallowed-type files are rejected before reaching File_Store and no attachment record is created

  - [ ]* 11.3 Write property test — attachment ownership enforcement (Property 13)
    - **Property 13: Attachment ownership enforcement**
    - **Validates: Requirements 10.5**
    - Generate random user pairs (uploader vs. non-uploader); assert non-uploader delete returns 403 and attachment remains on task

  - [x] 11.4 Implement attachment routes (`POST /api/tasks/:id/attachments`, `DELETE /api/attachments/:id`)
    - Use `multer` for multipart parsing; apply `authMiddleware` and `requireBoardRole`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 11.5 Write integration tests for file upload validation
    - Test valid upload, oversized file (413), and disallowed MIME type (415)
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 12. Notification service and due-date cron job
  - [x] 12.1 Implement `notificationService.js` — sendInvitation, sendDueReminder, processOverdueTasks
    - `sendInvitation` creates an `Invitation` record with a unique token (72 h expiry) and sends email via NodeMailer
    - `sendDueReminder` sends reminder email only if `task.reminderSent === false`; sets `reminderSent = true` after sending
    - `processOverdueTasks` queries tasks where `isComplete = false` and `dueDate < now`; sets `isOverdue = true`
    - _Requirements: 3.1, 11.2, 11.3, 11.5_

  - [ ]* 12.2 Write property test — due-date reminder deduplication (Property 14)
    - **Property 14: Due-date reminder deduplication**
    - **Validates: Requirements 11.5**
    - Run `processOverdueTasks` multiple times on the same task; assert reminder email is sent at most once per task per due date value

  - [ ]* 12.3 Write property test — overdue detection correctness (Property 15)
    - **Property 15: Overdue detection correctness**
    - **Validates: Requirements 11.3**
    - Generate tasks with random due dates relative to now; assert `isOverdue = true` for all incomplete tasks with `dueDate < now` after processing run

  - [x] 12.4 Implement invitation routes (`POST /api/boards/:id/invite`, `GET /api/invite/:token`)
    - `GET /api/invite/:token` validates token, checks expiry, adds user to board as Member, marks token used
    - Return 410 for expired or already-used tokens
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 12.5 Write property test — invitation single-use (Property 19)
    - **Property 19: Invitation single-use**
    - **Validates: Requirements 3.4**
    - Generate invitation tokens, use once, assert second use returns 410 and user is not added to board again

  - [x] 12.6 Register the overdue-detection cron job using `node-cron` (runs every 15 minutes)
    - _Requirements: 11.3, 11.5_

- [x] 13. Dashboard service, Redis caching, and route
  - [x] 13.1 Implement Redis client module (`server/src/cache/redisClient.js`)
    - Connect to Redis; export `get`, `set`, `del` helpers with JSON serialization
    - Fall back gracefully to `null` on Redis unavailability (log error, do not throw)
    - _Requirements: 12.4_

  - [x] 13.2 Implement `dashboardService.js` — getMetrics, invalidateCache
    - `getMetrics` checks `dashboard:user:{userId}` and `dashboard:board:{boardId}` keys (5 min TTL) before querying MongoDB
    - Aggregates: total tasks, completed tasks, overdue tasks, tasks assigned to user, weekly completion trend (12 weeks), priority breakdown
    - `invalidateCache` deletes the relevant Redis keys for a board
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 13.3 Write property test — dashboard cache invalidation (Property 16)
    - **Property 16: Dashboard cache invalidation**
    - **Validates: Requirements 12.4, 12.5**
    - After a task status change on a board, assert that the next `getMetrics` call does not return a cache entry predating the change

  - [x] 13.4 Implement dashboard route (`GET /api/dashboard`)
    - Apply `authMiddleware`; wire to `dashboardService.getMetrics`
    - Call `invalidateCache` from `taskService` whenever a task's `isComplete` or `isOverdue` field changes
    - _Requirements: 12.1, 12.4, 12.5_

- [x] 14. Search service and route
  - [x] 14.1 Implement `searchService.js` — search
    - Use MongoDB text index on `title` + `description` for full-text search
    - Apply AND logic for all provided filter parameters (priority, due date range, assignee)
    - Scope results to boards where the requesting user has a membership record
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 14.2 Write property test — search result containment (Property 17)
    - **Property 17: Search result containment**
    - **Validates: Requirements 13.1**
    - Generate random tasks and query strings; assert every returned task's title or description contains the query (case-insensitive) and belongs to a board the user is a member of

  - [ ]* 14.3 Write property test — filter AND logic (Property 18)
    - **Property 18: Filter AND logic**
    - **Validates: Requirements 13.2**
    - Generate tasks with random attributes and multi-parameter filter requests; assert every returned task satisfies all filter conditions simultaneously

  - [x] 14.4 Implement search route (`GET /api/search`)
    - Apply `authMiddleware`; parse and validate query parameters
    - _Requirements: 13.1, 13.2, 13.3, 13.5_

  - [ ]* 14.5 Write integration tests for search and filter
    - Seed 100 tasks with varied attributes; test full-text search, priority filter, date range filter, and combined filters
    - _Requirements: 13.1, 13.2, 13.3, 13.5_

- [x] 15. Socket.io server integration
  - [x] 15.1 Implement Socket.io server setup (`server/src/socket/socketServer.js`)
    - Attach Socket.io to the Express HTTP server; authenticate connections using JWT via `socket.handshake.auth`
    - Handle `board:join` and `board:leave` events to manage room membership
    - Export `emitToBoard(boardId, event, payload)` helper used by services
    - _Requirements: 8.1, 8.5_

  - [x] 15.2 Wire `emitToBoard` calls into all service methods that require real-time broadcast
    - `taskService.createTask` → `task:created`
    - `taskService.updateTask` → `task:updated`
    - `taskService.moveTask` → `task:moved`
    - `taskService.deleteTask` → `task:deleted`
    - `commentService.addComment` → `comment:added`
    - Invitation acceptance → `member:joined`
    - _Requirements: 8.2, 8.3, 8.4_

- [x] 16. Checkpoint — Full backend test suite
  - Run the complete Jest suite including all unit, property-based, and integration tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. React project setup and shared infrastructure
  - [x] 17.1 Bootstrap the React app with Vite (`client/`)
    - Configure path aliases, environment variables, and proxy to the API server
    - Install and configure `axios`, `socket.io-client`, `dnd-kit`, `react-router-dom`, `recharts` (or `chart.js`)
    - _Requirements: 14.1, 14.2_

  - [x] 17.2 Implement `AuthContext.jsx` and `api.js` Axios instance
    - Store access token in memory (not localStorage); store refresh token in an httpOnly cookie or localStorage per design
    - Axios request interceptor attaches `Authorization: Bearer <token>` header
    - Axios response interceptor catches 401, calls `/api/auth/refresh`, retries original request once; redirects to login on second failure
    - _Requirements: 1.4, 1.6, 1.7, 1.8_

  - [x] 17.3 Implement `ThemeContext.jsx` and `ThemeToggle.jsx`
    - Persist theme selection to `localStorage`; apply CSS class to `<body>` on load and on toggle
    - _Requirements: 14.1, 14.2_

  - [x] 17.4 Implement `SocketContext.jsx` and `socketService.js`
    - Connect Socket.io client with JWT auth; expose `joinBoard`, `leaveBoard`, and event subscription helpers
    - _Requirements: 8.1, 8.5_

- [x] 18. Authentication UI
  - [x] 18.1 Implement `LoginForm.jsx` and `RegisterForm.jsx`
    - Client-side validation (email format, password ≥ 8 chars); display server error messages
    - On successful login, store tokens and redirect to board list
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 18.2 Implement `InviteAccept.jsx`
    - Read invitation token from URL; call `GET /api/invite/:token`; handle 410 (expired/used) with user-friendly message
    - If user is not logged in, redirect to register/login with token preserved in query string
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 19. Board list and board management UI
  - [x] 19.1 Implement `BoardListPage.jsx` and `useBoard.js` hook
    - Fetch and display all boards for the current user; provide create-board form
    - _Requirements: 4.1, 4.2_

  - [x] 19.2 Implement board settings panel (rename, delete, member management, invite)
    - Show only to Admin users; call appropriate API endpoints
    - _Requirements: 2.3, 2.6, 3.1, 4.3, 4.4, 4.5_

- [x] 20. Board canvas with drag-and-drop
  - [x] 20.1 Implement `BoardView.jsx`, `ListColumn.jsx`, and `TaskCard.jsx`
    - Fetch lists and tasks for the board; render columns and cards
    - Subscribe to Socket.io board room on mount; unsubscribe on unmount
    - Apply real-time updates (`task:created`, `task:updated`, `task:moved`, `task:deleted`, `comment:added`, `member:joined`) to local state
    - _Requirements: 5.2, 6.1, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 20.2 Implement `DragDropBoard.jsx` with dnd-kit
    - Wrap board in `DndContext`; implement `onDragEnd` handler
    - Apply optimistic UI update immediately on drop; send `PUT /api/tasks/:id/move`
    - On API failure, revert task to original list and position; display toast error
    - Render overdue task cards with a red visual indicator (`isOverdue === true`)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 11.4_

  - [ ]* 20.3 Write client-side unit test — optimistic update rollback (Property 9)
    - **Property 9: Optimistic update rollback on failure**
    - **Validates: Requirements 7.4**
    - Mock the move-task API to return an error; assert task position reverts to pre-drag value in component state

- [x] 21. Task detail modal
  - [x] 21.1 Implement `TaskModal.jsx` and `TaskForm.jsx`
    - Display and edit all task fields: title, description, due date, priority, assignees, labels
    - Call `PUT /api/tasks/:id` on save; update local board state on success
    - _Requirements: 6.2, 6.3_

  - [x] 21.2 Implement `CommentThread.jsx`
    - Fetch and display comments in ascending chronological order
    - Add comment form; delete button visible only for the comment author
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 21.3 Implement `AttachmentList.jsx`
    - Display existing attachments with filename, size, and upload date
    - File upload input with client-side size and MIME type pre-validation (mirrors server rules)
    - Delete button visible only for the attachment uploader
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 22. Dashboard and analytics UI
  - [x] 22.1 Implement `DashboardView.jsx`, `MetricsCard.jsx`, `CompletionChart.jsx`, and `PriorityBreakdown.jsx`
    - Fetch metrics from `GET /api/dashboard`; render per-board metric cards
    - `CompletionChart` renders a weekly completion trend line/bar chart for the past 12 weeks using Recharts/Chart.js
    - `PriorityBreakdown` renders a pie or bar chart of tasks by priority per board
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 23. Search and filter UI
  - [x] 23.1 Implement search bar and filter panel in `Navbar.jsx` or a dedicated `SearchPage.jsx`
    - Debounce text input; call `GET /api/search?q=...` on change
    - Filter controls for priority, due date range, and assignee
    - Display results as a list of task cards linking to the relevant board/task
    - _Requirements: 13.1, 13.2, 13.3, 13.5_

- [x] 24. Responsive layout and accessibility
  - [x] 24.1 Implement `Navbar.jsx`, `Sidebar.jsx`, and responsive CSS
    - Apply CSS media queries: below 768 px, board lists stack vertically in a single column
    - Ensure all interactive elements have visible focus indicators and ARIA labels
    - _Requirements: 14.3, 14.4, 14.5_

  - [ ]* 24.2 Write axe-core accessibility tests for major views
    - Run automated WCAG 2.1 AA checks on Login, Board, Dashboard, and Task Modal views
    - _Requirements: 14.5_

- [x] 25. Checkpoint — Full application wiring and smoke test
  - Verify the client dev server proxies correctly to the API server
  - Confirm Socket.io events flow end-to-end (open two browser tabs on the same board)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 26. End-to-end tests (Playwright)
  - [x] 26.1 Write E2E test — board creation and list/task management workflow
    - Create board → add lists → create tasks → verify persistence
    - _Requirements: 4.1, 5.1, 6.1_

  - [x] 26.2 Write E2E test — drag-and-drop task movement
    - Drag a task card between lists; verify UI and API state are consistent
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 26.3 Write E2E test — real-time collaboration
    - Open two browser contexts on the same board; create a task in one and verify it appears in the other without refresh
    - _Requirements: 8.2_

  - [x] 26.4 Write E2E test — dark/light mode toggle and persistence
    - Toggle theme; reload page; assert theme is preserved
    - _Requirements: 14.1, 14.2_

  - [x] 26.5 Write E2E test — responsive layout at 320 px, 768 px, and 1280 px viewports
    - Assert single-column layout below 768 px; assert no horizontal overflow at all breakpoints
    - _Requirements: 14.3, 14.4_

- [x] 27. Final checkpoint — All tests pass
  - Run the full test suite: Jest (server), Vitest/Jest (client), Playwright (E2E)
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints (tasks 8, 16, 25, 27) ensure incremental validation at key milestones
- Property-based tests (fast-check) validate universal correctness properties; unit tests validate specific examples and edge cases
- The backend is built and fully tested before the frontend begins (tasks 2–16 before 17+)
- Redis unavailability is handled gracefully — the app degrades to direct MongoDB queries without surfacing errors to users
- Socket.io events are best-effort; REST responses are always returned regardless of emit success
