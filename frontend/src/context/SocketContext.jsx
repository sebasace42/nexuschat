import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://nexuschat-production-e1f6.up.railway.app';

export const SocketProvider = ({ children }) => {
  const { user }      = useAuth();
  const socketRef     = useRef(null);
  const [socket,      setSocket]      = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('nexus_token');

    const newSocket = io(SOCKET_URL, {
      auth:       { token },
      transports: ['websocket'],
      reconnection:         true,
      reconnectionDelay:    1000,
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket conectado:', newSocket.id);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket desconectado:', reason);
      setSocket(null);
    });

    newSocket.on('reconnect', () => {
      setSocket(newSocket);
    });

    newSocket.on('users:online',  (ids) => setOnlineUsers(ids));
    newSocket.on('connect_error', (err) => console.error('❌ Error:', err.message));

    socketRef.current = newSocket;

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);