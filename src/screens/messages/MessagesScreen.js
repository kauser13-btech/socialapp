import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Avatar, Loading } from '../../components/ui';
import { messagesAPI, friendsAPI } from '../../lib/api';
import { useSocket } from '../../contexts/SocketContext';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';
import Icon from 'react-native-vector-icons/Ionicons';

export default function MessagesScreen({ navigation }) {
  const { socket, onlineUsers, playNotificationSound } = useSocket();
  const { colors, isDark } = useTheme();
  
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
      loadFriends();
    }, [])
  );

  useEffect(() => {
    if (!socket) return;
    const handleReceiveMessage = ({ message, senderId }) => {
      playNotificationSound();
      setConversations(prev => {
        const existingIndex = prev.findIndex(conv => conv.id === senderId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { 
            ...updated[existingIndex], 
            last_message: message, 
            unread_count: (updated[existingIndex].unread_count || 0) + 1 
          };
          const [conversation] = updated.splice(existingIndex, 1);
          return [conversation, ...updated];
        } else {
          loadConversations();
          return prev;
        }
      });
    };
    socket.on('message:receive', handleReceiveMessage);
    return () => socket.off('message:receive', handleReceiveMessage);
  }, [socket, playNotificationSound]);

  const loadConversations = async () => {
    try {
      const response = await messagesAPI.getConversations();
      if (response.success) setConversations(response.data.conversations || response.data || []);
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
      if (response.success) setFriends(response.data.friends || []);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadConversations(); };

  const renderConversation = ({ item }) => {
    const userName = item.first_name && item.last_name ? `${item.first_name} ${item.last_name}` : item.username || 'Unknown';
    const isUnread = item.unread_count > 0;
    
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => navigation.navigate('Chat', { userId: item.id, user: item })}
        activeOpacity={0.7}
      >
        <Avatar user={{ avatar_url: item.avatar_url, name: userName }} size="large" isOnline={onlineUsers.has(item.id)} />
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.userName, { color: colors.textPrimary }, isUnread && styles.userNameUnread]} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={[styles.time, { color: isUnread ? colors.primary : colors.textTertiary }, isUnread && styles.timeUnread]}>
              {item.last_message?.created_at ? formatDistanceToNow(new Date(item.last_message.created_at), { addSuffix: false }) : ''}
            </Text>
          </View>
          <View style={styles.conversationFooter}>
            <Text 
              style={[
                styles.lastMessage, 
                { color: isUnread ? colors.textPrimary : colors.textSecondary },
                isUnread && styles.lastMessageUnread
              ]} 
              numberOfLines={2}
            >
              {item.last_message?.content || 'Start a conversation'}
            </Text>
            {isUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadText}>{item.unread_count > 99 ? '99+' : item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFriendSuggestion = ({ item }) => {
    const hasConversation = conversations.some(conv => conv.id === item.id);
    if (hasConversation) return null;
    
    const userName = item.first_name && item.last_name ? `${item.first_name}\n${item.last_name}` : item.username;
    
    return (
      <TouchableOpacity
        style={styles.friendSuggestion}
        onPress={() => navigation.navigate('Chat', { userId: item.id, user: item })}
        activeOpacity={0.7}
      >
        <View style={styles.suggestionAvatarWrap}>
          <Avatar user={{ avatar_url: item.avatar_url, name: userName }} size="medium" isOnline={onlineUsers.has(item.id)} />
          <View style={[styles.newChatBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
            <Icon name="add" size={12} color="#fff" />
          </View>
        </View>
        <Text style={[styles.friendName, { color: colors.textPrimary }]} numberOfLines={2}>
          {userName}
        </Text>
      </TouchableOpacity>
    );
  };

  const friendsWithoutConversations = friends.filter(f => !conversations.some(conv => conv.id === f.id));

  if (loading) return <Loading fullScreen />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Messages</Text>
        <TouchableOpacity style={[styles.headerIconBtn, { backgroundColor: isDark ? colors.cardBackground : '#f3f4f6' }]}>
          <Icon name="search" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {friendsWithoutConversations.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={[styles.suggestionsTitle, { color: colors.textSecondary }]}>Start a new chat</Text>
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

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => `conv-${item.id}`}
        contentContainerStyle={styles.messagesList}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary]} 
            tintColor={colors.primary} 
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '15' }]}>
              <Icon name="chatbubble-ellipses-outline" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No messages yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {friends.length > 0 
                ? 'Say hi to one of your friends above.' 
                : 'Connect with friends to start chatting here.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  
  /* Header */
  header: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24, 
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Suggestions (Horizontal) */
  suggestionsContainer: { 
    paddingTop: 16,
    paddingBottom: 8,
  },
  suggestionsTitle: { 
    fontSize: 13, 
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12, 
    paddingHorizontal: 24,
  },
  suggestionsList: { 
    paddingHorizontal: 20,
    gap: 16,
  },
  friendSuggestion: { 
    alignItems: 'center', 
    width: 64,
  },
  suggestionAvatarWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  newChatBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendName: { 
    fontSize: 12, 
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },

  /* Conversation List */
  messagesList: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  conversationItem: { 
    flexDirection: 'row', 
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center', 
  },
  conversationContent: { 
    flex: 1, 
    marginLeft: 16,
  },
  conversationHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 4, 
  },
  userName: { 
    fontSize: 16, 
    fontWeight: '600', 
    flex: 1, 
    marginRight: 12,
    letterSpacing: -0.2,
  },
  userNameUnread: {
    fontWeight: '700',
  },
  time: { 
    fontSize: 12,
    fontWeight: '500', 
  },
  timeUnread: {
    fontWeight: '600',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: { 
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    paddingRight: 16,
  },
  lastMessageUnread: {
    fontWeight: '600',
  },
  unreadBadge: { 
    minWidth: 22, 
    height: 22, 
    borderRadius: 11, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 6,
  },
  unreadText: { 
    fontSize: 11, 
    color: '#ffffff', 
    fontWeight: '700' 
  },

  /* Empty State */
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 48,
    marginTop: 40,
  },
  emptyIconWrap: { 
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    marginBottom: 8,
    letterSpacing: -0.3, 
  },
  emptyText: { 
    fontSize: 15, 
    textAlign: 'center',
    lineHeight: 22, 
  },
});
