import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useHeaderHeight } from '@react-navigation/elements';
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Input, Loading } from '../../components/ui';
import { messagesAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useCall } from '../../contexts/CallContext';
import { colors, spacing, fontSize, borderRadius } from '../../constants/styles';
import { formatDistanceToNow } from 'date-fns';

export default function ChatScreen({ route, navigation }) {
  const headerHeight = useHeaderHeight();
  const { userId, user: chatUser } = route.params;
  const { user: currentUser } = useAuth();
  const { socket, isConnected, sendMessage: socketSendMessage, playNotificationSound } = useSocket();
  const { initiateCall, callState } = useCall();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);

  // Handle audio call button press
  const handleAudioCall = () => {
    if (!chatUser) {
      Alert.alert('Error', 'Cannot start call: User information not available');
      return;
    }

    Alert.alert(
      'Start Audio Call',
      `Call ${chatUser.first_name || chatUser.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => initiateCall(chatUser, 'audio'),
        },
      ]
    );
  };

  // Handle video call button press
  const handleVideoCall = () => {
    if (!chatUser) {
      Alert.alert('Error', 'Cannot start call: User information not available');
      return;
    }

    Alert.alert(
      'Start Video Call',
      `Call ${chatUser.first_name || chatUser.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => initiateCall(chatUser, 'video'),
        },
      ]
    );
  };

  // Set up header with audio + video call buttons
  useLayoutEffect(() => {
    const userName = chatUser?.first_name && chatUser?.last_name
      ? `${chatUser.first_name} ${chatUser.last_name}`
      : chatUser?.username || 'Chat';

    navigation.setOptions({
      title: userName,
      headerRight: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={handleAudioCall}
            style={styles.headerButton}
            disabled={callState !== 'idle'}
          >
            <Icon
              name="call"
              size={22}
              color={callState !== 'idle' ? colors.gray400 : colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleVideoCall}
            style={styles.headerButton}
            disabled={callState !== 'idle'}
          >
            <Icon
              name="videocam"
              size={24}
              color={callState !== 'idle' ? colors.gray400 : colors.primary}
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, chatUser, callState]);

  // Load messages on mount
  useEffect(() => {
    loadMessages();
    // Mark messages as read when entering chat
    messagesAPI.markAsRead(userId).catch(console.error);
  }, [userId]);

  // Socket event listeners for real-time messaging
  useEffect(() => {
    if (!socket) return;

    // Handle incoming messages
    const handleReceiveMessage = ({ message, senderId }) => {
      if (senderId === userId) {
        // Play notification sound
        playNotificationSound();

        // Add message to the list (avoid duplicates)
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });

        // Mark as read since we're viewing this conversation
        messagesAPI.markAsRead(userId).catch(console.error);
      }
    };

    // Handle typing indicators
    const handleTypingStart = ({ userId: typingUserId }) => {
      if (typingUserId === userId) {
        setIsTyping(true);
      }
    };

    const handleTypingStop = ({ userId: typingUserId }) => {
      if (typingUserId === userId) {
        setIsTyping(false);
      }
    };

    socket.on('message:receive', handleReceiveMessage);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('message:receive', handleReceiveMessage);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [socket, userId, playNotificationSound]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await messagesAPI.getMessages(userId);
      if (response.success) {
        setMessages(response.data.messages || response.data || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSendError('');
    setSending(true);

    try {
      const response = await messagesAPI.sendMessage({
        receiver_id: userId,
        content: messageContent
      });

      if (response.success) {
        const sentMessage = response.data.message || response.data;

        // Add message to the list
        setMessages(prev => [...prev, sentMessage]);

        // Emit via socket for real-time delivery to receiver
        if (socket && isConnected) {
          socketSendMessage(userId, sentMessage);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error.message || 'Failed to send message';
      setSendError(errorMessage);

      // Show alert for friend-only restriction
      if (errorMessage.includes('friends')) {
        Alert.alert('Cannot Send Message', errorMessage);
      }

      // Restore the message input so user can try again
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender_id === currentUser?.id;
    return (
      <View style={[styles.message, isMe ? styles.myMessage : styles.theirMessage]}>
        <Text style={[styles.messageContent, isMe && styles.myMessageText]}>
          {item.content}
        </Text>
        <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </Text>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;

    return (
      <View style={[styles.message, styles.theirMessage, styles.typingIndicator]}>
        <View style={styles.typingDots}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    );
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardView}
        keyboardVerticalOffset={headerHeight}
      >
        <FlatList
          ref={flatListRef}
          data={[...messages].reverse()}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.messagesList}
          inverted
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListHeaderComponent={renderTypingIndicator}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }
          }}
        />

        {/* Error message */}
        {sendError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{sendError}</Text>
          </View>
        ) : null}

        {/* Connection status indicator */}
        {!isConnected && (
          <View style={styles.offlineBar}>
            <Text style={styles.offlineText}>Connecting...</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Input
              placeholder="Message..."
              value={newMessage}
              onChangeText={setNewMessage}
              style={styles.input}
              multiline
              maxLength={5000}
              editable={!sending}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            activeOpacity={0.75}
          >
            {sending ? (
              <View style={styles.sendingDot} />
            ) : (
              <Icon
                name="send"
                size={18}
                color={newMessage.trim() ? '#ffffff' : colors.gray400}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  keyboardView: {
    flex: 1
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  headerButton: {
    padding: spacing.sm,
  },
  messagesList: {
    padding: spacing.md,
    flexGrow: 1,
  },
  message: {
    maxWidth: '75%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gray200,
    borderBottomLeftRadius: 4,
  },
  messageContent: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: fontSize.md * 1.4,
  },
  myMessageText: {
    color: colors.white,
  },
  messageTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'flex-end',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: colors.gray200,
  },
  sendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray400,
  },
  errorContainer: {
    backgroundColor: colors.error + '15',
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  offlineBar: {
    backgroundColor: colors.warning,
    padding: spacing.xs,
    alignItems: 'center',
  },
  offlineText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  typingIndicator: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.8,
  },
});
