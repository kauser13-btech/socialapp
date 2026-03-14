import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

class NotificationService {
  constructor() {
    this.channelId = null;
  }

  async initialize() {
    // Create Android notification channel
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

      // Skip call notifications (handled by CallContext)
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

    // Handle notification press (app opened from notification)
    notifee.onForegroundEvent(({ type, detail }) => {
      // type 1 = PRESS
      if (type === 1 && detail?.notification?.data) {
        this.handleNotificationPress(detail.notification.data);
      }
    });
  }

  handleNotificationPress(data) {
    // Navigation will be handled by the app's navigation context
    // Store the notification data so the app can navigate when ready
    this.pendingNavigation = data;
  }

  getPendingNavigation() {
    const data = this.pendingNavigation;
    this.pendingNavigation = null;
    return data;
  }
}

export default new NotificationService();
