import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform, PermissionsAndroid } from 'react-native';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { preferencesAPI } from '../../lib/api';
import { colors, spacing, fontSize, borderRadius } from '../../constants/styles';

// Safely import Voice module
let Voice = null;
try {
  Voice = require('@react-native-voice/voice').default;
} catch (error) {
  console.warn('Voice module not available:', error);
}

const VoiceInput = ({ onProcessed }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    // Check if Voice is available
    const checkVoiceAvailability = async () => {
      if (!Voice) {
        setIsAvailable(false);
        return;
      }

      try {
        const available = await Voice.isAvailable();
        setIsAvailable(available);

        if (available) {
          Voice.onSpeechStart = onSpeechStart;
          Voice.onSpeechEnd = onSpeechEnd;
          Voice.onSpeechResults = onSpeechResults;
          Voice.onSpeechError = onSpeechError;
        }
      } catch (e) {
        console.log('Voice not available:', e);
        setIsAvailable(false);
      }
    };

    checkVoiceAvailability();

    return () => {
      if (Voice && isAvailable) {
        Voice.destroy().then(Voice.removeAllListeners).catch(console.error);
      }
    };
  }, []);

  const onSpeechStart = () => {
    setError('');
  };

  const onSpeechEnd = () => {
    setIsListening(false);
  };

  const onSpeechResults = (e) => {
    if (e.value && e.value.length > 0) {
      setTranscript(e.value[0]);
    }
  };

  const onSpeechError = (e) => {
    console.error('Speech error:', e);
    setError(e.error?.message || 'Speech recognition error');
    setIsListening(false);
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone to record audio for voice input.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Permission error:', err);
        return false;
      }
    }
    // iOS permissions are handled automatically via Info.plist
    return true;
  };

  const startListening = async () => {
    if (!Voice) {
      setError('Voice recognition is not available');
      return;
    }

    // Request permissions first
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      setError('Microphone permission is required for voice input');
      Alert.alert(
        'Permission Required',
        'Please grant microphone permission in your device settings to use voice input.'
      );
      return;
    }

    try {
      setTranscript('');
      setError('');
      setIsListening(true);
      await Voice.start('en-US');
    } catch (e) {
      console.error('Error starting voice:', e);
      setError('Failed to start voice recognition');
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    if (!Voice) return;

    try {
      await Voice.stop();
      setIsListening(false);
    } catch (e) {
      console.error('Error stopping voice:', e);
      setIsListening(false);
    }
  };

  const processTranscript = async () => {
    if (!transcript.trim()) return;

    setIsProcessing(true);
    try {
      const response = await preferencesAPI.parseVoice(transcript);

      if (response.success && onProcessed) {
        onProcessed(response.data);
        setTranscript('');
        Alert.alert('Success', 'Voice input processed successfully!');
      } else {
        Alert.alert('Error', response.message || 'Failed to process voice input');
      }
    } catch (error) {
      console.error('Error processing voice input:', error);
      Alert.alert('Error', error.message || 'Failed to process voice input');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAvailable) {
    return (
      <View style={styles.container}>
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>
            Voice input is not available on this device. Please use a physical device to enable voice recognition.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        {!isListening ? (
          <Button
            onPress={startListening}
            variant="primary"
            disabled={isProcessing}
          >
            🎤 Start Voice Input
          </Button>
        ) : (
          <Button
            onPress={stopListening}
            variant="danger"
          >
            ⏹ Stop Recording
          </Button>
        )}

        {transcript && !isListening && (
          <Button
            onPress={processTranscript}
            disabled={isProcessing}
            loading={isProcessing}
            style={styles.processButton}
          >
            {isProcessing ? 'Processing...' : '✨ Process with AI'}
          </Button>
        )}
      </View>

      {transcript && (
        <Card style={styles.transcriptCard}>
          <Text style={styles.transcriptLabel}>
            {isListening ? 'Listening...' : 'Transcript:'}
          </Text>
          <Text style={styles.transcriptText}>{transcript}</Text>
        </Card>
      )}

      {error && (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      )}

      {isListening && (
        <View style={styles.listeningIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.listeningText}>
            Recording... Speak naturally about your preference
          </Text>
        </View>
      )}

      {!isListening && !transcript && (
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>How to use voice input:</Text>
          <Text style={styles.infoItem}>
            • Click "Start Voice Input" and speak clearly
          </Text>
          <Text style={styles.infoItem}>
            • Describe your preference naturally (e.g., "I love Italian coffee from Lavazza")
          </Text>
          <Text style={styles.infoItem}>• Click "Stop Recording" when finished</Text>
          <Text style={styles.infoItem}>
            • Click "Process with AI" to auto-fill the form
          </Text>
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  processButton: {
    flex: 1,
  },
  transcriptCard: {
    backgroundColor: colors.gray50,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  transcriptLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: spacing.sm,
  },
  transcriptText: {
    fontSize: fontSize.md,
    color: colors.gray800,
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    padding: spacing.md,
    marginBottom: spacing.md,
    borderColor: colors.error,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  recordingDot: {
    width: 8,
    height: 8,
    backgroundColor: colors.error,
    borderRadius: 4,
  },
  listeningText: {
    fontSize: fontSize.sm,
    color: colors.gray600,
  },
  infoCard: {
    backgroundColor: '#dbeafe',
    padding: spacing.md,
    borderColor: '#3b82f6',
  },
  infoTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: spacing.sm,
  },
  infoItem: {
    fontSize: fontSize.sm,
    color: '#1e3a8a',
    marginBottom: spacing.xs,
  },
});

export default VoiceInput;
