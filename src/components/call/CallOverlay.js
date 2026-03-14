import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import Icon from 'react-native-vector-icons/Ionicons';
import { useCall } from '../../contexts/CallContext';
import { Avatar } from '../ui';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/styles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CallOverlay() {
  const {
    callState,
    callType,
    localStream,
    remoteStream,
    caller,
    receiver,
    isMuted,
    isVideoOff,
    callStartTime,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
  } = useCall();

  const isAudioCall = callType === 'audio';

  const [callDuration, setCallDuration] = useState(0);

  // Update call duration every second
  useEffect(() => {
    let interval;
    if (callState === 'connected' && callStartTime) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState, callStartTime]);

  // Format duration as mm:ss
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    console.log('CallOverlay: remoteStream changed:', remoteStream ? remoteStream.id : 'null');
    if (remoteStream) {
      console.log('CallOverlay: remoteStream tracks:', remoteStream.getTracks().map(t => `${t.kind}:${t.readyState}`));
    }
  }, [remoteStream]);

  // Get the other user info
  const otherUser = caller || receiver;

  // Status text when there's no remote video yet
  const getNoVideoStatusText = () => {
    if (callState === 'calling') return 'Calling...';
    if (callState === 'connecting') return 'Connecting...';
    if (isAudioCall) return 'Audio Call';
    return 'Video Off';
  };

  const getCallStatusText = () => {
    if (callState === 'calling') return 'Calling...';
    if (callState === 'connecting') return 'Connecting...';
    return formatDuration(callDuration);
  };

  // Don't render if idle
  if (callState === 'idle') {
    return null;
  }
  console.log('callState', callState);
  // Incoming call modal (only show accept/reject when still in 'incoming' state)
  if (callState === 'incoming') {
    return (
      <Modal
        visible={true}
        transparent
        animationType="slide"
        statusBarTranslucent
      >
        <View style={styles.incomingContainer}>
          <View style={styles.incomingContent}>
            <Text style={styles.incomingLabel}>
              {isAudioCall ? 'Incoming Audio Call' : 'Incoming Video Call'}
            </Text>

            <Avatar user={otherUser} size="xlarge" style={styles.callerAvatar} />

            <Text style={styles.callerName}>
              {otherUser?.first_name} {otherUser?.last_name}
            </Text>
            <Text style={styles.callerUsername}>@{otherUser?.username}</Text>

            <View style={styles.incomingActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={rejectCall}
              >
                <Icon name="call" size={32} color={colors.background} style={styles.rejectCallIcon} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={answerCall}
              >
                <Icon
                  name={isAudioCall ? 'mic' : 'videocam'}
                  size={32}
                  color={colors.background}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Calling or Connected states - full screen video call
  return (
    <Modal
      visible={true}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
    >
      <SafeAreaView style={styles.callContainer}>
        {/* Remote video (full screen) — hidden for audio calls */}
        {!isAudioCall && remoteStream ? (
          <RTCView
            key={remoteStream.toURL()}
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
            mirror={false}
            zOrder={0}
          />
        ) : (
          <View style={styles.noVideoContainer}>
            <Avatar user={otherUser} size="xlarge" />
            <Text style={styles.noVideoText}>
              {getNoVideoStatusText()}
            </Text>
          </View>
        )}

        {/* Local video (picture-in-picture) — hidden for audio calls */}
        {!isAudioCall && localStream && !isVideoOff && (
          <View style={styles.localVideoContainer}>
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              objectFit="cover"
              mirror={true}
              zOrder={1}
            />
          </View>
        )}

        {/* Call info overlay */}
        <View style={styles.callInfoOverlay}>
          <Text style={styles.callUserName}>
            {otherUser?.first_name} {otherUser?.last_name}
          </Text>
          <Text style={styles.callStatus}>
            {getCallStatusText()}
          </Text>
        </View>

        {/* Call controls */}
        <View style={styles.controlsContainer}>
          <View style={styles.controlsRow}>
            {/* Switch camera — video calls only */}
            {!isAudioCall && (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={switchCamera}
              >
                <Icon name="camera-reverse" size={24} color={colors.background} />
              </TouchableOpacity>
            )}

            {/* Toggle video — video calls only */}
            {!isAudioCall && (
              <TouchableOpacity
                style={[styles.controlButton, isVideoOff && styles.controlButtonActive]}
                onPress={toggleVideo}
              >
                <Icon
                  name={isVideoOff ? 'videocam-off' : 'videocam'}
                  size={24}
                  color={colors.background}
                />
              </TouchableOpacity>
            )}

            {/* Toggle mute */}
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={toggleMute}
            >
              <Icon
                name={isMuted ? 'mic-off' : 'mic'}
                size={24}
                color={colors.background}
              />
            </TouchableOpacity>

            {/* End call */}
            <TouchableOpacity
              style={[styles.controlButton, styles.endCallButton]}
              onPress={endCall}
            >
              <Icon name="call" size={24} color={colors.background} style={styles.endCallIcon} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Incoming call styles
  incomingContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  incomingContent: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  incomingLabel: {
    fontSize: fontSize.lg,
    color: colors.gray400,
    marginBottom: spacing.xl,
  },
  callerAvatar: {
    marginBottom: spacing.lg,
  },
  callerName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.background,
    marginBottom: spacing.xs,
  },
  callerUsername: {
    fontSize: fontSize.md,
    color: colors.gray400,
    marginBottom: spacing.xxl,
  },
  incomingActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },

  // Active call styles
  callContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideo: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray800,
  },
  noVideoText: {
    fontSize: fontSize.lg,
    color: colors.gray400,
    marginTop: spacing.lg,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 50,
    right: spacing.md,
    width: 120,
    height: 160,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.background,
  },
  localVideo: {
    flex: 1,
  },

  // Call info overlay
  callInfoOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  callUserName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.background,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  callStatus: {
    fontSize: fontSize.md,
    color: colors.gray300,
    marginTop: spacing.xs,
  },

  // Controls
  controlsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: colors.gray600,
  },
  endCallButton: {
    backgroundColor: colors.error,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  endCallIcon: {
    transform: [{ rotate: '135deg' }],
  },
  rejectCallIcon: {
    transform: [{ rotate: '135deg' }],
  },
});
