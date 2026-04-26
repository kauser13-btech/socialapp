import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Loading, Avatar } from '../../components/ui';
import { friendsAPI } from '../../lib/api';
import { useSocket } from '../../contexts/SocketContext';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, borderRadius } from '../../constants/styles';

// ─── Birthday Banner ──────────────────────────────────────────────────────────
function BirthdayBanner({ birthdays, onWish, onPress }) {
  if (!birthdays || birthdays.length === 0) return null;

  const todayBdays = birthdays.filter(b => b.is_today);
  const soonBdays  = birthdays.filter(b => !b.is_today);

  const birthdayWord = todayBdays.length > 1 ? 'birthdays' : 'birthday';
  const friendWord   = soonBdays.length > 1 ? 'friends' : 'friend';
  const titleText    = todayBdays.length > 0
    ? `${todayBdays.length} ${birthdayWord} today!`
    : 'Upcoming birthdays';
  const subtitleText = todayBdays.length > 0
    ? "Don't forget to wish them!"
    : `${soonBdays.length} ${friendWord} soon`;

  return (
    <View style={bannerStyles.wrapper}>
      {/* Header */}
      <View style={bannerStyles.header}>
        <Text style={bannerStyles.headerEmoji}>🎂</Text>
        <View style={bannerStyles.headerText}>
          <Text style={bannerStyles.title}>{titleText}</Text>
          <Text style={bannerStyles.subtitle}>{subtitleText}</Text>
        </View>
      </View>

      {/* Horizontal scroll of birthday cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={bannerStyles.scroll}>
        {birthdays.map(b => (
          <TouchableOpacity key={b.id} style={[bannerStyles.card, b.is_today && bannerStyles.cardToday]} onPress={() => onPress(b)} activeOpacity={0.8}>
            <View style={bannerStyles.avatarWrap}>
              <Avatar user={b} size={48} />
              <View style={bannerStyles.cakePin}>
                <Text style={bannerStyles.cakePinEmoji}>{b.is_today ? '🎂' : '🎁'}</Text>
              </View>
            </View>
            <Text style={bannerStyles.cardName} numberOfLines={1}>{b.first_name}</Text>
            <Text style={[bannerStyles.cardDay, b.is_today && bannerStyles.cardDayToday]}>
              {b.is_today ? 'Today!' : `in ${b.days_until}d`}
            </Text>
            {b.is_today && (
              <TouchableOpacity style={bannerStyles.wishBtn} onPress={() => onWish(b)}>
                <Text style={bannerStyles.wishBtnText}>🎉 Wish</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default function FriendsScreen({ navigation }) {
  const { onlineUsers } = useSocket();
  const { colors } = useTheme();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequestsList, setSentRequestsList] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [sentRequests, setSentRequests] = useState(new Set());
  const [birthdayIds, setBirthdayIds] = useState(new Set());
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('friends');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [friendsRes, requestsRes, sentRequestsRes, suggestionsRes, birthdaysRes] = await Promise.all([
        friendsAPI.list(), friendsAPI.requests(), friendsAPI.sentRequests(), friendsAPI.suggestions(), friendsAPI.getBirthdays(),
      ]);
      if (friendsRes.success) setFriends(friendsRes.data.friends || []);
      if (requestsRes.success) setRequests(requestsRes.data.requests || []);
      if (suggestionsRes.success) setSuggestions(suggestionsRes.data.suggestions || []);
      if (sentRequestsRes.success) {
        const sentReqs = sentRequestsRes.data.sent_requests || [];
        setSentRequests(new Set(sentReqs.map(r => r.friend_id)));
        setSentRequestsList(sentReqs);
      }
      if (birthdaysRes.success) {
        const bdays = birthdaysRes.data.birthdays || [];
        setBirthdays(bdays);
        setBirthdayIds(new Set(bdays.filter(b => b.is_today).map(b => b.id)));
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

  const handleWish = (b) => {
    navigation?.navigate('Chat', {
      userId: b.id,
      user: b,
      prefilledMessage: `Happy Birthday ${b.first_name}! 🎂🎉`,
    });
  };

  const handleBirthdayPress = (b) => {
    navigation?.navigate('Profile', { username: b.username });
  };

  if (loading) return <Loading fullScreen />;

  const tabs = [
    { id: 'friends', label: `Friends (${friends.length})` },
    { id: 'sent', label: `Sent (${sentRequestsList.length})` },
    { id: 'suggestions', label: 'Suggestions' },
  ];

  const renderFriendItem = ({ item }) => {
    const isBirthday = birthdayIds.has(item.id);
    return (
      <View style={[styles.card, { backgroundColor: colors.cardBackground }, isBirthday && styles.birthdayCard]}>
        <TouchableOpacity style={styles.userInfo} onPress={() => navigation?.navigate('Profile', { username: item.username })}>
          <View>
            <Avatar user={item} size={50} isOnline={onlineUsers.has(item.id)} />
            {isBirthday && (
              <View style={styles.birthdayBadge}>
                <Text style={styles.birthdayBadgeEmoji}>🎂</Text>
              </View>
            )}
          </View>
          <View style={styles.textContainer}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>{item.first_name} {item.last_name}</Text>
              {isBirthday && (
                <View style={styles.birthdayPill}>
                  <Text style={styles.birthdayPillText}>Birthday!</Text>
                </View>
              )}
            </View>
            <Text style={[styles.username, { color: colors.textSecondary }]}>@{item.username}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isBirthday ? '#c084fc' : colors.primary }]}
            onPress={() => navigation?.navigate('Chat', {
              userId: item.id,
              user: item,
              prefilledMessage: isBirthday ? `Happy Birthday ${item.first_name}! 🎂🎉` : undefined,
            })}
          >
            <Text style={styles.actionBtnText}>{isBirthday ? '🎉 Wish' : 'Message'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.gray200 }]} onPress={() => handleRemoveFriend(item.id)}>
            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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

      {/* ── Birthday banner — always on top, above everything ── */}
      <BirthdayBanner
        birthdays={birthdays}
        onWish={handleWish}
        onPress={handleBirthdayPress}
      />

      {/* ── Pending friend requests ── */}
      {requests.length > 0 && (
        <View style={[styles.requestsSection, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Friend Requests ({requests.length})</Text>
          <FlatList data={requests} renderItem={renderRequestItem} keyExtractor={(item) => item.id.toString()} scrollEnabled={false} />
        </View>
      )}

      {/* ── Tabs ── */}
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
  birthdayCard: { borderWidth: 1.5, borderColor: '#c084fc' },
  birthdayBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  birthdayBadgeEmoji: { fontSize: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  birthdayPill: { backgroundColor: '#c084fc', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  birthdayPillText: { color: '#fff', fontSize: 10, fontWeight: '700' },
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

// ─── Banner styles ─────────────────────────────────────────────────────────────
const bannerStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fdf4ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9d5ff',
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  headerEmoji: { fontSize: 28 },
  headerText: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#7e22ce' },
  subtitle: { fontSize: 12, color: '#a855f7', marginTop: 1 },
  scroll: { paddingHorizontal: 12, gap: 10 },
  card: {
    width: 84,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    gap: 4,
  },
  cardToday: {
    borderColor: '#a855f7',
    borderWidth: 2,
    backgroundColor: '#fdf4ff',
  },
  avatarWrap: { position: 'relative', marginBottom: 2 },
  cakePin: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  cakePinEmoji: { fontSize: 12 },
  cardName: { fontSize: 12, fontWeight: '600', color: '#581c87', textAlign: 'center' },
  cardDay: { fontSize: 11, color: '#a855f7', fontWeight: '500' },
  cardDayToday: { color: '#7e22ce', fontWeight: '700' },
  wishBtn: {
    marginTop: 2,
    backgroundColor: '#a855f7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  wishBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
