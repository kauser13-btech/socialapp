import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { Platform, Vibration } from 'react-native';
import { useAuth } from './AuthContext';
import api from '../lib/api';
import { SOCKET_URL } from '@env';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const socketRef = useRef(null);

  // Play notification sound/vibration
  const playNotificationSound = useCallback(() => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate(100);
    } else {
      Vibration.vibrate([0, 100, 50, 100]);
    }
  }, []);

  // Reset unread count (call when user opens Messages tab)
  const resetUnreadMessageCount = useCallback(() => {
    setUnreadMessageCount(0);
  }, []);

  // Connect to socket when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const connectSocket = async () => {
      const token = await api.getToken();
      if (!token) return;

      console.log('SocketContext: Connecting to', SOCKET_URL);

      const newSocket = io(SOCKET_URL, {
        auth: {
          token,
          userId: user.id,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        newSocket.emit('presence:get-online-friends');
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        setOnlineUsers(new Set());
      });

      newSocket.on('user:online', ({ userId }) => {
        setOnlineUsers(prev => new Set([...prev, userId]));
      });

      newSocket.on('user:offline', ({ userId }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      });

      newSocket.on('presence:online-friends', ({ userIds }) => {
        setOnlineUsers(new Set(userIds));
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
        setIsConnected(false);
      });

      // Increment unread count on every incoming message
      newSocket.on('message:receive', () => {
        playNotificationSound();
        setUnreadMessageCount(prev => prev + 1);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, playNotificationSound]);

  const sendMessage = useCallback((receiverId, message) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('message:send', { receiverId, message });
    }
  }, [isConnected]);

  const startTyping = useCallback((receiverId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing:start', { receiverId });
    }
  }, [isConnected]);

  const stopTyping = useCallback((receiverId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing:stop', { receiverId });
    }
  }, [isConnected]);

  const markAsRead = useCallback((senderId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('message:read', { senderId });
    }
  }, [isConnected]);

  const onMessageRead = useCallback((callback) => {
    if (!socketRef.current) return () => {};
    socketRef.current.on('message:read', callback);
    return () => socketRef.current?.off('message:read', callback);
  }, []);

  const value = useMemo(() => ({
    socket,
    isConnected,
    onlineUsers,
    unreadMessageCount,
    resetUnreadMessageCount,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    onMessageRead,
    playNotificationSound,
  }), [socket, isConnected, onlineUsers, unreadMessageCount, resetUnreadMessageCount, sendMessage, startTyping, stopTyping, markAsRead, onMessageRead, playNotificationSound]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}

export default SocketContext;
