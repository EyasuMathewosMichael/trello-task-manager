import http from 'http';
import dotenv from 'dotenv';
import cron from 'node-cron';
import app from './app.js';
import connectDB from './db/connection.js';
import notificationService from './services/notificationService.js';
import { initSocketServer } from './socket/socketServer.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocketServer(server);

async function startServer() {
  try {
    await connectDB();

    // ── Overdue-detection cron job (every 15 minutes) ──────────────────────
    cron.schedule('*/15 * * * *', async () => {
      try {
        await notificationService.processOverdueTasks();
      } catch (err) {
        console.error('Overdue task processing error:', err);
      }
    });

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

startServer();

export default server;
