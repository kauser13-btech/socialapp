import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@theme_preference';

export const lightColors = {
  primary: '#1877F2',
  primaryLight: '#3b94ff',
  primaryHover: '#0d5dbf',

  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  error: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',

  background: '#ffffff',
  backgroundDark: '#f3f4f6',
  surface: '#ffffff',

  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',

  border: '#e5e7eb',
  borderDark: '#d1d5db',

  cardBackground: '#ffffff',
  cardShadow: 'rgba(0, 0, 0, 0.1)',

  white: '#ffffff',
  black: '#000000',

  tabBar: '#ffffff',
  tabBarBorder: '#e5e7eb',
  header: '#ffffff',
  headerText: '#111827',
  inputBackground: '#ffffff',
  offlineBg: '#f59e0b',
};

export const darkColors = {
  primary: '#3b94ff',
  primaryLight: '#1877F2',
  primaryHover: '#60aaff',

  gray50: '#1a1a2e',
  gray100: '#1e1e2e',
  gray200: '#2a2a3e',
  gray300: '#3a3a4e',
  gray400: '#6b7280',
  gray500: '#9ca3af',
  gray600: '#d1d5db',
  gray700: '#e5e7eb',
  gray800: '#f3f4f6',
  gray900: '#f9fafb',

  error: '#f87171',
  success: '#34d399',
  warning: '#fbbf24',
  info: '#60a5fa',

  background: '#0f0f1a',
  backgroundDark: '#1a1a2e',
  surface: '#1e1e2e',

  textPrimary: '#f9fafb',
  textSecondary: '#9ca3af',
  textTertiary: '#6b7280',

  border: '#2a2a3e',
  borderDark: '#3a3a4e',

  cardBackground: '#1e1e2e',
  cardShadow: 'rgba(0, 0, 0, 0.4)',

  white: '#ffffff',
  black: '#000000',

  tabBar: '#1e1e2e',
  tabBarBorder: '#2a2a3e',
  header: '#1e1e2e',
  headerText: '#f9fafb',
  inputBackground: '#2a2a3e',
  offlineBg: '#fbbf24',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState(null); // null = system, 'light', 'dark'

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setMode(saved);
      }
    });
  }, []);

  const isDark = mode === 'dark' || (mode === null && systemScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  const toggleTheme = async () => {
    const next = isDark ? 'light' : 'dark';
    setMode(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  };

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme, mode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
