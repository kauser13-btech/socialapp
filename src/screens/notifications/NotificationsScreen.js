import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';

// ── Dummy data ────────────────────────────────────────────────────────────────
const DUMMY_NOTIFICATIONS = [
  // NEW
  {
    id: '1',
    section: 'NEW',
    type: 'save',
    actorName: 'Emma Chen',
    actorInitials: null,
    actorAvatar: null,
    actorBgColor: null,
    actorEmoji: '📚',
    message: 'saved your book recommendation — The Midnight Library',
    time: '2m',
    read: false,
    thumbnail: null,
    thumbnailColor: null,
  },
  {
    id: '2',
    section: 'NEW',
    type: 'birthday',
    actorName: "Emma's birthday",
    actorInitials: null,
    actorAvatar: null,
    actorBgColor: null,
    actorEmoji: '🎂',
    message: 'is in 8 days — she loves Books & Travel',
    time: 'Today',
    read: false,
    thumbnail: null,
    thumbnailColor: null,
  },
  {
    id: '3',
    section: 'NEW',
    type: 'like',
    actorName: 'Alex Kim',
    actorInitials: 'A',
    actorAvatar: null,
    actorBgColor: '#0ea5e9',
    actorEmoji: null,
    message: 'liked your Nobu Restaurant post',
    time: null,
    read: false,
    thumbnail: null,
    thumbnailColor: '#f97316',
  },
  // EARLIER TODAY
  {
    id: '4',
    section: 'EARLIER TODAY',
    type: 'group_save',
    actorName: 'Jordan',
    actorInitials: 'J',
    actorAvatar: null,
    actorBgColor: '#a855f7',
    actorEmoji: null,
    message: 'and 3 others also love Interstellar — now 34 friends have it',
    time: null,
    read: true,
    thumbnail: null,
    thumbnailColor: '#6d28d9',
  },
  {
    id: '5',
    section: 'EARLIER TODAY',
    type: 'friend_request',
    actorName: 'Marcus Kim',
    actorInitials: 'M',
    actorAvatar: null,
    actorBgColor: '#10b981',
    actorEmoji: null,
    message: 'sent you a friend request',
    time: null,
    read: true,
    thumbnail: null,
    thumbnailColor: null,
  },
  // YESTERDAY
  {
    id: '6',
    section: 'YESTERDAY',
    type: 'milestone',
    actorName: null,
    actorInitials: null,
    actorAvatar: null,
    actorBgColor: null,
    actorEmoji: '🔖',
    message: 'Your Kyoto recommendation reached 100 saves 🎉',
    time: null,
    read: true,
    thumbnail: null,
    thumbnailColor: '#10b981',
  },
  {
    id: '7',
    section: 'YESTERDAY',
    type: 'share',
    actorName: 'Lily Wang',
    actorInitials: 'L',
    actorAvatar: null,
    actorBgColor: '#ec4899',
    actorEmoji: null,
    message: 'shared a Music preference you might love',
    time: null,
    read: true,
    thumbnail: null,
    thumbnailColor: '#8b5cf6',
  },
];

const SECTIONS = ['NEW', 'EARLIER TODAY', 'YESTERDAY'];

function groupBySection(notifications) {
  const map = {};
  for (const s of SECTIONS) map[s] = [];
  for (const n of notifications) {
    if (map[n.section]) map[n.section].push(n);
  }
  return SECTIONS
    .filter(s => map[s].length > 0)
    .map(s => ({ title: s, data: map[s] }));
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ item }) {
  if (item.actorEmoji) {
    return (
      <View style={[styles.avatar, { backgroundColor: '#f1f5f9' }]}>
        <Text style={{ fontSize: 20 }}>{item.actorEmoji}</Text>
      </View>
    );
  }
  if (item.actorAvatar) {
    return <Image source={{ uri: item.actorAvatar }} style={styles.avatar} />;
  }
  return (
    <View style={[styles.avatar, { backgroundColor: item.actorBgColor || '#94a3b8' }]}>
      <Text style={styles.avatarText}>{item.actorInitials || '?'}</Text>
    </View>
  );
}

// ── Thumbnail (right side colored square) ────────────────────────────────────
function Thumbnail({ color }) {
  if (!color) return null;
  return <View style={[styles.thumbnail, { backgroundColor: color }]} />;
}

