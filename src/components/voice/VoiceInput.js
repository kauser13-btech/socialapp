import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, PermissionsAndroid, Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { preferencesAPI } from '../../lib/api';

let Voice = null;
try {
  Voice = require('@react-native-voice/voice').default;
} catch {
  // not available on this device
}

export default function VoiceInput({ onProcessed, colors }) {
  const [state, setState] = useState('idle'); // idle | listening | processing | done
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const transcriptRef = useRef('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  const isAvailable = Boolean(Voice);

  useEffect(() => {
    if (!Voice) return;
    Voice.onSpeechResults = (e) => {
      if (e.value?.length > 0) {
        transcriptRef.current = e.value[0];
        setTranscript(e.value[0]);
      }
    };
    Voice.onSpeechEnd = () => {
      setState(prev => {
        if (prev === 'listening') processTranscript(transcriptRef.current);
        return prev;
      });
    };
    Voice.onSpeechError = (e) => {
      setError(e.error?.message || 'Recognition error');
      setState('idle');
      stopPulse();
    };
    return () => { Voice?.destroy().then(() => Voice?.removeAllListeners()).catch(() => {}); };
  }, []);

  // ── Pulse animation while recording ──────────────────────────────────────
  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  };

  // ── Permission ────────────────────────────────────────────────────────────
  const requestPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  // ── Main tap handler ──────────────────────────────────────────────────────
  const handleTap = async () => {
    if (state === 'processing') return;

    if (state === 'listening') {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    setError('');
    setTranscript('');
    const ok = await requestPermission();
    if (!ok) { setError('Microphone permission required.'); return; }
    try {
      setState('listening');
      startPulse();
      await Voice.start('en-US');
    } catch {
      setState('idle');
      stopPulse();
      setError('Could not start recording.');
    }
  };

  const stopRecording = async () => {
    try { await Voice.stop(); } catch { /* ignore */ }
    stopPulse();
    processTranscript(transcriptRef.current);
  };

  const processTranscript = async (text) => {
    if (!text?.trim()) { setState('idle'); return; }
    setState('processing');
    try {
      const response = await preferencesAPI.parseVoice(text);
      if (response.success) {
        setState('done');
        onProcessed?.(response.data);
      } else {
        setError('Could not parse voice input.');
        setState('idle');
      }
    } catch {
      setError('Processing failed. Please try again.');
      setState('idle');
    }
  };

  // ── Button appearance per state ───────────────────────────────────────────
  const BTN = {
    idle:       { icon: 'mic',          bg: '#4f6ef7', label: 'Tap to speak'   },
    listening:  { icon: 'stop',         bg: '#ef4444', label: 'Tap to finish'  },
    processing: { icon: 'hourglass',    bg: '#f59e0b', label: 'Processing…'    },
    done:       { icon: 'checkmark',    bg: '#10b981', label: 'Done!'          },
  };
  const btn = BTN[state];
  const accentColor = colors?.primary || '#4f6ef7';

  if (!isAvailable) {
    return (
      <View style={styles.unavailable}>
        <Icon name="mic-off-outline" size={20} color="#94a3b8" />
        <Text style={styles.unavailableText}>Voice not available on this device</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Single big mic button */}
      <View style={styles.btnWrap}>
        <Animated.View style={[styles.pulse, { transform: [{ scale: pulseAnim }], backgroundColor: btn.bg + '22' }]} />
        <TouchableOpacity
          style={[styles.micBtn, { backgroundColor: btn.bg }]}
          onPress={handleTap}
          activeOpacity={0.85}
          disabled={state === 'processing'}
        >
          <Icon name={btn.icon} size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* State label */}
      <Text style={[styles.label, { color: colors?.textSecondary || '#64748b' }]}>{btn.label}</Text>

      {/* Live transcript */}
      {!!transcript && (
        <View style={[styles.transcriptBox, { borderColor: accentColor + '40', backgroundColor: accentColor + '0c' }]}>
          <Text style={[styles.transcriptText, { color: colors?.textPrimary || '#1e293b' }]}>
            "{transcript}"
          </Text>
        </View>
      )}
      {!transcript && state === 'listening' && (
        <Text style={[styles.hint, { color: colors?.textSecondary || '#64748b' }]}>
          Speak now… tap stop when done
        </Text>
      )}
      {!transcript && state === 'idle' && (
        <Text style={[styles.hint, { color: colors?.textSecondary || '#64748b' }]}>
          e.g. "Amazing ramen in Shibuya, solid 4 out of 5"
        </Text>
      )}

      {/* Error */}
      {error ? (
        <View style={styles.errorRow}>
          <Icon name="alert-circle-outline" size={14} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  btnWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  micBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  transcriptBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 8,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
  },
  unavailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  unavailableText: {
    fontSize: 13,
    color: '#94a3b8',
  },
});
