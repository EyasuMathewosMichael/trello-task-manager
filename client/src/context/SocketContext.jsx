import { createContext, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import socketService from '../services/socketService.js';
import { getAccessToken } from '../services/api.js';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();

  // Connect/disconnect socket based on auth state
  useEffect(() => {
    if (user) {
      const token = getAccessToken();
      socketService.connect(token);
    } else {
      socketService.disconnect();
    }

    return () => {
      // Cleanup on unmount
      socketService.disconnect();
    };
  }, [user]);

  const value = {
    joinBoard: (boardId) => socketService.joinBoard(boardId),
    leaveBoard: (boardId) => socketService.leaveBoard(boardId),
    on: (event, handler) => socketService.on(event, handler),
    off: (event, handler) => socketService.off(event, handler),
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export default SocketContext;
