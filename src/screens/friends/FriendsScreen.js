import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Loading, Avatar } from '../../components/ui';
import { friendsAPI } from '../../lib/api';
import { useSocket } from '../../contexts/SocketContext';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, borderRadius } from '../../constants/styles';

export default function FriendsScreen({ navigation }) {
  const { onlineUsers } = useSocket();
  const { colors } = useTheme();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequestsList, setSentRequestsList] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [sentRequests, setSentRequests] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('friends');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [friendsRes, requestsRes, sentRequestsRes, suggestionsRes] = await Promise.all([
        friendsAPI.list(), friendsAPI.requests(), friendsAPI.sentRequests(), friendsAPI.suggestions(),
      ]);
      if (friendsRes.success) setFriends(friendsRes.data.friends || []);
      if (requestsRes.success) setRequests(requestsRes.data.requests || []);
      if (suggestionsRes.success) setSuggestions(suggestionsRes.data.suggestions || []);
      if (sentRequestsRes.success) {
        const sentReqs = sentRequestsRes.data.sent_requests || [];
        setSentRequests(new Set(sentReqs.map(r => r.friend_id)));
        setSentRequestsList(sentReqs);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (id) => {
    try { await friendsAPI.acceptRequest(id); setRequests(requests.filter(r => r.id !== id)); loadData(); }
    catch (error) { console.error('Failed to accept request:', error); }
  };

  const handleRejectRequest = async (id) => {
    try { await friendsAPI.rejectRequest(id); setRequests(requests.filter(r => r.id !== id)); }
    catch (error) { console.error('Failed to reject request:', error); }
  };

  const handleSendFriendRequest = async (userId) => {
    try { await friendsAPI.sendRequest(userId); setSentRequests(prev => new Set([...prev, userId])); setSuggestions(suggestions.filter(s => s.id !== userId)); loadData(); }
    catch (error) { console.error('Failed to send friend request:', error); }
  };

  const handleRemoveFriend = async (id) => {
    try { await friendsAPI.remove(id); setFriends(friends.filter(f => f.id !== id)); }
    catch (error) { console.error('Failed to remove friend:', error); }
  };

  if (loading) return <Loading fullScreen />;

  const tabs = [
    { id: 'friends', label: `Friends (${friends.length})` },
    { id: 'sent', label: `Sent (${sentRequestsList.length})` },
    { id: 'suggestions', label: 'Suggestions' },
  ];

  const renderFriendItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
      <TouchableOpacity style={styles.userInfo} onPress={() => navigation?.navigate('Profile', { username: item.username })}>
        <Avatar user={item} size={50} isOnline={onlineUsers.has(item.id)} />
        <View style={styles.textContainer}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{item.first_name} {item.last_name}</Text>
          <Text style={[styles.username, { color: colors.textSecondary }]}>@{item.username}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => navigation?.navigate('Chat', { userId: item.id, user: item })}>
          <Text style={styles.actionBtnText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.gray200 }]} onPress={() => handleRemoveFriend(item.id)}>
          <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSentRequestItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
      <TouchableOpacity style={styles.userInfo} onPress={() => navigation?.navigate('Profile', { username: item.friend?.username })}>
        <Avatar user={item.friend} size={50} />
        <View style={styles.textContainer}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{item.friend?.first_name} {item.friend?.last_name}</Text>
          <Text style={[styles.username, { color: colors.textSecondary }]}>@{item.friend?.username}</Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>Sent {new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      </TouchableOpacity>
      <View style={[styles.pendingBadge, { backgroundColor: colors.gray200 }]}>
        <Text style={[styles.pendingText, { color: colors.textSecondary }]}>Pending</Text>
      </View>
    </View>
  );

  const renderSuggestionItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
      <TouchableOpacity style={styles.userInfo} onPress={() => navigation?.navigate('Profile', { username: item.username })}>
        <Avatar user={item} size={50} />
        <View style={styles.textContainer}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{item.first_name} {item.last_name}</Text>
          <Text style={[styles.username, { color: colors.textSecondary }]}>@{item.username}</Text>
        </View>
      </TouchableOpacity>
      {sentRequests.has(item.id) ? (
        <View style={[styles.pendingBadge, { backgroundColor: colors.gray200 }]}>
          <Text style={[styles.pendingText, { color: colors.textSecondary }]}>Sent</Text>
        </View>
      ) : (
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => handleSendFriendRequest(item.id)}>
          <Text style={styles.actionBtnText}>Add Friend</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderRequestItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
      <TouchableOpacity style={styles.userInfo} onPress={() => navigation?.navigate('Profile', { username: item.user?.username })}>
        <Avatar user={item.user} size={50} />
        <View style={styles.textContainer}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{item.user?.first_name} {item.user?.last_name}</Text>
          <Text style={[styles.username, { color: colors.textSecondary }]}>@{item.user?.username}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => handleAcceptRequest(item.id)}>
          <Text style={styles.actionBtnText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.gray200 }]} onPress={() => handleRejectRequest(item.id)}>
          <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getListConfig = () => {
    switch (activeTab) {
      case 'friends': return { data: friends, renderItem: renderFriendItem, empty: ['No friends yet', 'Start connecting with people'] };
      case 'sent': return { data: sentRequestsList, renderItem: renderSentRequestItem, empty: ['No sent requests', "You haven't sent any friend requests yet"] };
      default: return { data: suggestions, renderItem: renderSuggestionItem, empty: ['No suggestions', 'Check back later for friend suggestions'] };
    }
  };

  const listConfig = getListConfig();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      {requests.length > 0 && (
        <View style={[styles.requestsSection, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Friend Requests ({requests.length})</Text>
          <FlatList data={requests} renderItem={renderRequestItem} keyExtractor={(item) => item.id.toString()} scrollEnabled={false} />
        </View>
      )}

      <View style={[styles.tabContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && [styles.activeTab, { borderBottomColor: colors.primary }]]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab.id ? colors.primary : colors.textSecondary }, activeTab === tab.id && { fontWeight: '600' }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {listConfig.data.length > 0 ? (
        <FlatList
          data={listConfig.data}
          renderItem={listConfig.renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{listConfig.empty[0]}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{listConfig.empty[1]}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  requestsSection: { padding: spacing.md, marginBottom: spacing.sm },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: 'bold', marginBottom: spacing.md },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2 },
  tabText: { fontSize: fontSize.sm, fontWeight: '500' },
  listContent: { padding: spacing.md },
  card: { borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  textContainer: { marginLeft: spacing.md, flex: 1 },
  name: { fontSize: fontSize.md, fontWeight: '600' },
  username: { fontSize: fontSize.sm, marginTop: 2 },
  date: { fontSize: fontSize.xs, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.xs },
  actionBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  actionBtnText: { color: '#ffffff', fontSize: fontSize.sm, fontWeight: '500' },
  pendingBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  pendingText: { fontSize: fontSize.sm, fontWeight: '500' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', marginBottom: spacing.sm },
  emptySubtitle: { fontSize: fontSize.md, textAlign: 'center' },
});
