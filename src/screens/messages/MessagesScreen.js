import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Avatar, Loading } from '../../components/ui';
import { messagesAPI, friendsAPI } from '../../lib/api';
import { useSocket } from '../../contexts/SocketContext';
import { colors, spacing, fontSize, fontWeight } from '../../constants/styles';
import { formatDistanceToNow } from 'date-fns';

export default function MessagesScreen({ navigation }) {
  const { socket, onlineUsers, playNotificationSound } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load conversations when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadConversations();
      loadFriends();
    }, [])
  );

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Handle incoming messages - update conversation list
    const handleReceiveMessage = ({ message, senderId }) => {
      // Play notification sound
      playNotificationSound();

      // Update conversations list
      setConversations(prev => {
        const existingIndex = prev.findIndex(conv => conv.id === senderId);

        if (existingIndex >= 0) {
          // Update existing conversation
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            last_message: message,
            unread_count: (updated[existingIndex].unread_count || 0) + 1,
          };
          // Move to top
          const [conversation] = updated.splice(existingIndex, 1);
          return [conversation, ...updated];
        } else {
          // New conversation - reload to get user info
          loadConversations();
          return prev;
        }
      });
    };

    socket.on('message:receive', handleReceiveMessage);

    return () => {
      socket.off('message:receive', handleReceiveMessage);
    };
  }, [socket, playNotificationSound]);

  const loadConversations = async () => {
    try {
      const response = await messagesAPI.getConversations();
      if (response.success) {
        setConversations(response.data.conversations || response.data || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFriends = async () => {
    try {
      const response = await friendsAPI.list();
      if (response.success) {
        setFriends(response.data.friends || []);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleStartNewConversation = (friend) => {
    navigation.navigate('Chat', {
      userId: friend.id,
      user: friend,
    });
  };

  const renderConversation = ({ item }) => {
    const userName = item.first_name && item.last_name
      ? `${item.first_name} ${item.last_name}`
      : item.username || 'Unknown';

    return (
      <TouchableOpacity
        style={styles.conversation}
        onPress={() => navigation.navigate('Chat', {
          userId: item.id,
          user: item,
        })}
      >
        <Avatar
          user={{ avatar_url: item.avatar_url, name: userName }}
          size="medium"
          isOnline={onlineUsers.has(item.id)}
        />
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
            <Text style={styles.time}>
              {item.last_message?.created_at
                ? formatDistanceToNow(new Date(item.last_message.created_at), { addSuffix: true })
                : ''}
            </Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message?.content || 'Start a conversation'}
          </Text>
        </View>
        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unread_count > 99 ? '99+' : item.unread_count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFriendSuggestion = ({ item }) => {
    // Don't show friends who already have conversations
    const hasConversation = conversations.some(conv => conv.id === item.id);
    if (hasConversation) return null;

    const userName = item.first_name && item.last_name
      ? `${item.first_name} ${item.last_name}`
      : item.username;

    return (
      <TouchableOpacity
        style={styles.friendSuggestion}
        onPress={() => handleStartNewConversation(item)}
      >
        <Avatar
          user={{ avatar_url: item.avatar_url, name: userName }}
          size="small"
          isOnline={onlineUsers.has(item.id)}
        />
        <Text style={styles.friendName} numberOfLines={1}>{userName}</Text>
      </TouchableOpacity>
    );
  };

  // Filter friends without conversations for the suggestion section
  const friendsWithoutConversations = friends.filter(
    friend => !conversations.some(conv => conv.id === friend.id)
  );

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {/* Friends suggestion row */}
      {friendsWithoutConversations.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Start a conversation</Text>
          <FlatList
            horizontal
            data={friendsWithoutConversations}
            renderItem={renderFriendSuggestion}
            keyExtractor={(item) => `friend-${item.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsList}
          />
        </View>
      )}

      {/* Conversations list */}
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => `conv-${item.id}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>
              {friends.length > 0
                ? 'Tap on a friend above to start chatting'
                : 'Add friends to start messaging'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary
  },
  suggestionsContainer: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionsTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  suggestionsList: {
    paddingHorizontal: spacing.md,
  },
  friendSuggestion: {
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    width: 70,
  },
  friendName: {
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  conversation: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  conversationContent: {
    flex: 1,
    marginLeft: spacing.md
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    alignItems: 'center',
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.textSecondary
  },
  lastMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    marginLeft: spacing.sm,
  },
  unreadText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: fontWeight.semibold
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
