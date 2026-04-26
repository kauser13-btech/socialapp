import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Platform, Vibration, Alert, PermissionsAndroid, InteractionManager } from 'react-native';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from 'react-native-webrtc';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { v4 as uuidv4 } from 'uuid';

import Sound from 'react-native-sound';

// Enable playback in silence mode
try {
  if (Platform.OS === 'ios') {
    Sound.setCategory('Playback');
  }
} catch (error) {
  console.log('Failed to set Sound category', error);
}

import CallKeepService from '../services/CallKeepService';
import VoipPushService from '../services/VoipPushService';

import { SOCKET_URL, TURN_URL, TURN_USERNAME, TURN_CREDENTIAL } from '@env';

const CallContext = createContext(null);

// ICE server configuration for WebRTC
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: [
        TURN_URL || 'turn:turnserver.btechbd.xyz:3478',
        (TURN_URL || 'turn:turnserver.btechbd.xyz:3478') + '?transport=tcp',
      ],
      username: TURN_USERNAME || 'webrtcuser',
      credential: TURN_CREDENTIAL || 'strongpassword',
    },
  ],
  iceCandidatePoolSize: 10,
};

export function CallProvider({ children }) {
  const { user } = useAuth();
  const { socket } = useSocket();

  // Call State
  const [callState, setCallState] = useState('idle'); // idle, calling, incoming, connected
  const [callType, setCallType] = useState('video'); // 'video' | 'audio'
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [caller, setCaller] = useState(null);
  const [receiver, setReceiver] = useState(null);

  // Audio/Video controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);

  // Refs
  const receiverRef = useRef(null);
  const callerRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const pendingOfferRef = useRef(null);
  const ringtoneIntervalRef = useRef(null);
  const answerCallRef = useRef(null);
  const endCallRef = useRef(null);
  const isAnsweringRef = useRef(false);
  // Tracks if the user already answered via CallKeep before the socket offer arrived
  const answeredViaCallKeepRef = useRef(false);
  const connectionTimeoutRef = useRef(null);

  // Ref to track callType synchronously inside callbacks
  const callTypeRef = useRef('video');

  // Request permissions for camera and microphone
  const requestPermissions = async (isAudioOnly = false) => {
    if (Platform.OS === 'android') {
      try {
        const permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
        if (!isAudioOnly) {
          permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
        }
        const granted = await PermissionsAndroid.requestMultiple(permissions);

        const audioGranted = granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
        const cameraGranted = isAudioOnly
          ? true
          : granted[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;

        if (!audioGranted || !cameraGranted) {
          const msg = isAudioOnly
            ? 'Microphone permission is required for audio calls.'
            : 'Camera and microphone permissions are required for video calls.';
          Alert.alert('Permissions Required', msg);
          return false;
        }
        return true;
      } catch (err) {
        console.error('Permission request error:', err);
        return false;
      }
    }
    // iOS permissions are handled via Info.plist
    return true;
  };

  // Helper to create a valid RTCIceCandidate object
  const createIceCandidate = useCallback((data) => {
    try {
      if (!data) return null;

      // specific check for nested candidate object (often from simple-peer/socket.io)
      let candidate = data;
      if (candidate.candidate && typeof candidate.candidate === 'object') {
        candidate = candidate.candidate;
      }

      // Must have the candidate string
      if (!candidate.candidate || typeof candidate.candidate !== 'string') {
        return null;
      }

      // Return a clean RTCIceCandidateInit object
      return {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
        usernameFragment: candidate.usernameFragment,
      };
    } catch (e) {
      console.log('CallContext: Error creating ICE candidate:', e);
      return null;
    }
  }, []);

  // Flush any ICE candidates that were delayed (e.g. by InteractionManager)
  // and arrived after the initial drain loop completed
  const scheduleLateCandidateFlush = useCallback(() => {
    setTimeout(() => {
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        while (pendingCandidatesRef.current.length > 0) {
          const raw = pendingCandidatesRef.current.shift();
          const clean = createIceCandidate(raw);
          if (clean) {
            try {
              peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(clean));
            } catch (e) {
              console.log('CallContext: Error adding late ICE candidate:', e.message);
            }
          }
        }
      }
    }, 500);
  }, [createIceCandidate]);

  // Helper function to stop all tracks on a stream
  const stopStream = useCallback((streamToStop) => {
    if (streamToStop) {
      streamToStop.getTracks().forEach(track => {
        track.stop();
        console.log('CallContext: Stopped track:', track.kind);
      });
    }
  }, []);

  // Initialize Services
  useEffect(() => {
    const initServices = async () => {
      try {
        CallKeepService.setup();
        VoipPushService.initialize();
      } catch (err) {
        console.error('CallContext: Service initialization error:', err);
      }

      // On Android, if the app was cold-started by tapping the "Answer" action
      // button on the incoming-call notification, NotificationService stores the
      // caller data. Flag it here so handleIncomingCall auto-answers when the
      // socket offer arrives.
      if (Platform.OS === 'android') {
        try {
          const { default: NotificationService } = await import('../services/NotificationService');
          const answerData = NotificationService.getPendingAnswerData();
          if (answerData) {
            console.log('CallContext: Cold-start answer detected from notification', answerData);
            answeredViaCallKeepRef.current = true;
          }
        } catch (err) {
          console.log('CallContext: Could not read pending answer data', err);
        }
      }
    };
    initServices();

    // CallKeep Event Listeners — use refs to avoid stale closures
    // since this effect runs once (empty deps) but answerCall/endCall change over time
    const onAnswerCall = ({ callUUID }) => {
      console.log('CallContext: CallKeep answerCall', callUUID);
      // If the socket offer hasn't arrived yet (cold start), flag it so
      // handleIncomingCall will auto-answer when the offer comes in
      if (!pendingOfferRef.current) {
        console.log('CallContext: No offer yet, flagging answeredViaCallKeep');
        answeredViaCallKeepRef.current = true;
        return;
      }
      if (answerCallRef.current) {
        answerCallRef.current();
      }
    };

    const onEndCall = ({ callUUID }) => {
      console.log('CallContext: CallKeep endCall', callUUID);
      if (endCallRef.current) {
        endCallRef.current();
      }
    };

    CallKeepService.addEventListener('answerCall', onAnswerCall);
    CallKeepService.addEventListener('endCall', onEndCall);

    return () => {
      CallKeepService.removeEventListener('answerCall');
      CallKeepService.removeEventListener('endCall');
    };
  }, []); // Empty dependency array - run once

  // Play ringtone with sound and vibration
  const playRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) return;

    // Android raw resources must omit extension; iOS bundle needs it
    const soundFile = Platform.OS === 'android' ? 'ringtone' : 'ringtone.wav';
    console.log('Vibration', soundFile)
    try {
      const ringtone = new Sound(soundFile, Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.log('CallContext: Failed to load ringtone', error);
          ringtoneIntervalRef.current = null;
          return;
        }
        console.log('CallContext: Ringtone loaded, duration:', ringtone.getDuration());
        ringtone.setNumberOfLoops(-1);
        ringtone.play((success) => {
          if (!success) {
            console.log('CallContext: Ringtone playback failed');
          }
        });
      });

      ringtoneIntervalRef.current = ringtone;
    } catch (err) {
      console.log('CallContext: Sound error:', err.message);
    }

    // Vibrate
    try {
      Vibration.vibrate(Platform.OS === 'ios' ? 1000 : [0, 500, 500, 500]);
    } catch (err) {
      console.log('CallContext: Vibration error:', err.message);
    }
  }, []);

  // Stop ringtone
  const stopRingtone = useCallback(() => {
    if (ringtoneIntervalRef.current) {
      try {
        const sound = ringtoneIntervalRef.current;
        sound.stop(() => {
          sound.release();
        });
      } catch (err) {
        console.log('CallContext: Stop sound error:', err.message);
      }
      ringtoneIntervalRef.current = null;
    }

    try {
      Vibration.cancel();
    } catch (err) {
      console.log('CallContext: Vibration cancel error:', err.message);
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(async () => {
    console.log('CallContext: Creating peer connection');

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        // Use refs to always get the latest caller/receiver IDs (avoids stale closures)
        const otherId = receiverRef.current?.id || callerRef.current?.id;
        if (otherId) {
          socket.emit('call:ice-candidate', {
            targetUserId: otherId,
            candidate: event.candidate,
          });
        } else {
          console.log('CallContext: ICE candidate generated but no target user ID available');
        }
      }
    };

    pc.ontrack = (event) => {
      console.log('CallContext: Received remote track', event.track.kind, event.track.id);
      if (event.streams && event.streams[0]) {
        console.log('CallContext: Setting remote stream', event.streams[0].id);
        setRemoteStream(event.streams[0]);
      } else {
        console.log('CallContext: Track received but no stream found!');
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('CallContext: ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        console.log('CallContext: ICE connection failed/disconnected, ending call');
        if (endCallRef.current) {
          endCallRef.current();
        }
      }
    };

    pc.onsignalingstatechange = () => {
      console.log('CallContext: Signaling state changed:', pc.signalingState);
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [socket]); // Only depends on socket; uses refs for caller/receiver to avoid stale closures

  // Get local media stream
  const getLocalStream = useCallback(async (isAudioOnly = false) => {
    console.log('CallContext: Getting local media stream, audioOnly:', isAudioOnly);

    const hasPermissions = await requestPermissions(isAudioOnly);
    if (!hasPermissions) {
      throw new Error('Permissions not granted');
    }

    const constraints = isAudioOnly
      ? { audio: true, video: false }
      : {
          audio: true,
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        };

    const stream = await mediaDevices.getUserMedia(constraints);

    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      console.log('CallContext: Unmounting, cleaning up all resources');
      stopRingtone();
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      stopStream(localStreamRef.current);
      localStreamRef.current = null;
    };
  }, [stopRingtone, stopStream]);

  // Handle incoming socket events
  useEffect(() => {
    if (!socket) {
      console.log('CallContext: No socket available yet');
      return;
    }

    console.log('CallContext: Setting up call event listeners on socket', socket.id);

    const handleIncomingCall = ({ signal, callerInfo, callType: incomingCallType }) => {
      console.log('CallContext: Incoming call received from', callerInfo, 'type:', incomingCallType);

      // Use InteractionManager to ensure this runs on the UI thread (fixes Android JNI crash)
      InteractionManager.runAfterInteractions(() => {
        // Check if this is an offer or an ICE candidate (simple-peer with trickle sends both)
        if (signal.type === 'offer') {
          setCaller(callerInfo);
          callerRef.current = callerInfo;

          // Store incoming call type so UI and answer flow use it
          const resolvedType = incomingCallType || 'video';
          setCallType(resolvedType);
          callTypeRef.current = resolvedType;

          // Store the offer to use when answering - DO NOT create peer connection here
          // Creating RTCPeerConnection on Android from socket event can cause JNI crash
          pendingCandidatesRef.current = [];
          pendingOfferRef.current = signal;

          // If the user already answered via CallKeep (cold start scenario where
          // the native answer happened before the JS listener was registered,
          // or before the socket offer arrived), auto-answer
          const alreadyAnswered = answeredViaCallKeepRef.current || CallKeepService.wasAnsweredBeforeJS;
          if (alreadyAnswered) {
            console.log('CallContext: User already answered via CallKeep, auto-answering');
            answeredViaCallKeepRef.current = false;
            CallKeepService.wasAnsweredBeforeJS = false;
            setCallState('connecting');
            // Defer answerCall to next tick so state/refs are settled
            setTimeout(() => {
              if (answerCallRef.current) {
                answerCallRef.current();
              }
            }, 0);
            return;
          }

          setCallState('incoming');

          if (Platform.OS === 'ios') {
            // On iOS, if we got here via VoIP push, CallKit was already reported
            // by native AppDelegate. Only show CallKit if it wasn't already shown.
            if (!CallKeepService.currentCallId) {
              const callUUID = uuidv4();
              CallKeepService.displayIncomingCall(
                callUUID,
                callerInfo.username || 'Unomi User',
                callerInfo.username || 'Unomi User'
              );
            }
          } else {
            playRingtone();
          }
        } else if (signal.candidate) {
          // This is an ICE candidate from simple-peer trickle
          console.log('CallContext: Received trickled ICE candidate in call:incoming');
          const clean = createIceCandidate(signal.candidate);
          if (clean) {
            pendingCandidatesRef.current.push(clean);
          } else {
            console.log('CallContext: Invalid trickled ICE candidate ignored');
          }
        }
      });
    };

    const handleCallAccepted = ({ signal }) => {
      console.log('CallContext: Call accepted, signal type:', signal.type || 'candidate');

      // Use InteractionManager to ensure WebRTC calls run on UI thread (fixes Android JNI crash)
      InteractionManager.runAfterInteractions(async () => {
        try {
          // Check if this is an answer or an ICE candidate (simple-peer with trickle sends both)
          if (signal.type === 'answer') {
            stopRingtone();
            setCallState('connected');
            setCallStartTime(Date.now());

            if (peerConnectionRef.current) {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));

              // Drain pending ICE candidates safely
              while (pendingCandidatesRef.current.length > 0) {
                const raw = pendingCandidatesRef.current.shift();
                const clean = createIceCandidate(raw);
                if (clean) {
                  try {
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(clean));
                  } catch (err) {
                    console.log('CallContext: Error adding pending ICE candidate:', err.message);
                  }
                }
              }

              scheduleLateCandidateFlush();
            }
          } else if (signal.candidate) {
            // This is an ICE candidate from simple-peer trickle
            console.log('CallContext: Received trickled ICE candidate in call:accepted');
            const clean = createIceCandidate(signal.candidate);

            if (clean) {
              if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(clean));
              } else {
                pendingCandidatesRef.current.push(clean);
              }
            } else {
              console.log('CallContext: Invalid ICE candidate in call:accepted');
            }
          }
        } catch (err) {
          console.error('CallContext: Error in handleCallAccepted:', err);
        }
      });
    };

    // ...

    const handleCallRejected = () => {
      console.log('CallContext: Call rejected');
      InteractionManager.runAfterInteractions(() => {
        Alert.alert('Call Rejected', 'The user rejected your call.');
        stopRingtone();
        cleanupCall();
      });
    };

    const handleCallEnded = () => {
      console.log('CallContext: Call ended by other party');
      InteractionManager.runAfterInteractions(() => {
        stopRingtone();
        cleanupCall();
      });
    };

    const handleIceCandidate = ({ candidate }) => {
      console.log('CallContext: Received ICE candidate');

      // Use InteractionManager to ensure WebRTC calls run on UI thread (fixes Android JNI crash)
      InteractionManager.runAfterInteractions(async () => {
        try {
          // Handle different candidate formats
          const clean = createIceCandidate(candidate);

          if (clean) {
            if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(clean));
            } else {
              // Queue candidate if remote description not set yet
              pendingCandidatesRef.current.push(clean);
            }
          } else {
            console.log('CallContext: Invalid ICE candidate format in handleIceCandidate');
          }
        } catch (err) {
          console.log('CallContext: Error adding ICE candidate:', err.message);
        }
      });
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:ice-candidate', handleIceCandidate);

    return () => {
      console.log('CallContext: Cleaning up call event listeners');
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:ice-candidate', handleIceCandidate);
    };
  }, [socket, playRingtone, stopRingtone, createPeerConnection, createIceCandidate]);

  // Connection timeout helpers
  const clearConnectionTimeout = useCallback(() => {
    if (connectionTimeoutRef.current) {
      console.log('CallContext: Clearing connection timeout');
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  const startConnectionTimeout = useCallback(() => {
    clearConnectionTimeout();
    console.log('CallContext: Starting 15s connection timeout');
    connectionTimeoutRef.current = setTimeout(() => {
      console.log('CallContext: Connection timeout reached, ending call');
      Alert.alert('Connection Failed', 'Could not establish connection. Please try again.');
      if (endCallRef.current) {
        endCallRef.current();
      } else {
        cleanupCall();
      }
    }, 15000);
  }, [clearConnectionTimeout, cleanupCall]);

  // Cleanup helper
  const cleanupCall = useCallback(() => {
    console.log('CallContext: Cleaning up call');

    clearConnectionTimeout();

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    stopStream(localStreamRef.current);
    localStreamRef.current = null;

    setCallState('idle');
    setCallType('video');
    callTypeRef.current = 'video';
    setLocalStream(null);
    setRemoteStream(null);
    setReceiver(null);
    receiverRef.current = null; // Clear ref
    setCaller(null);
    callerRef.current = null;
    setIsMuted(false);
    setIsVideoOff(false);
    setCallStartTime(null);
    pendingCandidatesRef.current = [];
    pendingOfferRef.current = null;
    isAnsweringRef.current = false;
    answeredViaCallKeepRef.current = false;
    CallKeepService.wasAnsweredBeforeJS = false;
  }, [stopStream, clearConnectionTimeout]);

  // Helper to proceed with call after online check
  const proceedWithCall = useCallback(async (targetUser) => {
    console.log('CallContext: Proceeding with call to', targetUser.id);
    const isAudioOnly = callTypeRef.current === 'audio';
    try {
      // Create peer connection
      const pc = await createPeerConnection();

      // Add local tracks to peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      // Create and send offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: !isAudioOnly,
      });
      await pc.setLocalDescription(offer);

      console.log('CallContext: Sending call:start to', targetUser.id);
      socket.emit('call:start', {
        receiverId: targetUser.id,
        signal: offer,
        callType: callTypeRef.current,
        callerInfo: {
          id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: user.avatar_url,
        },
      });

      if (Platform.OS === 'ios') {
        // Report outgoing call to CallKit with a valid UUID
        const outgoingUUID = uuidv4();
        CallKeepService.startCall(outgoingUUID, targetUser.username, targetUser.username);
      }
      // On Android, don't play ringtone for the caller - the ringtone
      // should only ring on the receiver's device
    } catch (err) {
      console.error('Failed to proceed with call:', err);
      Alert.alert('Error', 'Could not start call: ' + (err.message || 'Unknown error'));
      cleanupCall();
    }
  }, [socket, user, createPeerConnection, cleanupCall]);

  // Handle call status and online events
  useEffect(() => {
    if (!socket) return;

    const handleCallStatus = ({ status, receiverId }) => {
      console.log(`CallContext: receiver ${receiverId} is ${status}`);
      const targetReceiver = receiverRef.current; // Use ref for immediate access

      if (targetReceiver && targetReceiver.id === receiverId) {
        if (status === 'online') {
          // Receiver is online, proceed immediately
          proceedWithCall(targetReceiver);
        } else if (status === 'offline') {
          // User is offline that means we sent notification
          // We will wait for user:online event
          console.log('CallContext: Receiver is offline, waiting for them to connect...');
          // Optional: Trigger a timeout to end call if they don't come online
        }
      } else {
        console.log('CallContext: calling status received but receiver mismatch or missing', targetReceiver, receiverId);
      }
    };

    const handleUserOnline = ({ userId }) => {
      console.log(`CallContext: User ${userId} came online`);
      const targetReceiver = receiverRef.current;

      // We don't have access to current callState in this closure if dependecy array doesn't include it. 
      // But adding callState/receiver to dependency array causes re-binding.
      // receiverRef handles the receiver access.
      // For callState, we can check if receiverRef is set? Or should we use a callStateRef?
      // Since cleanupCall clears receiverRef, if receiverRef is set, we are likely in a call or setting one up.

      if (targetReceiver && targetReceiver.id === userId) {
        // The user we are waiting for just came online!
        console.log('CallContext: Target user is now online! Starting call...');
        proceedWithCall(targetReceiver);
      }
    };

    socket.on('call:status', handleCallStatus);
    socket.on('user:online', handleUserOnline);

    return () => {
      socket.off('call:status', handleCallStatus);
      socket.off('user:online', handleUserOnline);
    };
  }, [socket, proceedWithCall]); // Removed callState/receiver dependencies

  // Initiate a call
  const initiateCall = async (targetUser, type = 'video') => {
    console.log('CallContext: Initiating', type, 'call to', targetUser);

    if (!socket) {
      console.error('CallContext: Cannot initiate call - no socket connection');
      Alert.alert('Error', 'Cannot start call: Not connected to server');
      return;
    }

    if (!targetUser?.id) {
      console.error('CallContext: Cannot initiate call - no target user ID');
      Alert.alert('Error', 'Cannot start call: Invalid user');
      return;
    }

    setCallType(type);
    callTypeRef.current = type;
    setReceiver(targetUser);
    receiverRef.current = targetUser; // Set ref
    setCallState('calling');

    try {
      // Get local stream immediately so user sees themselves
      await getLocalStream(type === 'audio');

      // Check if user is online
      console.log(`CallContext: Emitting call:check-online for receiver ${targetUser.id}`);
      socket.emit('call:check-online', {
        receiverId: targetUser.id,
        callerInfo: {
          id: user.id,
          username: user.username,
          first_name: user.first_name,
        }
      });

    } catch (err) {
      console.error('Failed to initiate call:', err);
      Alert.alert('Error', 'Could not start call: ' + (err.message || 'Unknown error'));
      cleanupCall();
    }
  };

  // Answer a call
  const answerCall = async () => {
    // Guard against being called twice (e.g. once from CallOverlay, then
    // again from the CallKeep answerCall event that fires in response)
    if (isAnsweringRef.current) {
      console.log('CallContext: answerCall already in progress, ignoring duplicate');
      return;
    }
    isAnsweringRef.current = true;

    console.log('CallContext: Answering call');
    stopRingtone();

    // Immediately move away from 'incoming' so CallOverlay doesn't show
    // the accept/reject UI while WebRTC setup is in progress
    setCallState('connecting');
    startConnectionTimeout();

    // If CallKit is showing the native incoming call screen, dismiss it
    if (Platform.OS === 'ios' && CallKeepService.currentCallId) {
      CallKeepService.answerIncomingCall(CallKeepService.currentCallId);
    }

    try {
      // Check if socket is connected
      if (!socket) {
        throw new Error('No socket connection available');
      }

      // Determine if this is an audio-only call.
      // callTypeRef is set from the incoming socket payload, but also
      // cross-check the SDP offer — if it contains no video m-line the caller
      // intended audio-only regardless of what the server forwarded.
      const offerSdp = pendingOfferRef.current?.sdp || '';
      const offerHasVideo = offerSdp.includes('m=video');
      const isAudioOnly = callTypeRef.current === 'audio' || !offerHasVideo;

      // Sync callTypeRef so the rest of the flow (UI, cleanupCall) is consistent
      if (isAudioOnly) {
        callTypeRef.current = 'audio';
        setCallType('audio');
      }

      // Get local stream first (this requests permissions on Android)
      const stream = await getLocalStream(isAudioOnly);

      // Create peer connection now (deferred from incoming call to avoid Android JNI crash)
      const pc = await createPeerConnection();

      // Set remote description from the stored offer
      if (!pendingOfferRef.current) {
        throw new Error('No pending offer');
      }
      await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));

      // Add local tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create and send answer
      const answer = await pc.createAnswer();
      console.log('CallContext: Created answer, setting local description');
      await pc.setLocalDescription(answer);

      console.log('CallContext: Sending call:accept');
      socket.emit('call:accept', {
        callerId: callerRef.current.id,
        signal: answer,
      });

      // Process any pending ICE candidates — drain the queue safely since
      // new candidates may arrive via the socket handler while we iterate
      console.log(`CallContext: Processing ${pendingCandidatesRef.current.length} pending ICE candidates`);
      while (pendingCandidatesRef.current.length > 0) {
        const raw = pendingCandidatesRef.current.shift();
        const clean = createIceCandidate(raw);
        if (clean) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(clean));
          } catch (err) {
            console.log('CallContext: Error adding pending ICE candidate:', err.message);
          }
        }
      }

      console.log('CallContext: Call setup complete, setting state to connected');
      // Set connected state after everything is set up
      setCallState('connected');
      setCallStartTime(Date.now());
      clearConnectionTimeout();

      // Report to CallKit that the call is now active
      if (Platform.OS === 'ios' && CallKeepService.currentCallId) {
        CallKeepService.setCurrentCallActive(CallKeepService.currentCallId);
      }

      // Flush any ICE candidates that arrived via InteractionManager delay
      // during the async setup above
      scheduleLateCandidateFlush();
    } catch (err) {
      console.error('Failed to answer call:', err);
      Alert.alert('Error', 'Could not answer call: ' + (err.message || 'Unknown error'));
      clearConnectionTimeout();
      rejectCall();
    }
  };

  // Reject a call
  const rejectCall = useCallback(() => {
    console.log('CallContext: Rejecting call');
    if (socket && caller?.id) {
      socket.emit('call:reject', { callerId: caller.id });
    }
    stopRingtone();
    cleanupCall();
  }, [socket, caller?.id, stopRingtone, cleanupCall]);

  // End a call
  const endCall = useCallback(() => {
    console.log('CallContext: Ending call');

    stopRingtone();

    // Notify other user
    if (socket) {
      const otherId = receiver?.id || caller?.id;
      if (otherId) {
        socket.emit('call:end', { otherUserId: otherId });
      }
    }

    cleanupCall();

    // Attempt to end CallKeep call if active
    if (Platform.OS === 'ios' && CallKeepService.currentCallId) {
      CallKeepService.endCall(CallKeepService.currentCallId);
    }

  }, [socket, receiver?.id, caller?.id, stopRingtone, cleanupCall]);

  // Keep refs in sync so CallKeep callbacks always call the latest version
  answerCallRef.current = answerCall;
  endCallRef.current = endCall;

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  // Switch camera (front/back)
  const switchCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack && videoTrack._switchCamera) {
        videoTrack._switchCamera();
      }
    }
  }, []);

  const value = {
    callState,
    callType,
    localStream,
    remoteStream,
    caller,
    receiver,
    isMuted,
    isVideoOff,
    callStartTime,
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within CallProvider');
  }
  return context;
}

export default CallContext;
