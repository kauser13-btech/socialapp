import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { Platform, Vibration } from 'react-native';
import { useAuth } from './AuthContext';
import api from '../lib/api';
import { SOCKET_URL } from '@env';

const SocketContext = createContext(null);

const socketUrl = SOCKET_URL || 'https://socket.drivingit.com';

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socketRef = useRef(null);

  // Play notification sound/vibration
  const playNotificationSound = useCallback(() => {
    // Vibrate for haptic feedback
    if (Platform.OS === 'ios') {
      // iOS short vibration
      Vibration.vibrate(100);
    } else {
      // Android pattern: wait 0ms, vibrate 100ms, wait 50ms, vibrate 100ms
      Vibration.vibrate([0, 100, 50, 100]);
    }
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
        // Request online status of friends
        newSocket.emit('presence:get-online-friends');
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        setOnlineUsers(new Set());
      });

      // Track online/offline presence
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

      // Global message listener for notifications
      newSocket.on('message:receive', () => {
        // Play notification sound for incoming messages
        playNotificationSound();
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

  // Send a message via socket
  const sendMessage = useCallback((receiverId, message) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('message:send', { receiverId, message });
    }
  }, [isConnected]);

  // Start typing indicator
  const startTyping = useCallback((receiverId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing:start', { receiverId });
    }
  }, [isConnected]);

  // Stop typing indicator
  const stopTyping = useCallback((receiverId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing:stop', { receiverId });
    }
  }, [isConnected]);

  // Mark messages as read
  const markAsRead = useCallback((senderId) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('message:read', { senderId });
    }
  }, [isConnected]);

  const value = useMemo(() => ({
    socket,
    isConnected,
    onlineUsers,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    playNotificationSound,
  }), [socket, isConnected, onlineUsers, sendMessage, startTyping, stopTyping, markAsRead, playNotificationSound]);

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
