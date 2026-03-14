import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { authAPI } from '../lib/api';
import DeviceTokenService from '../services/DeviceTokenService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await api.getToken();
      if (token) {
        const response = await authAPI.me();
        if (response.success) {
          setUser(response.data.user);
          // Re-register device token on every app init so a fresh install
          // always pushes the current token to the backend.
          DeviceTokenService.initialize();
        }
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      await api.clearToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    if (response.success) {
      await api.setToken(response.data.access_token);
      setUser(response.data.user);
      // initialize sets up permissions + listener; syncToken always sends the
      // current token immediately, even if initialize() already ran before.
      await DeviceTokenService.initialize();
      DeviceTokenService.syncToken();
      return response;
    }
    throw new Error(response.message || 'Login failed');
  };

  const register = async (userData) => {
    const response = await authAPI.register(userData);
    if (response.success) {
      await api.setToken(response.data.access_token);
      setUser(response.data.user);
      await DeviceTokenService.initialize();
      DeviceTokenService.syncToken();
      return response;
    }
    throw new Error(response.message || 'Registration failed');
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.me();
      if (response.success) setUser(response.data.user);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const logout = async () => {
    try {
      await DeviceTokenService.removeToken();
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await api.clearToken();
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
