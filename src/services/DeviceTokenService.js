import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import api from '../lib/api';

class DeviceTokenService {
    constructor() {
        this.token = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // On Android 13+ (API 33), POST_NOTIFICATIONS must be requested via
            // PermissionsAndroid. messaging().requestPermission() only handles iOS.
            if (Platform.OS === 'android' && Platform.Version >= 33) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    console.log('Android POST_NOTIFICATIONS permission denied');
                }
            }

            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (enabled) {
                console.log('Authorization status:', authStatus);

                // Get the token
                await this.getToken();

                // Listen for token refresh
                messaging().onTokenRefresh(token => {
                    this.onTokenRefresh(token);
                });

                this.isInitialized = true;
            }
        } catch (error) {
            console.log('Failed to request permission or get token:', error);
        }
    }

    async getToken() {
        try {
            if (!messaging().isDeviceRegisteredForRemoteMessages) {
                await messaging().registerDeviceForRemoteMessages();
            }

            const token = await messaging().getToken();

            if (token && token !== this.token) {
                this.token = token;
                console.log('FCM Token:', token);
                await this.sendTokenToBackend(token);
            }

            return token;
        } catch (error) {
            console.log('Failed to get FCM token:', error);
            return null;
        }
    }

    async onTokenRefresh(token) {
        console.log('FCM Token Refreshed:', token);
        this.token = token;
        await this.sendTokenToBackend(token);
    }

    // Always sends the current FCM token to the backend — call this after login
    // so the token is registered even when initialize() already ran.
    async syncToken() {
        try {
            if (!messaging().isDeviceRegisteredForRemoteMessages) {
                await messaging().registerDeviceForRemoteMessages();
            }
            const token = await messaging().getToken();
            if (token) {
                this.token = token;
                await this.sendTokenToBackend(token);
            }
        } catch (error) {
            console.log('Failed to sync FCM token:', error);
        }
    }

    async sendTokenToBackend(token) {
        try {
            const platform = Platform.OS;
            await api.post('/device-tokens', {
                token,
                platform,
                device_id: null // Optional: Access unique device ID if needed
            });
            console.log('Device token sent to backend successfully');
        } catch (error) {
            console.log('Failed to send device token to backend:', error);
        }
    }

    async removeToken() {
        try {
            if (this.token) {
                await api.delete(`/device-tokens/${this.token}`);
                console.log('Device token removed from backend successfully');
            }
            await messaging().deleteToken();
            this.token = null;
            this.isInitialized = false;
            console.log('FCM token deleted');
        } catch (error) {
            console.log('Failed to remove device token:', error);
        }
    }

    // Handle foreground messages
    onMessage(callback) {
        return messaging().onMessage(callback);
    }
}

export default new DeviceTokenService();
