/**
 * @format
 */

import 'react-native-get-random-values';

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AndroidCategory,
  AndroidLaunchActivityFlag,
  EventType,
} from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function createCallChannel() {
  return notifee.createChannel({
    id: 'incoming_call',
    name: 'Incoming Calls',
    importance: AndroidImportance.HIGH,
    // 'ringtone' maps to android/app/src/main/res/raw/ringtone.wav
    sound: 'ringtone',
    vibration: true,
  });
}

async function createMessageChannel() {
  return notifee.createChannel({
    id: 'messages',
    name: 'Messages',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
}

// ─── Background FCM handler (app killed / background) ───────────────────────
// Must be registered before AppRegistry. Only ONE handler should exist
// across the whole project — index.js is the right place.

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM Background]', remoteMessage);

  const { data } = remoteMessage;

  if (data?.type === 'call') {
    const channelId = await createCallChannel();

    await notifee.displayNotification({
      id: `call_${typeof data.callUUID === 'string' ? data.callUUID : String(Date.now())}`,
      title: `Incoming ${data.callType === 'audio' ? 'Audio' : 'Video'} Call`,
      body: `${data.callerName || 'Someone'} is calling you...`,
      data,
      android: {
        channelId,
        // AndroidCategory.CALL lets Android bypass background-launch restrictions
        // for incoming calls on Android 10+ (required for full-screen intent to fire)
        category: AndroidCategory.CALL,
        importance: AndroidImportance.HIGH,
        smallIcon: 'ic_launcher',
        sound: 'ringtone',
        // Do NOT set ongoing:true without a real foreground service — Android 8+
        // silently drops ongoing notifications that don't have a paired service.
        // Wake screen and launch over the lock screen via fullScreenAction instead.
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
    });
    return;
  }

  // Generic chat / other notifications
  const channelId = await createMessageChannel();
  await notifee.displayNotification({
    title: remoteMessage.notification?.title || data?.title || 'New Message',
    body: remoteMessage.notification?.body || data?.body || 'You have a new message',
    data: data || {},
    android: {
      channelId,
      smallIcon: 'ic_launcher',
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'default' },
      sound: 'default',
    },
  });
});

// ─── Background Notifee event handler (notification action buttons) ──────────
// Handles action button presses when the app is killed or in the background.
// "Answer" launches MainActivity (handled by launchActivity above),
// but we still need to cancel the notification so it doesn't linger.
// "Decline" dismisses without opening the app.

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  if (type !== EventType.ACTION_PRESS) return;
  if (notification?.data?.type !== 'call') return;

  if (pressAction?.id === 'answer' || pressAction?.id === 'decline') {
    // Cancel the ringing notification in both cases so it doesn't linger.
    // For 'answer': the app is launched by launchActivity above and CallContext handles the rest.
    // For 'decline': silently dismiss — no app launch.
    await notifee.cancelNotification(notification.id);
  }
});

AppRegistry.registerComponent(appName, () => App);
