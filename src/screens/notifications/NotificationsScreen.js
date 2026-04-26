import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Loading } from '../../components/ui';
import { notificationsAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';

// ── Notification type config ──────────────────────────────────────────────────
const TYPE_CONFIG = {
  preference_created: {
    icon: 'bookmark',
    color: '#4f6ef7',
    label: (d) => `@${d.actor_username} added a new preference`,
    sub:   (d) => d.preference_title || '',
  },
  // legacy / other types
  like: {
    icon: 'heart',
    color: '#ef4444',
    label: (d) => `@${d.actor_username || 'Someone'} liked your preference`,
    sub:   (d) => d.preference_title || '',
  },
  comment: {
    icon: 'chatbubble',
    color: '#f59e0b',
    label: (d) => `@${d.actor_username || 'Someone'} commented on your preference`,
    sub:   (d) => d.comment || '',
  },
  follow: {
    icon: 'person-add',
    color: '#06b6d4',
    label: (d) => `@${d.actor_username || 'Someone'} started following you`,
    sub:   () => '',
  },
  friend_request: {
    icon: 'people',
    color: '#f97316',
    label: (d) => `@${d.actor_username || 'Someone'} sent you a friend request`,
    sub:   () => '',
  },
};

const FALLBACK_CONFIG = {
  icon: 'notifications',
  color: '#94a3b8',
  label: () => 'New notification',
  sub:   () => '',
};

// ── Single notification row ───────────────────────────────────────────────────
function NotifRow({ item, colors, isDark, onPress, onMarkRead }) {
  const data   = item.data || {};
  const config = TYPE_CONFIG[item.type] || FALLBACK_CONFIG;
  const isRead = item.read_at !== null;
  const readBg   = isDark ? colors.cardBackground : '#fff';
  const unreadBg = isDark ? config.color + '18' : config.color + '0d';
  const rowBg    = isRead ? readBg : unreadBg;

  const label = config.label(data);
  const sub   = config.sub(data);
  const time  = item.created_at
    ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
    : '';

  return (
    <TouchableOpacity
      style={[
        styles.row,
        { backgroundColor: rowBg, borderBottomColor: colors.border },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: config.color + '20' }]}>
        <Icon name={config.icon} size={20} color={config.color} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={2}>
          {label}
        </Text>
        {sub ? (
          <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
        <Text style={[styles.time, { color: colors.textTertiary }]}>{time}</Text>
      </View>

      {/* Unread dot + mark read */}
      <View style={styles.actions}>
        {!isRead && (
          <>
            <View style={[styles.unreadDot, { backgroundColor: config.color }]} />
            <TouchableOpacity
              onPress={() => onMarkRead(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginTop: 4 }}
            >
              <Icon name="checkmark" size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async ({ isRefresh = false } = {}) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await notificationsAPI.list();
      if (res.success) {
        setNotifications(res.data?.notifications || res.data || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      );
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    } catch { /* silent */ }
  };

  const handlePress = (item) => {
    // Mark as read on tap
    if (!item.read_at) handleMarkRead(item.id);

    const data = item.data || {};

    if (item.type === 'preference_created' && data.preference_id) {
      navigation.navigate('PreferenceDetail', { id: data.preference_id });
    } else if (item.type === 'follow' || item.type === 'friend_request') {
      if (data.actor_username) {
        navigation.navigate('UserProfile', { username: data.actor_username });
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  if (loading) return <Loading fullScreen />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Sub-header */}
      {unreadCount > 0 && (
        <View style={[styles.subHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.unreadLabel, { color: colors.textSecondary }]}>
            {unreadCount} unread
          </Text>
          <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
            <Text style={[styles.markAllBtn, { color: colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={item => item.id.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load({ isRefresh: true }); }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <NotifRow
            item={item}
            colors={colors}
            isDark={isDark}
            onPress={handlePress}
            onMarkRead={handleMarkRead}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="notifications-outline" size={52} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No notifications yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              When someone creates a preference or follows you, you'll see it here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  unreadLabel: { fontSize: 13 },
  markAllBtn: { fontSize: 13, fontWeight: '600' },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: { flex: 1, gap: 3 },
  label: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  sub: { fontSize: 13, lineHeight: 18 },
  time: { fontSize: 12, marginTop: 2 },

  actions: { alignItems: 'center', gap: 4, paddingTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
