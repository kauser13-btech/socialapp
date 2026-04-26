import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Avatar, Loading } from '../../components/ui';
import { messagesAPI, searchAPI } from '../../lib/api';
import { useSocket } from '../../contexts/SocketContext';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';
import Icon from 'react-native-vector-icons/Ionicons';

const DEBOUNCE_MS = 350;

export default function MessagesScreen({ navigation }) {
  const { socket, onlineUsers, playNotificationSound } = useSocket();
  const { colors, isDark } = useTheme();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceTimer = useRef(null);
  const searchInputRef = useRef(null);

  const isSearching = searchQuery.trim().length > 0;

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [])
  );

  const updateConversationWithMessage = useCallback((message, senderId) => {
    setConversations(prev => {
      const existingIndex = prev.findIndex(conv => conv.id === senderId);
      if (existingIndex < 0) return prev;
      const updated = [...prev];
      updated[existingIndex] = {
        ...updated[existingIndex],
        last_message: message,
        unread_count: (updated[existingIndex].unread_count || 0) + 1,
      };
      const [conversation] = updated.splice(existingIndex, 1);
      return [conversation, ...updated];
    });
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleReceiveMessage = ({ message, senderId }) => {
      playNotificationSound();
      const exists = conversations.some(conv => conv.id === senderId);
      if (exists) {
        updateConversationWithMessage(message, senderId);
      } else {
        loadConversations();
      }
    };
    socket.on('message:receive', handleReceiveMessage);
    return () => socket.off('message:receive', handleReceiveMessage);
  }, [socket, playNotificationSound, conversations, updateConversationWithMessage]);

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

  const onRefresh = () => { setRefreshing(true); loadConversations(); };

  // Debounced search
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!text.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await searchAPI.searchUsers(text.trim());
        if (response.success) {
          setSearchResults(response.data?.users || response.data || []);
        }
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearching(false);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  };

  const openChat = (user) => {
    clearSearch();
    navigation.navigate('Chat', { userId: user.id, user });
  };

  // ─── Render: search result row ───────────────────────────────────────────
  const renderSearchResult = ({ item }) => {
    const userName = item.first_name && item.last_name
      ? `${item.first_name} ${item.last_name}`
      : item.username || 'Unknown';

    return (
      <TouchableOpacity
        style={[styles.searchResultItem, { borderBottomColor: colors.border }]}
        onPress={() => openChat(item)}
        activeOpacity={0.7}
      >
        <Avatar
          user={{ avatar_url: item.avatar_url, name: userName }}
          size="medium"
          isOnline={onlineUsers.has(item.id)}
        />
        <View style={styles.searchResultText}>
          <Text style={[styles.searchResultName, { color: colors.textPrimary }]}>{userName}</Text>
          <Text style={[styles.searchResultUsername, { color: colors.textSecondary }]}>@{item.username}</Text>
        </View>
        <Icon name="chevron-forward" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  // ─── Render: conversation row ─────────────────────────────────────────────
  const renderConversation = ({ item }) => {
    const userName = item.first_name && item.last_name
      ? `${item.first_name} ${item.last_name}`
      : item.username || 'Unknown';
    const isUnread = item.unread_count > 0;

    const handleOpenConversation = () => {
      // Optimistically clear unread badge when opening the chat
      setConversations(prev =>
        prev.map(c => c.id === item.id ? { ...c, unread_count: 0 } : c)
      );
      navigation.navigate('Chat', { userId: item.id, user: item });
    };

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={handleOpenConversation}
        activeOpacity={0.7}
      >
        <Avatar
          user={{ avatar_url: item.avatar_url, name: userName }}
          size="large"
          isOnline={onlineUsers.has(item.id)}
        />
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text
              style={[styles.userName, { color: colors.textPrimary }, isUnread && styles.userNameUnread]}
              numberOfLines={1}
            >
              {userName}
            </Text>
            <Text style={[styles.time, { color: isUnread ? colors.primary : colors.textTertiary }, isUnread && styles.timeUnread]}>
              {item.last_message?.created_at
                ? formatDistanceToNow(new Date(item.last_message.created_at), { addSuffix: false })
                : ''}
            </Text>
          </View>
          <View style={styles.conversationFooter}>
            <Text
              style={[
                styles.lastMessage,
                { color: isUnread ? colors.textPrimary : colors.textSecondary },
                isUnread && styles.lastMessageUnread,
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

  if (loading) return <Loading fullScreen />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Messages</Text>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: isDark ? colors.cardBackground : '#f3f4f6' }]}>
        <Icon name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          ref={searchInputRef}
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search people..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searching && (
          <ActivityIndicator size="small" color={colors.primary} style={styles.searchSpinner} />
        )}
        {searchQuery.length > 0 && !searching && (
          <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Results */}
      {isSearching ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => `search-${item.id}`}
          contentContainerStyle={styles.searchResultsList}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            searching ? null : (
              <View style={styles.searchEmpty}>
                <Icon name="person-outline" size={36} color={colors.textSecondary} style={{ marginBottom: 10 }} />
                <Text style={[styles.searchEmptyText, { color: colors.textSecondary }]}>
                  No users found for "{searchQuery}"
                </Text>
              </View>
            )
          }
        />
      ) : (
        /* Conversations List */
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
                Search for anyone above to start a conversation.
              </Text>
            </View>
          }
        />
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },

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

  /* Search */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchSpinner: { marginLeft: 8 },

  /* Search results */
  searchResultsList: {
    paddingBottom: 40,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchResultText: {
    flex: 1,
    marginLeft: 14,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  searchResultUsername: {
    fontSize: 13,
    marginTop: 2,
  },
  searchEmpty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  searchEmptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  /* Conversation List */
  messagesList: {
    paddingTop: 4,
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
  userNameUnread: { fontWeight: '700' },
  time: { fontSize: 12, fontWeight: '500' },
  timeUnread: { fontWeight: '600' },
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
  lastMessageUnread: { fontWeight: '600' },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { fontSize: 11, color: '#ffffff', fontWeight: '700' },

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