// ── Single notification row ───────────────────────────────────────────────────
function NotifRow({ item, colors, onAcceptFriend, onIgnoreFriend, onMarkRead }) {
  const isFriendRequest = item.type === 'friend_request';
  const rowBg = item.read
    ? (colors.background || '#fff')
    : (colors.cardBackground || '#f8faff');

  const actorPart = item.actorName
    ? <Text style={[styles.rowText, { color: colors.textPrimary }]}><Text style={styles.actorName}>{item.actorName}</Text>{' '}{item.message}</Text>
    : <Text style={[styles.rowText, { color: colors.textPrimary }]}>{item.message}</Text>;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[styles.row, { backgroundColor: rowBg }]}
      onPress={() => { if (!item.read) onMarkRead(item.id); }}
    >
      <Avatar item={item} />

      <View style={styles.rowContent}>
        {actorPart}

        {item.time ? (
          <Text style={[styles.rowTime, { color: colors.textTertiary || '#94a3b8' }]}>{item.time}</Text>
        ) : null}

        {isFriendRequest && (
          <View style={styles.friendActions}>
            <TouchableOpacity
              style={styles.acceptBtn}
              activeOpacity={0.8}
              onPress={() => onAcceptFriend(item.id)}
            >
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ignoreBtn, { borderColor: colors.border || '#e2e8f0' }]}
              activeOpacity={0.8}
              onPress={() => onIgnoreFriend(item.id)}
            >
              <Text style={[styles.ignoreBtnText, { color: colors.textPrimary }]}>Ignore</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!isFriendRequest && item.thumbnailColor && (
        <Thumbnail color={item.thumbnailColor} />
      )}

      {!item.read && (
        <View style={styles.unreadDot} />
      )}
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [notifications, setNotifications] = useState(DUMMY_NOTIFICATIONS);
  const [refreshing, setRefreshing] = useState(false);

  // Keep real API load available for later — currently uses dummy data
  useFocusEffect(useCallback(() => {}, []));

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setNotifications(DUMMY_NOTIFICATIONS);
      setRefreshing(false);
    }, 800);
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleMarkRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleAcceptFriend = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleIgnoreFriend = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const grouped = groupBySection(notifications);

  // Build flat list items: section headers + rows
  const listItems = [];
  for (const group of grouped) {
    listItems.push({ key: `section_${group.title}`, isHeader: true, title: group.title });
    for (const item of group.data) {
      listItems.push({ key: item.id, isHeader: false, item });
    }
  }

  const bg = isDark ? (colors.background || '#0f172a') : '#f1f5f9';
  const cardBg = isDark ? (colors.cardBackground || '#1e293b') : '#ffffff';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: bg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-back" size={22} color={colors.primary || '#6366f1'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary || '#0f172a' }]}>Activity</Text>
        <TouchableOpacity onPress={handleMarkAllRead} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.markAllText, { color: colors.primary || '#6366f1' }]}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={listItems}
        keyExtractor={item => item.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary || '#6366f1'}
          />
        }
        renderItem={({ item }) => {
          if (item.isHeader) {
            return (
              <View style={[styles.sectionHeader, { backgroundColor: bg }]}>
                <Text style={[styles.sectionTitle, { color: colors.textTertiary || '#94a3b8' }]}>
                  {item.title}
                </Text>
              </View>
            );
          }
          return (
            <NotifRow
              item={item.item}
              colors={{ ...colors, background: cardBg }}
              onMarkRead={handleMarkRead}
              onAcceptFriend={handleAcceptFriend}
              onIgnoreFriend={handleIgnoreFriend}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="notifications-outline" size={52} color={colors.textTertiary || '#94a3b8'} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No notifications yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  markAllText: { fontSize: 13, fontWeight: '600' },

  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  rowContent: { flex: 1, justifyContent: 'center', gap: 6 },
  rowText: { fontSize: 14, lineHeight: 20 },
  actorName: { fontWeight: '700' },
  rowTime: { fontSize: 12 },

  friendActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  acceptBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  acceptBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  ignoreBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  ignoreBtnText: { fontSize: 13, fontWeight: '600' },

  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 10,
    flexShrink: 0,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
    alignSelf: 'center',
    marginLeft: 2,
  },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
});
