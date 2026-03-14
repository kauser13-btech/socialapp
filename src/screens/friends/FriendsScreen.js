import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Loading, Avatar } from '../../components/ui';
import { friendsAPI } from '../../lib/api';
import { useSocket } from '../../contexts/SocketContext';
import { colors, spacing, fontSize } from '../../constants/styles';

export default function FriendsScreen({ navigation }) {
  const { onlineUsers } = useSocket();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequestsList, setSentRequestsList] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [sentRequests, setSentRequests] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('friends');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [friendsRes, requestsRes, sentRequestsRes, suggestionsRes] = await Promise.all([
        friendsAPI.list(),
        friendsAPI.requests(),
        friendsAPI.sentRequests(),
        friendsAPI.suggestions()
      ]);

      if (friendsRes.success) setFriends(friendsRes.data.friends || []);
      if (requestsRes.success) setRequests(requestsRes.data.requests || []);
      if (suggestionsRes.success) setSuggestions(suggestionsRes.data.suggestions || []);

      if (sentRequestsRes.success) {
        const sentReqs = sentRequestsRes.data.sent_requests || [];
        const sentIds = sentReqs.map(req => req.friend_id);
        setSentRequests(new Set(sentIds));
        setSentRequestsList(sentReqs);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (id) => {
    try {
      await friendsAPI.acceptRequest(id);
      setRequests(requests.filter(r => r.id !== id));
      loadData();
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      await friendsAPI.rejectRequest(id);
      setRequests(requests.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      await friendsAPI.sendRequest(userId);
      setSentRequests(prev => new Set([...prev, userId]));
      setSuggestions(suggestions.filter(s => s.id !== userId));
      loadData();
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  };

  const handleRemoveFriend = async (id) => {
    try {
      await friendsAPI.remove(id);
      setFriends(friends.filter(f => f.id !== id));
    } catch (error) {
      console.error('Failed to remove friend:', error);
    }
  };

  if (loading) return <Loading fullScreen />;

  const tabs = [
    { id: 'friends', label: `Friends (${friends.length})` },
    { id: 'sent', label: `Sent (${sentRequestsList.length})` },
    { id: 'suggestions', label: 'Suggestions' },
  ];

  const renderFriendItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => navigation?.navigate('Profile', { username: item.username })}
      >
        <Avatar user={item} size={50} isOnline={onlineUsers.has(item.id)} />
        <View style={styles.textContainer}>
          <Text style={styles.name}>{item.first_name} {item.last_name}</Text>
          <Text style={styles.username}>@{item.username}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.messageButton}
          onPress={() => navigation?.navigate('Chat', { userId: item.id, user: item })}
        >
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFriend(item.id)}
        >
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSentRequestItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => navigation?.navigate('Profile', { username: item.friend?.username })}
      >
        <Avatar user={item.friend} size={50} />
        <View style={styles.textContainer}>
          <Text style={styles.name}>{item.friend?.first_name} {item.friend?.last_name}</Text>
          <Text style={styles.username}>@{item.friend?.username}</Text>
          <Text style={styles.date}>
            Sent {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.pendingBadge}>
        <Text style={styles.pendingText}>Pending</Text>
      </View>
    </View>
  );

  const renderSuggestionItem = ({ item }) => {
    const isRequestSent = sentRequests.has(item.id);
    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => navigation?.navigate('Profile', { username: item.username })}
        >
          <Avatar user={item} size={50} />
          <View style={styles.textContainer}>
            <Text style={styles.name}>{item.first_name} {item.last_name}</Text>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
        </TouchableOpacity>
        {isRequestSent ? (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Sent</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleSendFriendRequest(item.id)}
          >
            <Text style={styles.addButtonText}>Add Friend</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderRequestItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => navigation?.navigate('Profile', { username: item.user?.username })}
      >
        <Avatar user={item.user} size={50} />
        <View style={styles.textContainer}>
          <Text style={styles.name}>{item.user?.first_name} {item.user?.last_name}</Text>
          <Text style={styles.username}>@{item.user?.username}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptRequest(item.id)}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => handleRejectRequest(item.id)}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = (message, subMessage) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{message}</Text>
      <Text style={styles.emptySubtitle}>{subMessage}</Text>
    </View>
  );

  const getListData = () => {
    switch (activeTab) {
      case 'friends':
        return { data: friends, renderItem: renderFriendItem, empty: ['No friends yet', 'Start connecting with people'] };
      case 'sent':
        return { data: sentRequestsList, renderItem: renderSentRequestItem, empty: ['No sent requests', "You haven't sent any friend requests yet"] };
      case 'suggestions':
        return { data: suggestions, renderItem: renderSuggestionItem, empty: ['No suggestions', 'Check back later for friend suggestions'] };
      default:
        return { data: [], renderItem: () => null, empty: ['', ''] };
    }
  };

  const listConfig = getListData();

  return (
    <SafeAreaView style={styles.container}>
      {/* Friend Requests Section */}
      {requests.length > 0 && (
        <View style={styles.requestsSection}>
          <Text style={styles.sectionTitle}>Friend Requests ({requests.length})</Text>
          <FlatList
            data={requests}
            renderItem={renderRequestItem}
            keyExtractor={(item) => item.id.toString()}
            horizontal={false}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {listConfig.data.length > 0 ? (
        <FlatList
          data={listConfig.data}
          renderItem={listConfig.renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        renderEmptyState(listConfig.empty[0], listConfig.empty[1])
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || '#f5f5f5',
  },
  requestsSection: {
    backgroundColor: '#fff',
    padding: spacing.md || 16,
    marginBottom: spacing.sm || 8,
  },
  sectionTitle: {
    fontSize: fontSize.lg || 18,
    fontWeight: 'bold',
    marginBottom: spacing.md || 16,
    color: colors.text || '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md || 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary || '#007AFF',
  },
  tabText: {
    fontSize: fontSize.sm || 14,
    color: colors.textSecondary || '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.primary || '#007AFF',
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md || 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md || 16,
    marginBottom: spacing.sm || 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: spacing.md || 16,
    flex: 1,
  },
  name: {
    fontSize: fontSize.md || 16,
    fontWeight: '600',
    color: colors.text || '#333',
  },
  username: {
    fontSize: fontSize.sm || 14,
    color: colors.textSecondary || '#666',
    marginTop: 2,
  },
  date: {
    fontSize: fontSize.xs || 12,
    color: colors.textSecondary || '#999',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs || 8,
  },
  messageButton: {
    backgroundColor: colors.primary || '#007AFF',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.sm || 8,
    borderRadius: 8,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: fontSize.sm || 14,
    fontWeight: '500',
  },
  removeButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.sm || 8,
    borderRadius: 8,
  },
  removeButtonText: {
    color: colors.textSecondary || '#666',
    fontSize: fontSize.sm || 14,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: colors.primary || '#007AFF',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.sm || 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: fontSize.sm || 14,
    fontWeight: '500',
  },
  acceptButton: {
    backgroundColor: colors.primary || '#007AFF',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.sm || 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: fontSize.sm || 14,
    fontWeight: '500',
  },
  declineButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.sm || 8,
    borderRadius: 8,
  },
  declineButtonText: {
    color: colors.textSecondary || '#666',
    fontSize: fontSize.sm || 14,
    fontWeight: '500',
  },
  pendingBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: spacing.md || 16,
    paddingVertical: spacing.sm || 8,
    borderRadius: 8,
  },
  pendingText: {
    color: colors.textSecondary || '#666',
    fontSize: fontSize.sm || 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl || 32,
  },
  emptyTitle: {
    fontSize: fontSize.lg || 18,
    fontWeight: '600',
    color: colors.text || '#333',
    marginBottom: spacing.sm || 8,
  },
  emptySubtitle: {
    fontSize: fontSize.md || 16,
    color: colors.textSecondary || '#666',
    textAlign: 'center',
  },
});
