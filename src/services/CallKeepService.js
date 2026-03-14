// import RNCallKeep from 'react-native-callkeep';
import { Platform } from 'react-native';

let RNCallKeep;

if (Platform.OS === 'android') {
    // Android uses custom UI provided by CallContext/CallOverlay
    // so we stub CallKeep to prevent "native module not available" errors
    RNCallKeep = {
        addEventListener: () => { },
        removeEventListener: () => { },
        setup: () => Promise.resolve(),
        displayIncomingCall: () => { },
        endCall: () => { },
        answerIncomingCall: () => { },
        setCurrentCallActive: () => { },
        startCall: () => { },
        rejectCall: () => { },
        reportEndCallWithUUID: () => { },
        setAvailable: () => { }
    };
} else {
    try {
        RNCallKeep = require('react-native-callkeep').default;
    } catch (err) {
        console.error('CallKeepService: Native module react-native-callkeep not available', err);
        RNCallKeep = {
            addEventListener: () => { },
            removeEventListener: () => { },
            setup: () => Promise.resolve(),
            displayIncomingCall: () => { },
            endCall: () => { },
            answerIncomingCall: () => { },
            setCurrentCallActive: () => { },
            startCall: () => { },
            rejectCall: () => { },
            reportEndCallWithUUID: () => { },
            setAvailable: () => { }
        };
    }
}

class CallKeepService {
    constructor() {
        this.currentCallId = null;
        this.setupDone = false;
        // Tracks if the user answered via CallKit before JS was ready
        this.wasAnsweredBeforeJS = false;

        // Register early so we capture answer events even on cold start
        // (before React useEffect hooks have a chance to register)
        if (Platform.OS === 'ios') {
            RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
                console.log('CallKeepService: Early answerCall captured', callUUID);
                this.wasAnsweredBeforeJS = true;
                // If a late listener was attached by CallContext, forward to it
                if (this._onAnswerCall) {
                    this._onAnswerCall({ callUUID });
                }
            });
            RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
                console.log('CallKeepService: Early endCall captured', callUUID);
                if (this._onEndCall) {
                    this._onEndCall({ callUUID });
                }
            });
        }
    }

    setup() {
        if (Platform.OS === 'android') {
            return Promise.resolve();
        }

        if (this.setupDone) return Promise.resolve();


        const options = {
            ios: {
                appName: 'Unomi',
                supportsVideo: true,
                maximumCallGroups: '1',
                maximumCallsPerCallGroup: '1',
            },
            android: {
                // These settings are ignored now since we skip setup on Android
                alertTitle: 'Permissions Required',
                alertDescription: 'This application needs to access your phone accounts',
                cancelButton: 'Cancel',
                okButton: 'ok',
                imageName: 'sim_icon',
                additionalPermissions: [],
                foregroundService: {
                    channelId: 'com.example.unomi.call',
                    channelName: 'Foreground service for my app',
                    notificationTitle: 'My app is running on background',
                    notificationIcon: 'Path to the resource icon of the notification',
                },
            },
        };

        return new Promise((resolve, reject) => {
            try {
                RNCallKeep.setup(options).then(accepted => {
                    console.log('CallKeepService: Setup accepted:', accepted);
                    this.setupDone = true;
                    RNCallKeep.setAvailable(true);
                    resolve(accepted);
                }).catch(err => {
                    console.error('CallKeepService: Setup promise failed:', err);
                    resolve(false); // Resolve anyway to avoid blocking?
                });
            } catch (err) {
                console.error('CallKeepService: Setup failed:', err);
                resolve(false);
            }
        });
    }

    displayIncomingCall = async (uuid, handle, localizedCallerName = 'Unomi User') => {
        if (!this.setupDone) {
            console.log('CallKeepService: Setup not done, awaiting setup...');
            await this.setup();
        }

        if (this.currentCallId === uuid) {
            console.log('CallKeepService: Call already displayed for UUID:', uuid);
            return;
        }

        console.log('CallKeepService: Displaying incoming call', uuid, handle);
        this.currentCallId = uuid;
        RNCallKeep.displayIncomingCall(uuid, handle, localizedCallerName, 'generic', true);
    };

    endCall = (uuid) => {
        console.log('CallKeepService: Ending call', uuid);
        RNCallKeep.endCall(uuid);
        this.currentCallId = null;
    };

    reportEndCallWithUUID = (uuid, reason) => {
        console.log('CallKeepService: Reporting end call with UUID', uuid, reason);
        RNCallKeep.reportEndCallWithUUID(uuid, reason);
        this.currentCallId = null;
    }

    answerIncomingCall = (uuid) => {
        console.log('CallKeepService: Answering incoming call from app', uuid);
        RNCallKeep.answerIncomingCall(uuid);
    };

    setCurrentCallActive = (uuid) => {
        console.log('CallKeepService: Setting call active', uuid);
        RNCallKeep.setCurrentCallActive(uuid);
    };

    startCall = (uuid, handle, contactIdentifier) => {
        console.log('CallKeepService: Starting call', uuid, handle);
        this.currentCallId = uuid;
        RNCallKeep.startCall(uuid, handle, contactIdentifier);
    };

    rejectCall = (uuid) => {
        console.log('CallKeepService: Rejecting call', uuid);
        RNCallKeep.rejectCall(uuid);
        this.currentCallId = null;
    }

    // Hook up event listeners — on iOS the early constructor listeners
    // forward to these callbacks so late-registered handlers still fire
    addEventListener = (event, handler) => {
        if (Platform.OS === 'ios') {
            if (event === 'answerCall') {
                this._onAnswerCall = handler;
            } else if (event === 'endCall') {
                this._onEndCall = handler;
            } else {
                RNCallKeep.addEventListener(event, handler);
            }
        } else {
            RNCallKeep.addEventListener(event, handler);
        }
    };

    removeEventListener = (event) => {
        if (Platform.OS === 'ios') {
            if (event === 'answerCall') {
                this._onAnswerCall = null;
            } else if (event === 'endCall') {
                this._onEndCall = null;
            } else {
                RNCallKeep.removeEventListener(event);
            }
        } else {
            RNCallKeep.removeEventListener(event);
        }
    };
}

let callKeepServiceInstance;
try {
    callKeepServiceInstance = new CallKeepService();
} catch (error) {
    console.error('CallKeepService: Failed to instantiate CallKeepService', error);
    // Return a dummy object or null? context depends on it.
    // If we return null, CallContext will crash accessing .addEventListener
    // Better to return a dummy if it fails.
    callKeepServiceInstance = {
        setup: () => Promise.resolve(),
        displayIncomingCall: () => { },
        endCall: () => { },
        answerIncomingCall: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        setCurrentCallActive: () => { },
        startCall: () => { },
        rejectCall: () => { },
        reportEndCallWithUUID: () => { },
    };
}

export default callKeepServiceInstance;
