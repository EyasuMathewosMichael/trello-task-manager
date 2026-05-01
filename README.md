# TaskFlow — Advanced Trello-like Task Manager

A full-stack project management app with boards, lists, and task cards. Built for real-time team collaboration with drag-and-drop, analytics, and role-based access control.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router, dnd-kit, Recharts, Socket.io-client |
| Backend | Node.js, Express 5, Mongoose, Socket.io |
| Database | MongoDB |
| Cache | Redis |
| Auth | JWT (access + refresh tokens) |
| File Storage | Cloudinary |
| Email | Nodemailer (SMTP) |
| Scheduling | node-cron |

---

## Features

- **Boards, Lists & Tasks** — create and organize work across multiple boards
- **Drag & Drop** — move tasks between lists and reorder them with optimistic UI updates
- **Real-time Collaboration** — live updates via Socket.io when teammates make changes
- **Role-Based Access** — Admin and Member roles per board; admins manage members and settings
- **Email Invitations** — invite collaborators by email with time-limited invite links
- **Task Details** — description, due date, priority (Low/Medium/High), assignees, labels, attachments
- **Mark Complete** — toggle task completion status directly from the task modal
- **Comments** — threaded comments on tasks with edit and delete support
- **Activity Log** — chronological history of all board actions
- **File Attachments** — upload files to tasks via Cloudinary (max 25 MB)
- **Due Date Tracking** — overdue tasks flagged automatically via a cron job every 15 minutes
- **Email Reminders** — 24-hour due date reminder emails sent to assignees
- **Smart Dashboard** — per-board metrics (total, completed, overdue, my tasks), weekly completion trend chart, priority breakdown pie charts; results cached in Redis for 5 minutes
- **Search & Filter** — full-text search across task titles and descriptions; filter by priority, due date range, and assignee
- **Dark / Light Mode** — theme persisted in localStorage
- **Responsive UI** — works from 320 px mobile to wide desktop

---

## Project Structure

```
trello-task-manager/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── Auth/
│       │   ├── Board/
│       │   ├── Dashboard/
│       │   ├── Layout/
│       │   └── Task/
│       ├── context/
│       ├── hooks/
│       ├── pages/
│       ├── services/
│       └── styles/
└── server/          # Node.js/Express backend
    └── src/
        ├── models/
        ├── routes/
        ├── services/
        ├── middleware/
        ├── socket/
        ├── cache/
        └── db/
```

---

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or managed)
- Cloudinary account (for file attachments)
- SMTP credentials (for email — optional in development)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/trello-task-manager.git
cd trello-task-manager
```

### 2. Install dependencies

```bash
npm install
```

This installs dependencies for both `client` and `server` workspaces.

### 3. Configure environment variables

```bash
cp .env.example server/.env
```

Edit `server/.env` and fill in your values:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

MONGODB_URI=mongodb://localhost:27017/trello-task-manager
REDIS_URL=redis://localhost:6379

JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
```

### 4. Start the development servers

Run each in a separate terminal:

```bash
# Backend (http://localhost:5000)
npm run dev:server

# Frontend (http://localhost:3000)
npm run dev:client
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev:server` | Start backend with nodemon (hot reload) |
| `npm run dev:client` | Start frontend with Vite dev server |
| `npm run test:server` | Run backend tests (Jest) |
| `npm run test:client` | Run frontend tests (Vitest) |
| `npm run test:e2e` | Run Playwright E2E tests (requires both servers running) |
| `npm run lint` | Lint all JS/JSX files with ESLint |
| `npm run format` | Format all files with Prettier |

---

## API Overview

All API routes are prefixed with `/api`.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and receive tokens |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/boards` | List boards for current user |
| POST | `/boards` | Create a board |
| GET | `/boards/:id` | Get board details and members |
| PUT | `/boards/:id` | Update board name |
| DELETE | `/boards/:id` | Delete a board |
| GET | `/boards/:id/lists` | Get all lists for a board |
| POST | `/boards/:id/lists` | Create a list |
| GET | `/lists/:listId/tasks` | Get all tasks in a list |
| POST | `/lists/:listId/tasks` | Create a task |
| PUT | `/tasks/:id` | Update a task |
| PUT | `/tasks/:id/move` | Move a task to another list |
| DELETE | `/tasks/:id` | Delete a task |
| GET | `/tasks/:id/comments` | Get comments for a task |
| POST | `/tasks/:id/comments` | Add a comment |
| DELETE | `/comments/:id` | Delete a comment |
| GET | `/dashboard` | Get dashboard metrics |
| GET | `/search` | Search and filter tasks |
| POST | `/boards/:id/invite` | Send a board invitation |
| GET | `/api/health` | Health check |

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Port the server listens on |
| `NODE_ENV` | Yes | `development` or `production` |
| `CLIENT_URL` | Yes | Frontend origin for CORS |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | Secret for signing refresh tokens |
| `JWT_EXPIRES_IN` | Yes | Access token expiry (e.g. `24h`) |
| `JWT_REFRESH_EXPIRES_IN` | Yes | Refresh token expiry (e.g. `7d`) |
| `CLOUDINARY_CLOUD_NAME` | For attachments | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | For attachments | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | For attachments | Cloudinary API secret |
| `SMTP_HOST` | For email | SMTP server hostname |
| `SMTP_PORT` | For email | SMTP server port |
| `SMTP_USER` | For email | SMTP username |
| `SMTP_PASS` | For email | SMTP password |

---

## License

MIT
