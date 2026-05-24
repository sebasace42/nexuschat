import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user }      = useAuth();
  const socketRef     = useRef(null);
  const [socket, setSocket]         = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('nexus_token');

    const newSocket = io('http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket conectado:', newSocket.id);
      setSocket(newSocket); // solo actualizamos el estado cuando YA está conectado
    });

    newSocket.on('users:online', (ids) => setOnlineUsers(ids));

    newSocket.on('connect_error', (err) => {
      console.error('❌ Socket error:', err.message);
    });

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