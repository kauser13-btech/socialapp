import React from 'react';
import { StatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerGlobals } from 'react-native-webrtc';
import { AuthProvider } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import { CallProvider } from './src/contexts/CallContext';
import { CallOverlay } from './src/components/call';
import AppNavigator from './src/navigation/AppNavigator';

// Initialize WebRTC globals at app startup to prevent Android JNI crashes
if (Platform.OS === 'android') {
  registerGlobals();
}

// Background handler for Firebase Cloud Messaging
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);

  // For data-only messages, display a notification manually
  const { data } = remoteMessage;
  if (data?.type === 'message') {
    const channelId = await notifee.createChannel({
      id: 'messages',
      name: 'Messages',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });

    await notifee.displayNotification({
      title: data.senderName || 'New Message',
      body: data.content || 'You have a new message',
      data,
      android: {
        channelId,
        smallIcon: 'ic_notification',
        pressAction: { id: 'default' },
        sound: 'default',
      },
      ios: {
        sound: 'default',
      },
    });
  }
});

function App() {
  React.useEffect(() => {
    const initServices = async () => {
      try {
        // Initialize Device Token Service (FCM registration)
        const { default: DeviceTokenService } = await import('./src/services/DeviceTokenService');
        await DeviceTokenService.initialize();

        // Initialize Notification Service (foreground message display)
        const { default: NotificationService } = await import('./src/services/NotificationService');
        await NotificationService.initialize();
      } catch (err) {
        console.error('Failed to initialize services:', err);
      }
    };
    initServices();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SocketProvider>
            <CallProvider>
              <StatusBar barStyle="dark-content" />
              <AppNavigator />
              <CallOverlay />
            </CallProvider>
          </SocketProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
