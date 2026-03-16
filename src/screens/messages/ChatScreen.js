import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useHeaderHeight } from '@react-navigation/elements';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  KeyboardAvoidingView, 
  Alert, 
  TouchableOpacity,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Input, Loading, Avatar } from '../../components/ui';
import { messagesAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useCall } from '../../contexts/CallContext';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';

export default function ChatScreen({ route, navigation }) {
  const headerHeight = useHeaderHeight();
  const { userId, user: chatUser } = route.params;
  const { user: currentUser } = useAuth();
  const { socket, isConnected, sendMessage: socketSendMessage, playNotificationSound } = useSocket();
  const { initiateCall, callState } = useCall();
  const { colors, isDark } = useTheme();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);

  const handleAudioCall = () => {
    if (chatUser) {
      Alert.alert('Start Audio Call', `Call ${chatUser.first_name || chatUser.username}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => initiateCall(chatUser, 'audio') },
      ]);
    } else {
      Alert.alert('Error', 'Cannot start call: User information not available');
    }
  };

  const handleVideoCall = () => {
    if (chatUser) {
      Alert.alert('Start Video Call', `Call ${chatUser.first_name || chatUser.username}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => initiateCall(chatUser, 'video') },
      ]);
    } else {
      Alert.alert('Error', 'Cannot start call: User information not available');
    }
  };

  useLayoutEffect(() => {
    const userName = chatUser?.first_name && chatUser?.last_name
      ? `${chatUser.first_name} ${chatUser.last_name}`
      : chatUser?.username || 'Chat';

    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <Avatar 
            user={{ avatar_url: chatUser?.avatar_url, name: userName }} 
            size="small" 
          />
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerName, { color: colors.textPrimary }]} numberOfLines={1}>
              {userName}
            </Text>
            {isTyping && (
              <Text style={[styles.headerStatus, { color: colors.primary }]}>typing...</Text>
            )}
          </View>
        </View>
      ),
      headerTitleAlign: 'left',
      headerRight: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={handleAudioCall} style={styles.headerButton} disabled={callState !== 'idle'}>
            <Icon name="call" size={20} color={callState !== 'idle' ? colors.gray400 : colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleVideoCall} style={styles.headerButton} disabled={callState !== 'idle'}>
            <Icon name="videocam" size={22} color={callState !== 'idle' ? colors.gray400 : colors.primary} />
          </TouchableOpacity>
        </View>
      ),
      headerShadowVisible: false,
      headerStyle: { backgroundColor: colors.background },
    });
  }, [navigation, chatUser, callState, colors, isTyping]);

  useEffect(() => {
    loadMessages();
    messagesAPI.markAsRead(userId).catch(console.error);
  }, [userId]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = ({ message, senderId }) => {
      if (senderId === userId) {
        playNotificationSound();
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        messagesAPI.markAsRead(userId).catch(console.error);
      }
    };
    const handleTypingStart = ({ userId: typingUserId }) => { if (typingUserId === userId) setIsTyping(true); };
    const handleTypingStop = ({ userId: typingUserId }) => { if (typingUserId === userId) setIsTyping(false); };

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
      if (response.success) setMessages(response.data.messages || response.data || []);
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
      const response = await messagesAPI.sendMessage({ receiver_id: userId, content: messageContent });
      if (response.success) {
        const sentMessage = response.data.message || response.data;
        setMessages(prev => [...prev, sentMessage]);
        if (socket && isConnected) socketSendMessage(userId, sentMessage);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to send message';
      setSendError(errorMessage);
      if (errorMessage.includes('friends')) Alert.alert('Cannot Send Message', errorMessage);
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item, index }) => {
    const isMe = item.sender_id === currentUser?.id;
    const nextMessage = messages[index - 1]; // Because list is inverted
    const isLastInGroup = !nextMessage || nextMessage.sender_id !== item.sender_id;

    return (
      <View style={[
        styles.messageOuter, 
        isMe ? styles.messageOuterMe : styles.messageOuterThem,
        isLastInGroup && styles.messageOuterLast
      ]}>
        <View style={[
          styles.messageBubble, 
          isMe ? [styles.myMessage, { backgroundColor: colors.primary }] : [styles.theirMessage, { backgroundColor: isDark ? colors.cardBackground : '#f3f4f6' }],
          isLastInGroup && (isMe ? styles.myMessageLast : styles.theirMessageLast)
        ]}>
          <Text style={[
            styles.messageContent, 
            { color: isMe ? '#ffffff' : colors.textPrimary }
          ]}>
            {item.content}
          </Text>
        </View>
        {isLastInGroup && (
          <Text style={[
            styles.messageTime, 
            isMe ? styles.messageTimeMe : styles.messageTimeThem,
            { color: colors.textTertiary }
          ]}>
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </Text>
        )}
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    return (
      <View style={[styles.messageOuter, styles.messageOuterThem, styles.messageOuterLast]}>
        <View style={[styles.messageBubble, styles.theirMessage, styles.theirMessageLast, styles.typingBubble, { backgroundColor: isDark ? colors.cardBackground : '#f3f4f6' }]}>
          <View style={styles.typingDots}>
            <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
            <View style={[styles.dot, styles.dot2, { backgroundColor: colors.textTertiary }]} />
            <View style={[styles.dot, styles.dot3, { backgroundColor: colors.textTertiary }]} />
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <Loading fullScreen />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
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
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (messages.length > 0) flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
        />

        {sendError ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '10' }]}>
            <Icon name="alert-circle" size={16} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{sendError}</Text>
          </View>
        ) : null}

        {!isConnected && (
          <View style={[styles.offlineBar, { backgroundColor: colors.warning }]}>
            <Text style={styles.offlineText}>Connecting...</Text>
          </View>
        )}

        <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
          <View style={[
            styles.inputWrapper, 
            { backgroundColor: isDark ? colors.cardBackground : '#f9fafb', borderColor: isDark ? colors.border : '#e5e7eb' }
          ]}>
            <Input
              placeholder="Start typing..."
              placeholderTextColor={colors.textTertiary}
              value={newMessage}
              onChangeText={setNewMessage}
              style={styles.input}
              inputStyle={[styles.inputText, { color: colors.textPrimary }]}
              multiline
              maxLength={5000}
              editable={!sending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton, 
                { backgroundColor: newMessage.trim() && !sending ? colors.primary : 'transparent' }
              ]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <View style={[styles.sendingDot, { backgroundColor: isDark ? colors.textPrimary : '#fff' }]} />
              ) : (
                <Icon 
                  name={newMessage.trim() ? "arrow-up" : "mic"} 
                  size={18} 
                  color={newMessage.trim() ? '#ffffff' : colors.textTertiary} 
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  keyboardView: { 
    flex: 1 
  },
  
  /* Header UI */
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Platform.OS === 'ios' ? 0 : -16,
  },
  headerTextWrap: {
    marginLeft: 10,
    justifyContent: 'center',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  headerStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerButtons: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginRight: 8,
  },
  headerButton: { 
    padding: 8,
    marginLeft: 4,
  },

  /* Chat List */
  messagesList: { 
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  
  /* Bubbles */
  messageOuter: {
    marginBottom: 4,
    maxWidth: '80%',
  },
  messageOuterMe: {
    alignSelf: 'flex-end',
  },
  messageOuterThem: {
    alignSelf: 'flex-start',
  },
  messageOuterLast: {
    marginBottom: 20,
  },
  messageBubble: { 
    paddingHorizontal: 16,
    paddingVertical: 10, 
    borderRadius: 20, 
  },
  myMessage: { 
    borderBottomRightRadius: 6,
  },
  theirMessage: { 
    borderBottomLeftRadius: 6,
  },
  myMessageLast: {
    borderBottomRightRadius: 20,
  },
  theirMessageLast: {
    borderBottomLeftRadius: 20,
  },
  messageContent: { 
    fontSize: 15, 
    lineHeight: 22,
  },
  messageTime: { 
    fontSize: 11,
    marginTop: 6,
    marginHorizontal: 4,
  },
  messageTimeMe: {
    alignSelf: 'flex-end',
  },
  messageTimeThem: {
    alignSelf: 'flex-start',
  },

  /* Typing */
  typingBubble: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  typingDots: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  dot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3,
    opacity: 0.4,
  },
  dot2: { 
    opacity: 0.6 
  },
  dot3: { 
    opacity: 0.8 
  },

  /* Input Area */
  inputContainer: { 
    paddingHorizontal: 16, 
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
  },
  inputWrapper: { 
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24, 
    borderWidth: 1, 
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: { 
    flex: 1, 
    marginBottom: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  inputText: { 
    maxHeight: 120, 
    paddingHorizontal: 0, 
    paddingVertical: 8, 
    backgroundColor: 'transparent', 
    minHeight: 0,
    fontSize: 15,
  },
  sendButton: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginLeft: 8,
    marginBottom: 2,
  },
  sendingDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4 
  },

  /* Status Bars */
  errorContainer: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12, 
    marginHorizontal: 16, 
    marginBottom: 12, 
    borderRadius: 12, 
  },
  errorText: { 
    fontSize: 13, 
    fontWeight: '500',
    flex: 1,
  },
  offlineBar: { 
    padding: 6, 
    alignItems: 'center',
  },
  offlineText: { 
    color: '#ffffff', 
    fontSize: 12, 
    fontWeight: '600' 
  },
});
