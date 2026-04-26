import React from 'react';
import { StatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerGlobals } from 'react-native-webrtc';
import { AuthProvider } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import { CallProvider } from './src/contexts/CallContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { CallOverlay } from './src/components/call';
import AppNavigator from './src/navigation/AppNavigator';

// Initialize WebRTC globals at app startup to prevent Android JNI crashes
if (Platform.OS === 'android') {
  registerGlobals();
}


function AppContent() {
  const { isDark } = useTheme();

  React.useEffect(() => {
    const initServices = async () => {
      try {
        const { default: DeviceTokenService } = await import('./src/services/DeviceTokenService');
        await DeviceTokenService.initialize();
        const { default: NotificationService } = await import('./src/services/NotificationService');
        await NotificationService.initialize();
      } catch (err) {
        console.error('Failed to initialize services:', err);
      }
    };
    initServices();
  }, []);

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <AppNavigator />
      <CallOverlay />
    </>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <CallProvider>
                <AppContent />
              </CallProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
