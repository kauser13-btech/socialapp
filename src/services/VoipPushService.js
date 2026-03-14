// import VoipPushNotification from 'react-native-voip-push-notification';
import CallKeepService from './CallKeepService';
import { Platform } from 'react-native';

let VoipPushNotification;
if (Platform.OS === 'ios') {
    try {
        VoipPushNotification = require('react-native-voip-push-notification').default;
    } catch (e) {
        console.log('VoipPushService: Failed to load react-native-voip-push-notification', e);
    }
}

class VoipPushService {
    constructor() {
        this.token = null;
    }

    initialize() {
        if (Platform.OS !== 'ios') return;

        console.log('VoipPushService: Initializing...');

        // Register for VoIP notifications
        VoipPushNotification.registerVoipToken();

        // Listen for events
        VoipPushNotification.addEventListener('register', (token) => {
            console.log('VoipPushService: Token received:', token);
            this.token = token;
            // TODO: Send this token to backend to update user's VoIP token
            // This will need to be handled by a method that has access to API service
        });

        VoipPushNotification.addEventListener('notification', (notification) => {
            console.log('VoipPushService: Notification received');

            try {
                // CallKit is already reported in native AppDelegate (required by iOS 13+).
                // Here we just track the UUID so CallKeepService knows the active call.
                let uuid = notification.uuid;

                if (!uuid) {
                    console.log('VoipPushService: No UUID in payload');
                    return;
                }

                console.log('VoipPushService: Tracking call UUID:', uuid);
                CallKeepService.currentCallId = uuid;

                // Complete the background task
                VoipPushNotification.onVoipNotificationCompleted(uuid);
            } catch (err) {
                console.error('VoipPushService: Error processing notification:', err);
            }
        });

        VoipPushNotification.addEventListener('didLoadWithEvents', (events) => {
            // This works for "quiet" notifications if you missed them
            if (!events || !Array.isArray(events) || events.length < 1) {
                return;
            }
            for (const event of events) {
                if (event.name === 'rn-voip-push-notification' && event.data) {
                    // Handle background notification if app was killed
                    // logic similar to 'notification' listener
                }
            }
        });

        // Request permissions (if necessary, though VoIP doesn't usually need explicit user permission prompt like standard push)
        // VoipPushNotification.requestPermissions(); 
    }
}

export default new VoipPushService();
