// Static light-theme colors (used as defaults / for StyleSheet.create fallbacks)
// For dynamic dark-mode aware colors, use useTheme() from ThemeContext
export const colors = {
  primary: '#1B6A88',        // Unomi Primary
  primaryLight: '#4899AE',
  primaryHover: '#004D40',

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
