import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { notificationsAPI, friendsAPI } from '../../lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)  return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 172800) return 'Yesterday';
  return `${Math.floor(diff / 86400)}d`;
}

function sectionFor(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = diff / 3600000;
  if (hours < 3) return 'NEW';
  if (hours < 24) return 'EARLIER TODAY';
  if (hours < 48) return 'YESTERDAY';
  return 'EARLIER';
}

// Map API notification → shape the UI row expects
function normalise(n) {
  const d = n.data || {};
  return {
    id:              String(n.id),
    _raw:            n,
    section:         sectionFor(n.created_at),
    type:            n.type,
    actorId:         d.actor_id    || null,
    actorName:       d.actor_name  || null,
    actorAvatar:     d.actor_avatar|| null,
    actorInitials:   d.actor_name  ? d.actor_name.split(' ').map(w => w[0]).join('').slice(0, 2) : null,
    actorBgColor:    ACTOR_COLORS[n.type] || '#94a3b8',
    actorEmoji:      d.actor_emoji || null,
    message:         d.message     || '',
    time:            timeAgo(n.created_at),
    read:            !!n.read_at,
    thumbnailColor:  d.thumbnail_color || null,
  };
}

const ACTOR_COLORS = {
  like:           '#f97316',
  save:           '#3b82f6',
  comment:        '#0ea5e9',
  follow:         '#10b981',
  friend_request: '#10b981',
  group_save:     '#a855f7',
  share:          '#ec4899',
  birthday:       '#f59e0b',
  milestone:      '#6366f1',
};

const SECTIONS = ['NEW', 'EARLIER TODAY', 'YESTERDAY', 'EARLIER'];

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
    <View style={[styles.avatar, { backgroundColor: item.actorBgColor }]}>
      <Text style={styles.avatarText}>{item.actorInitials || '?'}</Text>
    </View>
  );
}

// ── Single row ────────────────────────────────────────────────────────────────
function NotifRow({ item, colors, onAcceptFriend, onIgnoreFriend, onMarkRead }) {
  const isFriendRequest = item.type === 'friend_request';
  const rowBg = item.read ? (colors.background || '#fff') : (colors.cardBackground || '#f8faff');

  const textNode = item.actorName
    ? <Text style={[styles.rowText, { color: colors.textPrimary }]}>
        <Text style={styles.actorName}>{item.actorName}</Text>{' '}{item.message}
      </Text>
    : <Text style={[styles.rowText, { color: colors.textPrimary }]}>{item.message}</Text>;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[styles.row, { backgroundColor: rowBg }]}
      onPress={() => { if (!item.read) onMarkRead(item.id); }}
    >
      <Avatar item={item} />

      <View style={styles.rowContent}>
        {textNode}
        <Text style={[styles.rowTime, { color: colors.textTertiary || '#94a3b8' }]}>{item.time}</Text>

        {isFriendRequest && (
          <View style={styles.friendActions}>
            <TouchableOpacity style={styles.acceptBtn} activeOpacity={0.8} onPress={() => onAcceptFriend(item)}>
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ignoreBtn, { borderColor: colors.border || '#e2e8f0' }]}
              activeOpacity={0.8}
              onPress={() => onIgnoreFriend(item)}
            >
              <Text style={[styles.ignoreBtnText, { color: colors.textPrimary }]}>Ignore</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!isFriendRequest && item.thumbnailColor && (
        <View style={[styles.thumbnail, { backgroundColor: item.thumbnailColor }]} />
      )}

      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [error, setError]                 = useState(null);
  const loadingRef = useRef(false);

  const load = useCallback(async (isRefresh = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res  = await notificationsAPI.list();
      const items = (res?.data?.notifications ?? res?.notifications ?? []).map(normalise);
      setNotifications(items);
    } catch (err) {
      setError('Could not load notifications.');
      console.warn('NotificationsScreen load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRefresh = () => load(true);

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await notificationsAPI.markAllAsRead(); } catch { /* silent */ }
  };

  const handleMarkRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try { await notificationsAPI.markAsRead(id); } catch { /* silent */ }
  };

  const handleAcceptFriend = async (item) => {
    setNotifications(prev => prev.filter(n => n.id !== item.id));
    try {
      // Find the pending friend request using the actor_id stored in the notification
      const reqs = await friendsAPI.requests();
      const request = (reqs?.data?.requests ?? reqs?.requests ?? [])
        .find(r => r.sender?.id === item.actorId || r.user_id === item.actorId);
      if (request) await friendsAPI.acceptRequest(request.id);
    } catch { /* silent */ }
  };

  const handleIgnoreFriend = async (item) => {
    setNotifications(prev => prev.filter(n => n.id !== item.id));
    try {
      const reqs = await friendsAPI.requests();
      const request = (reqs?.data?.requests ?? reqs?.requests ?? [])
        .find(r => r.sender?.id === item.actorId || r.user_id === item.actorId);
      if (request) await friendsAPI.rejectRequest(request.id);
    } catch { /* silent */ }
  };

  const grouped  = groupBySection(notifications);
  const listItems = [];
  for (const group of grouped) {
    listItems.push({ key: `section_${group.title}`, isHeader: true, title: group.title });
    for (const item of group.data) {
      listItems.push({ key: item.id, isHeader: false, item });
    }
  }

  const bg     = isDark ? (colors.background || '#0f172a') : '#f1f5f9';
  const cardBg = isDark ? (colors.cardBackground || '#1e293b') : '#ffffff';

  let body;
  if (loading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary || '#6366f1'} />
      </View>
    );
  } else if (error) {
    body = (
      <View style={styles.center}>
        <Icon name="cloud-offline-outline" size={48} color={colors.textTertiary || '#94a3b8'} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{error}</Text>
        <TouchableOpacity onPress={() => load()} style={styles.retryBtn}>
          <Text style={{ color: colors.primary || '#6366f1', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    body = (
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
            <View style={styles.center}>
              <Icon name="notifications-outline" size={52} color={colors.textTertiary || '#94a3b8'} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No notifications yet</Text>
            </View>
          }
        />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: bg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-back" size={22} color={colors.primary || '#6366f1'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary || '#0f172a' }]}>Activity</Text>
        <TouchableOpacity onPress={handleMarkAllRead} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.markAllText, { color: colors.primary || '#6366f1' }]}>Mark all read</Text>
        </TouchableOpacity>
      </View>
      {body}
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
  headerTitle:  { fontSize: 18, fontWeight: '700' },
  markAllText:  { fontSize: 13, fontWeight: '600' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 },
  retryBtn: { marginTop: 4, paddingVertical: 8, paddingHorizontal: 20 },

  sectionHeader: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase',
  },

  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 13, gap: 12,
  },

  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  rowContent: { flex: 1, justifyContent: 'center', gap: 4 },
  rowText:    { fontSize: 14, lineHeight: 20 },
  actorName:  { fontWeight: '700' },
  rowTime:    { fontSize: 12 },

  friendActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  acceptBtn: {
    backgroundColor: '#6366f1', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 7,
  },
  acceptBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  ignoreBtn: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 7,
  },
  ignoreBtnText: { fontSize: 13, fontWeight: '600' },

  thumbnail: { width: 44, height: 44, borderRadius: 10, flexShrink: 0 },

  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#6366f1', alignSelf: 'center', marginLeft: 2,
  },

  emptyTitle: { fontSize: 18, fontWeight: '700' },
});
