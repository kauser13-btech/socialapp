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
  TouchableWithoutFeedback,
  Modal,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Input, Loading, Avatar } from '../../components/ui';
import { messagesAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useCall } from '../../contexts/CallContext';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '👎'];

export default function ChatScreen({ route, navigation }) {
  const headerHeight = useHeaderHeight();
  const { userId, user: chatUser, prefilledMessage } = route.params;
  const { user: currentUser } = useAuth();
  const { socket, isConnected, sendMessage: socketSendMessage, markAsRead, playNotificationSound } = useSocket();
  const { initiateCall, callState } = useCall();
  const { colors, isDark } = useTheme();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState(prefilledMessage || '');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [reactionPicker, setReactionPicker] = useState(null);
  const [sendingImage, setSendingImage] = useState(false);
  const [imageUrls, setImageUrls] = useState({});

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
    markAsRead(userId);
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
        markAsRead(userId);
      }
    };
    const handleTypingStart = ({ userId: typingUserId }) => { if (typingUserId === userId) setIsTyping(true); };
    const handleTypingStop = ({ userId: typingUserId }) => { if (typingUserId === userId) setIsTyping(false); };

    // When the other person reads our messages, mark them as read in local state
    const handleMessageRead = ({ readBy }) => {
      if (readBy === userId) {
        setMessages(prev =>
          prev.map(m => m.sender_id === currentUser?.id && !m.is_read ? { ...m, is_read: true } : m)
        );
      }
    };

    socket.on('message:receive', handleReceiveMessage);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('message:read', handleMessageRead);

    return () => {
      socket.off('message:receive', handleReceiveMessage);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('message:read', handleMessageRead);
    };
  }, [socket, userId, playNotificationSound, markAsRead, currentUser?.id]);

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


  const uploadImage = async (asset) => {
    setSendingImage(true);
    try {
      const response = await messagesAPI.sendImageMessage(userId, asset.uri, asset.type || 'image/jpeg');
      if (response.success) {
        const sentMessage = response.data.message;
        setMessages(prev => [...prev, sentMessage]);
        if (socket && isConnected) socketSendMessage(userId, sentMessage);
      }
    } catch (error) {
      console.error('sendImage error:', JSON.stringify(error));
      const msg = error?.message || (error?.errors ? Object.values(error.errors).flat().join('\n') : 'Failed to send image');
      Alert.alert('Error', typeof msg === 'string' ? msg : 'Failed to send image');
    } finally {
      setSendingImage(false);
    }
  };

  const handleSendImage = () => {
    Alert.alert('Send Image', null, [
      {
        text: 'Camera',
        onPress: async () => {
          const result = await launchCamera({ mediaType: 'photo', quality: 0.8, saveToPhotos: false });
          if (!result.didCancel && result.assets?.[0]) uploadImage(result.assets[0]);
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
          if (!result.didCancel && result.assets?.[0]) uploadImage(result.assets[0]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const resolveImageUrl = async (messageId) => {
    if (imageUrls[messageId]) return;
    const url = await messagesAPI.getImageUrl(messageId);
    setImageUrls(prev => ({ ...prev, [messageId]: url }));
  };

  const handleReact = async (messageId, emoji) => {
    setReactionPicker(null);
    const msg = messages.find(m => m.id === messageId);
    const myReaction = msg?.reactions?.find(r => r.user_id === currentUser?.id);
    try {
      let updatedReactions;
      if (myReaction?.emoji === emoji) {
        const res = await messagesAPI.unreactToMessage(messageId);
        updatedReactions = res.reactions;
      } else {
        const res = await messagesAPI.reactToMessage(messageId, emoji);
        updatedReactions = res.reactions;
      }
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, reactions: updatedReactions } : m
      ));
    } catch (err) {
      console.error('reaction error:', err);
    }
  };

  const renderReactions = (item, isMe) => {
    if (!item.reactions?.length) return null;
    // Group by emoji
    const groups = {};
    item.reactions.forEach(r => {
      groups[r.emoji] = (groups[r.emoji] || 0) + 1;
    });
    const myEmoji = item.reactions.find(r => r.user_id === currentUser?.id)?.emoji;
    return (
      <View style={[styles.reactionsRow, isMe ? styles.reactionsRowMe : styles.reactionsRowThem]}>
        {Object.entries(groups).map(([emoji, count]) => (
          <TouchableOpacity
            key={emoji}
            style={[
              styles.reactionBadge,
              { backgroundColor: isDark ? colors.cardBackground : '#f3f4f6' },
              myEmoji === emoji && { backgroundColor: colors.primary + '22', borderColor: colors.primary, borderWidth: 1 },
            ]}
            onPress={() => handleReact(item.id, emoji)}
            activeOpacity={0.7}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            {count > 1 && <Text style={[styles.reactionCount, { color: colors.textSecondary }]}>{count}</Text>}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderSharedPreference = (pref, isMe) => {
    const accentColor = isMe ? 'rgba(255,255,255,0.25)' : `${colors.primary}20`;
    const titleColor  = isMe ? '#fff' : colors.textPrimary;
    const subColor    = isMe ? 'rgba(255,255,255,0.75)' : colors.textSecondary;
    const cardBg = isMe ? colors.primary : (isDark ? colors.cardBackground : '#f3f4f6');
    return (
      <TouchableOpacity
        style={[chatShareStyles.card, { backgroundColor: cardBg }]}
        onPress={() => navigation.navigate('PreferenceDetail', { id: pref.id })}
        activeOpacity={0.85}
      >
        <View style={[chatShareStyles.header, { borderBottomColor: accentColor }]}>
          <Icon name="bookmark" size={13} color={isMe ? '#fff' : colors.primary} />
          <Text style={[chatShareStyles.shared, { color: isMe ? 'rgba(255,255,255,0.8)' : colors.primary }]}>
            Shared a preference
          </Text>
        </View>
        <Text style={[chatShareStyles.title, { color: titleColor }]} numberOfLines={2}>{pref.title}</Text>
        {pref.category?.name && (
          <Text style={[chatShareStyles.category, { color: subColor }]}>
            {pref.category.name}
          </Text>
        )}
        {pref.location && (
          <View style={chatShareStyles.locationRow}>
            <Icon name="location-outline" size={11} color={subColor} />
            <Text style={[chatShareStyles.locationText, { color: subColor }]} numberOfLines={1}>
              {pref.location}
            </Text>
          </View>
        )}
        <Text style={[chatShareStyles.tap, { color: subColor }]}>Tap to view →</Text>
      </TouchableOpacity>
    );
  };

  const bubbleStyle = (isMe, extra = []) => [
    styles.messageBubble,
    isMe ? [styles.myMessage, { backgroundColor: colors.primary }] : [styles.theirMessage, { backgroundColor: isDark ? colors.cardBackground : '#f3f4f6' }],
    ...extra,
  ];

  const renderTextBubble = (content, isMe, extraStyle = []) => (
    <View style={bubbleStyle(isMe, extraStyle)}>
      <Text style={[styles.messageContent, { color: isMe ? '#ffffff' : colors.textPrimary }]}>
        {content}
      </Text>
    </View>
  );

  const renderImageBubble = (item, isMe) => {
    const url = imageUrls[item.id];
    if (!url) {
      resolveImageUrl(item.id);
    }
    return (
      <View style={[imgStyles.wrapper, isMe ? imgStyles.wrapperMe : imgStyles.wrapperThem]}>
        {url ? (
          <Image source={{ uri: url }} style={imgStyles.image} resizeMode="cover" />
        ) : (
          <View style={[imgStyles.placeholder, { backgroundColor: isDark ? colors.cardBackground : '#e5e7eb' }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </View>
    );
  };

  const renderMessageBubble = (item, isMe, isLastInGroup) => {
    if (item.message_type === 'image' && item.image_path) {
      return renderImageBubble(item, isMe);
    }

    if (item.shared_preference) {
      return (
        <View>
          {renderSharedPreference(item.shared_preference, isMe)}
          {item.content ? renderTextBubble(item.content, isMe, [{ marginTop: 4 }]) : null}
        </View>
      );
    }

    return renderTextBubble(
      item.content,
      isMe,
      [isLastInGroup && (isMe ? styles.myMessageLast : styles.theirMessageLast)],
    );
  };

  // The last message sent by me (used to show a single "Seen" indicator)
  const lastMyMessageId = [...messages].reverse().find(m => m.sender_id === currentUser?.id)?.id;

  const renderReadReceipt = (item, isMe) => {
    if (!isMe || item.id !== lastMyMessageId) return null;
    return (
      <View style={styles.readReceiptRow}>
        {item.is_read ? (
          <>
            <Icon name="checkmark-done" size={13} color={colors.primary} />
            <Text style={[styles.readReceiptText, { color: colors.primary }]}>Seen</Text>
          </>
        ) : (
          <Icon name="checkmark" size={13} color={colors.textTertiary} />
        )}
      </View>
    );
  };

  const renderMessage = ({ item, index }) => {
    const isMe = item.sender_id === currentUser?.id;
    const nextMessage = messages[index - 1]; // list is inverted
    const isLastInGroup = !nextMessage || nextMessage.sender_id !== item.sender_id;

    return (
      <TouchableOpacity
        activeOpacity={1}
        onLongPress={() => setReactionPicker({ messageId: item.id, isMe })}
        delayLongPress={350}
      >
        <View style={[
          styles.messageOuter,
          isMe ? styles.messageOuterMe : styles.messageOuterThem,
          isLastInGroup && styles.messageOuterLast,
        ]}>
          {renderMessageBubble(item, isMe, isLastInGroup)}
          {renderReactions(item, isMe)}
          {isLastInGroup && (
            <Text style={[
              styles.messageTime,
              isMe ? styles.messageTimeMe : styles.messageTimeThem,
              { color: colors.textTertiary },
            ]}>
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </Text>
          )}
          {renderReadReceipt(item, isMe)}
        </View>
      </TouchableOpacity>
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

        {/* Reaction picker modal */}
        <Modal
          visible={!!reactionPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setReactionPicker(null)}
        >
          <TouchableWithoutFeedback onPress={() => setReactionPicker(null)}>
            <View style={styles.reactionModalOverlay}>
              <View style={[styles.reactionPickerContainer, { backgroundColor: isDark ? colors.cardBackground : '#fff' }]}>
                {REACTION_EMOJIS.map(emoji => {
                  const msg = messages.find(m => m.id === reactionPicker?.messageId);
                  const myEmoji = msg?.reactions?.find(r => r.user_id === currentUser?.id)?.emoji;
                  return (
                    <TouchableOpacity
                      key={emoji}
                      style={[styles.reactionPickerBtn, myEmoji === emoji && { backgroundColor: colors.primary + '22', borderRadius: 20 }]}
                      onPress={() => handleReact(reactionPicker.messageId, emoji)}
                    >
                      <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
          <View style={[
            styles.inputWrapper,
            { backgroundColor: isDark ? colors.cardBackground : '#f9fafb', borderColor: isDark ? colors.border : '#e5e7eb' }
          ]}>
            <TouchableOpacity
              style={styles.imageButton}
              onPress={handleSendImage}
              disabled={sendingImage || sending}
              activeOpacity={0.7}
            >
              {sendingImage ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon name="image-outline" size={22} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
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
              style={[styles.sendButton, { backgroundColor: !sending && newMessage.trim() ? colors.primary : 'transparent' }]}
              onPress={handleSendMessage}
              disabled={sending || !newMessage.trim()}
              activeOpacity={0.8}
            >
              {sending ? (
                <View style={[styles.sendingDot, { backgroundColor: isDark ? colors.textPrimary : '#fff' }]} />
              ) : (
                <Icon name="arrow-up" size={18} color={newMessage.trim() ? '#ffffff' : colors.textTertiary} />
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
  readReceiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 2,
    marginTop: 2,
    marginRight: 2,
  },
  readReceiptText: {
    fontSize: 11,
    fontWeight: '500',
  },

  /* Reactions */
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  reactionsRowMe: {
    justifyContent: 'flex-end',
  },
  reactionsRowThem: {
    justifyContent: 'flex-start',
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  reactionModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  reactionPickerContainer: {
    flexDirection: 'row',
    borderRadius: 32,
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  reactionPickerBtn: {
    padding: 8,
  },
  reactionPickerEmoji: {
    fontSize: 28,
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
  imageButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
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

const chatShareStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 12,
    maxWidth: 260,
    minWidth: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shared: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 11,
    flex: 1,
  },
  tap: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});

const imgStyles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    maxWidth: 220,
  },
  wrapperMe: {
    alignSelf: 'flex-end',
  },
  wrapperThem: {
    alignSelf: 'flex-start',
  },
  image: {
    width: 220,
    height: 220,
  },
  placeholder: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
});
