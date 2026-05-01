// Feature: trello-task-manager, Socket.io Server
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

/**
 * Initialises the Socket.io server and attaches it to the HTTP server.
 * Must be called once from server.js after the HTTP server is created.
 *
 * @param {import('http').Server} httpServer
 */
export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ── JWT authentication middleware ──────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: no token'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.email = decoded.email;
      return next();
    } catch (err) {
      return next(new Error('Authentication error: invalid token'));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    // Join a board room
    socket.on('board:join', ({ boardId }) => {
      if (boardId) {
        socket.join(`board:${boardId}`);
      }
    });

    // Leave a board room
    socket.on('board:leave', ({ boardId }) => {
      if (boardId) {
        socket.leave(`board:${boardId}`);
      }
    });

    socket.on('disconnect', () => {
      // Socket.io automatically removes the socket from all rooms on disconnect
    });
  });

  return io;
}

/**
 * Emits a Socket.io event to all clients in a board room except the sender.
 * If the Socket.io server has not been initialised, this is a no-op.
 *
 * @param {string|ObjectId} boardId - The board room to emit to
 * @param {string}          event   - The event name (e.g. 'task:created')
 * @param {object}          payload - The event payload
 */
export function emitToBoard(boardId, event, payload) {
  if (!io) return;
  io.to(`board:${boardId}`).emit(event, payload);
}
