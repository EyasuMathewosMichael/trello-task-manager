import { io } from 'socket.io-client';

let socket = null;

const socketService = {
  connect(accessToken) {
    if (socket?.connected) {
      return;
    }

    socket = io({
      auth: { token: accessToken },
      autoConnect: true,
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  joinBoard(boardId) {
    if (socket?.connected) {
      socket.emit('board:join', { boardId });
    }
  },

  leaveBoard(boardId) {
    if (socket?.connected) {
      socket.emit('board:leave', { boardId });
    }
  },

  on(event, handler) {
    if (socket) {
      socket.on(event, handler);
    }
  },

  off(event, handler) {
    if (socket) {
      socket.off(event, handler);
    }
  },

  get connected() {
    return socket?.connected ?? false;
  },
};

export default socketService;
