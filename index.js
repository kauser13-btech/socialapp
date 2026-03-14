/**
 * @format
 */

import 'react-native-get-random-values';

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidLaunchActivityFlag } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// Handle background messages
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);

  const { data } = remoteMessage;

  // Handle incoming call in background
  if (data?.type === 'call') {
    const channelId = await notifee.createChannel({
      id: 'calls',
      name: 'Incoming Calls',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    await notifee.displayNotification({
      title: 'Incoming Call',
      body: `${data.callerName || 'Someone'} is calling you...`,
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        importance: AndroidImportance.HIGH,
        // Wake screen and show over lock screen when app is killed
        fullScreenAction: {
          id: 'default',
          launchActivity: 'default',
          launchActivityFlags: [AndroidLaunchActivityFlag.SINGLE_TOP],
        },
        pressAction: {
          id: 'default',
          launchActivity: 'default',
          launchActivityFlags: [AndroidLaunchActivityFlag.SINGLE_TOP],
        },
        actions: [
          {
            title: 'Answer',
            pressAction: {
              id: 'answer',
              launchActivity: 'default',
              launchActivityFlags: [AndroidLaunchActivityFlag.SINGLE_TOP],
            },
          },
          {
            title: 'Decline',
            pressAction: {
              id: 'decline',
            },
          },
        ],
      },
      data: data,
    });
  } else {
    // Handle generic chat messages
    const channelId = await notifee.createChannel({
      id: 'messages',
      name: 'Messages',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    await notifee.displayNotification({
      title: remoteMessage.notification?.title || data?.title || 'New Message',
      body: remoteMessage.notification?.body || data?.body || 'You have a new message',
      android: {
        channelId,
        smallIcon: 'ic_launcher', // Fallback to app icon since ic_notification is missing
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
      },
      data: data,
    });
  }
});

// Register notifee background event handler for notification actions when app is killed
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  // EventType.PRESS = 1, EventType.ACTION_PRESS = 2
  if (type === 2 && pressAction?.id === 'decline') {
    // User pressed Decline from the notification — dismiss it silently
    await notifee.cancelNotification(notification.id);
  }
});

AppRegistry.registerComponent(appName, () => App);
