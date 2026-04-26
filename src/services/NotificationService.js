import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform } from 'react-native';

class NotificationService {
  channelId = null;
  // Stores callerInfo extracted from a notification action press so
  // CallContext can auto-answer when the app comes to foreground.
  pendingAnswerData = null;
  pendingNavigation = null;

  async initialize() {
    // Request USE_FULL_SCREEN_INTENT permission on Android 14+ (API 34+).
    // Without this the full-screen activity won't launch over the lock screen.
    if (Platform.OS === 'android' && Platform.Version >= 34) {
      try {
        await notifee.requestPermission();
      } catch (e) {
        console.log('NotificationService: requestPermission error', e);
      }
    }

    // Create the standard message channel
    this.channelId = await notifee.createChannel({
      id: 'messages',
      name: 'Messages',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    // Handle foreground FCM messages — display as local notification
    messaging().onMessage(async remoteMessage => {
      console.log('FCM foreground message:', remoteMessage);

      const { notification, data } = remoteMessage;

      // Call notifications are handled by the socket (CallContext) when the
      // app is in the foreground — no need to show a local notification.
      if (data?.type === 'call') return;

      await notifee.displayNotification({
        title: notification?.title || data?.title || 'New Message',
        body: notification?.body || data?.body || '',
        data: data || {},
        android: {
          channelId: this.channelId,
          smallIcon: 'ic_launcher',
          pressAction: { id: 'default' },
          importance: AndroidImportance.HIGH,
          sound: 'default',
        },
        ios: {
          sound: 'default',
        },
      });
    });

    // Handle foreground Notifee events (notification pressed / action pressed)
    notifee.onForegroundEvent(({ type, detail }) => {
      const { notification, pressAction } = detail;

      if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
        if (notification?.data?.type === 'call') {
          if (pressAction?.id === 'answer') {
            // Store caller data so CallContext can auto-answer
            this.pendingAnswerData = notification.data;
          }
          // Cancel the notification in both answer and decline cases
          notifee.cancelNotification(notification.id).catch(() => {});
          return;
        }

        if (notification?.data) {
          this.handleNotificationPress(notification.data);
        }
      }
    });
  }

  handleNotificationPress(data) {
    this.pendingNavigation = data;
  }

  getPendingNavigation() {
    const data = this.pendingNavigation;
    this.pendingNavigation = null;
    return data;
  }

  getPendingAnswerData() {
    const data = this.pendingAnswerData;
    this.pendingAnswerData = null;
    return data;
  }
}

export default new NotificationService();
