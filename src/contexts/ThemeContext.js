import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@theme_preference';

export const lightColors = {
  primary: '#6B63F5',        // Unomi Primary
  primaryLight: '#9B95F8',
  primaryHover: '#4F47D6',

  secondary: '#F47C4F',      // Unomi Secondary
  secondaryLight: '#FFB08A',

  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#8E8E93',        // Unomi Secondary Text
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  error: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#3b82f6',

  background: '#FFFFFF',     // Unomi Background
  backgroundDark: '#F2F2F7', // Unomi Secondary Background
  surface: '#FFFFFF',

  textPrimary: '#000000',    // Unomi Primary Text
  textSecondary: '#8E8E93',  // Unomi Secondary Text
  textTertiary: '#9ca3af',

  border: '#e5e7eb',
  borderDark: '#d1d5db',

  cardBackground: '#ffffff',
  cardShadow: 'rgba(0, 0, 0, 0.08)',

  white: '#ffffff',
  black: '#000000',

  tabBar: '#ffffff',
  tabBarBorder: '#e5e7eb',
  header: '#ffffff',
  headerText: '#000000',
  inputBackground: '#F2F2F7', // Match iOS text fields
  offlineBg: '#f59e0b',
};

export const darkColors = {
  primary: '#9B95F8',        // Unomi Primary (lighter for dark mode)
  primaryLight: '#6B63F5',
  primaryHover: '#C4C0FB',

  secondary: '#F47C4F',      // Unomi Secondary
  secondaryLight: '#FFB08A',

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

  background: '#0f0f1a',     // Deep dark background
  backgroundDark: '#1a1a2e', // Elevated dark background
  surface: '#1e1e2e',

  textPrimary: '#ffffff',    // White for contrast
  textSecondary: '#9ca3af',  // Soft gray
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
  headerText: '#ffffff',
  inputBackground: '#2a2a3e',
  offlineBg: '#fbbf24',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState(null);

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
