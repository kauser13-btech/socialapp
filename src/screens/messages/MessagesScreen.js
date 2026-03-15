import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Avatar, Loading } from '../../components/ui';
import { messagesAPI, friendsAPI } from '../../lib/api';
import { useSocket } from '../../contexts/SocketContext';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../constants/styles';
import { formatDistanceToNow } from 'date-fns';

export default function MessagesScreen({ navigation }) {
  const { socket, onlineUsers, playNotificationSound } = useSocket();
  const { colors } = useTheme();
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
          updated[existingIndex] = { ...updated[existingIndex], last_message: message, unread_count: (updated[existingIndex].unread_count || 0) + 1 };
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
    return (
      <TouchableOpacity
        style={[styles.conversation, { borderBottomColor: colors.border }]}
        onPress={() => navigation.navigate('Chat', { userId: item.id, user: item })}
      >
        <Avatar user={{ avatar_url: item.avatar_url, name: userName }} size="medium" isOnline={onlineUsers.has(item.id)} />
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>{userName}</Text>
            <Text style={[styles.time, { color: colors.textSecondary }]}>
              {item.last_message?.created_at ? formatDistanceToNow(new Date(item.last_message.created_at), { addSuffix: true }) : ''}
            </Text>
          </View>
          <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.last_message?.content || 'Start a conversation'}
          </Text>
        </View>
        {item.unread_count > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.unreadText}>{item.unread_count > 99 ? '99+' : item.unread_count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFriendSuggestion = ({ item }) => {
    const hasConversation = conversations.some(conv => conv.id === item.id);
    if (hasConversation) return null;
    const userName = item.first_name && item.last_name ? `${item.first_name} ${item.last_name}` : item.username;
    return (
      <TouchableOpacity
        style={styles.friendSuggestion}
        onPress={() => navigation.navigate('Chat', { userId: item.id, user: item })}
      >
        <Avatar user={{ avatar_url: item.avatar_url, name: userName }} size="small" isOnline={onlineUsers.has(item.id)} />
        <Text style={[styles.friendName, { color: colors.textPrimary }]} numberOfLines={1}>{userName}</Text>
      </TouchableOpacity>
    );
  };

  const friendsWithoutConversations = friends.filter(f => !conversations.some(conv => conv.id === f.id));

  if (loading) return <Loading fullScreen />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Messages</Text>
      </View>

      {friendsWithoutConversations.length > 0 && (
        <View style={[styles.suggestionsContainer, { borderBottomColor: colors.border }]}>
          <Text style={[styles.suggestionsTitle, { color: colors.textSecondary }]}>Start a conversation</Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No messages yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {friends.length > 0 ? 'Tap on a friend above to start chatting' : 'Add friends to start messaging'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold },
  suggestionsContainer: { paddingVertical: spacing.md, borderBottomWidth: 1 },
  suggestionsTitle: { fontSize: fontSize.sm, marginBottom: spacing.sm, paddingHorizontal: spacing.lg },
  suggestionsList: { paddingHorizontal: spacing.md },
  friendSuggestion: { alignItems: 'center', marginHorizontal: spacing.sm, width: 70 },
  friendName: { fontSize: fontSize.xs, marginTop: spacing.xs, textAlign: 'center' },
  conversation: { flexDirection: 'row', padding: spacing.md, borderBottomWidth: 1, alignItems: 'center' },
  conversationContent: { flex: 1, marginLeft: spacing.md },
  conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs, alignItems: 'center' },
  userName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, flex: 1, marginRight: spacing.sm },
  time: { fontSize: fontSize.xs },
  lastMessage: { fontSize: fontSize.sm },
  unreadBadge: { minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs, marginLeft: spacing.sm },
  unreadText: { fontSize: fontSize.xs, color: '#ffffff', fontWeight: fontWeight.semibold },
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, marginBottom: spacing.sm },
  emptyText: { fontSize: fontSize.md, textAlign: 'center' },
});
