import { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { friendsAPI } from '../../lib/api';

const BRAND = '#6B63F5';

const AVATAR_COLORS = ['#f97316','#3b82f6','#8b5cf6','#10b981','#ec4899','#06b6d4','#a855f7','#84cc16'];
function getAvatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + (name.codePointAt(i) ?? 0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const FALLBACK_INTERESTS = [
  ['📚 Books', '✈️ Travel'],
  ['💻 Tech', '🎵 Music'],
  ['🍜 Food', '🎬 Film'],
  ['💪 Fitness', '✈️ Travel'],
  ['🎨 Art', '🎵 Music'],
  ['🏕️ Outdoors', '📸 Photo'],
  ['🎮 Gaming', '💻 Tech'],
  ['🍜 Food', '📚 Books'],
];

// ── Match ring (same as FriendsScreen) ───────────────────────────────────────
function MatchRing({ pct }) {
  const size   = 54;
  const stroke = 3.5;
  const deg    = (pct / 100) * 360;
  let color = '#a5b4fc';
  if (pct >= 80) color = BRAND;
  else if (pct >= 60) color = '#818cf8';

  return (
    <View style={[ring.wrap, { width: size, height: size }]}>
      <View style={[ring.track, { width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: '#e0e0ff' }]} />
      <View style={[ring.half, ring.halfLeft, { width: size / 2, height: size, borderTopLeftRadius: size / 2, borderBottomLeftRadius: size / 2 }]}>
        <View style={[ring.sector, {
          width: size / 2, height: size,
          borderTopLeftRadius: size / 2, borderBottomLeftRadius: size / 2,
          borderWidth: stroke, borderColor: deg >= 180 ? color : 'transparent', borderRightWidth: 0,
        }]} />
      </View>
      <View style={[ring.half, ring.halfRight, { width: size / 2, height: size, borderTopRightRadius: size / 2, borderBottomRightRadius: size / 2 }]}>
        <View style={[ring.sector, {
          width: size / 2, height: size,
          borderTopRightRadius: size / 2, borderBottomRightRadius: size / 2,
          borderWidth: stroke, borderColor: deg > 0 ? color : 'transparent', borderLeftWidth: 0,
          transform: [{ rotate: deg < 180 ? `${deg - 180}deg` : '0deg' }],
        }]} />
      </View>
      <View style={ring.label}>
        <Text style={[ring.pct, { color }]}>{pct}%</Text>
        <Text style={ring.matchText}>MATCH</Text>
      </View>
    </View>
  );
}

const ring = StyleSheet.create({
  wrap:      { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  track:     { position: 'absolute' },
  half:      { position: 'absolute', top: 0, overflow: 'hidden' },
  halfLeft:  { left: 0 },
  halfRight: { right: 0 },
  sector:    { position: 'absolute', top: 0 },
  label:     { alignItems: 'center', justifyContent: 'center' },
  pct:       { fontSize: 12, fontWeight: '800', lineHeight: 14 },
  matchText: { fontSize: 7, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5 },
});

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user, size = 52 }) {
  const name = `${user?.first_name || ''}${user?.last_name || ''}`;
  const initials = ((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')).toUpperCase() || '?';
  return (
    <View style={[av.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: getAvatarColor(name) }]}>
      <Text style={[av.initials, { fontSize: size * 0.34 }]}>{initials}</Text>
    </View>
  );
}

const av = StyleSheet.create({
  circle:   { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontWeight: '800' },
});

// ── Interest tag ──────────────────────────────────────────────────────────────
function Tag({ label, isDark }) {
  return (
    <View style={[tagStyle.wrap, { backgroundColor: isDark ? '#2a2560' : '#ede9fe' }]}>
      <Text style={tagStyle.text}>{label}</Text>
    </View>
  );
}

const tagStyle = StyleSheet.create({
  wrap: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  text: { fontSize: 12, color: BRAND, fontWeight: '600' },
});

// ── Request card ──────────────────────────────────────────────────────────────
function RequestCard({ item, onAccept, onDecline, colors, isDark }) {
  const [status, setStatus] = useState('pending');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const user       = item.sender || item.user || {};
  const matchPct   = item.match_percentage ?? item.compatibility_score ?? Math.floor(40 + Math.abs((user.id ?? 0) * 17) % 56);
  const mutualCount = item.mutual_friends_count ?? item.mutual_friends ?? 0;
  const sentAt     = timeAgo(item.created_at || item.sent_at);

  const raw = item.top_categories || item.categories || user.top_categories || [];
  const interests = raw.length > 0
    ? raw.slice(0, 3).map(c => (typeof c === 'string' ? c : c.name || c.emoji_label || c.label || ''))
    : FALLBACK_INTERESTS[Math.abs(user.id ?? 0) % FALLBACK_INTERESTS.length];

  async function handleAccept() {
    setStatus('accepting');
    try {
      await onAccept(item.id);
      setStatus('accepted');
    } catch {
      setStatus('pending');
    }
  }

  async function handleDecline() {
    setStatus('declining');
    try {
      await onDecline(item.id);
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    } catch {
      setStatus('pending');
    }
  }

  if (status === 'accepted') {
    return (
      <View style={[card.wrap, { backgroundColor: isDark ? '#0d2818' : '#f0fdf4', borderColor: '#bbf7d0' }]}>
        <Avatar user={user} size={48} />
        <View style={card.info}>
          <Text style={[card.name, { color: colors.textPrimary }]}>{user.first_name} {user.last_name}</Text>
          <View style={card.acceptedRow}>
            <Icon name="checkmark-circle" size={14} color="#22c55e" />
            <Text style={card.acceptedText}>Friends now!</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={[card.wrap, { backgroundColor: isDark ? colors.cardBackground : '#fff', borderColor: colors.border }]}>

        {/* Row: avatar · info · match ring */}
        <View style={card.top}>
          <Avatar user={user} size={52} />

          <View style={card.info}>
            <Text style={[card.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {user.first_name} {user.last_name}
            </Text>
            <Text style={[card.username, { color: colors.textTertiary }]} numberOfLines={1}>
              @{user.username}
            </Text>

            {/* Interest tags */}
            <View style={card.tags}>
              {interests.filter(Boolean).map(label => (
                <Tag key={label} label={label} isDark={isDark} />
              ))}
            </View>

            {/* Meta: mutual friends · time */}
            <View style={card.metaRow}>
              {mutualCount > 0 && (
                <>
                  <Icon name="people-outline" size={11} color={colors.textTertiary} />
                  <Text style={[card.meta, { color: colors.textTertiary }]}>{mutualCount} mutual</Text>
                  <Text style={[card.dot, { color: colors.textTertiary }]}>·</Text>
                </>
              )}
              <Text style={[card.meta, { color: colors.textTertiary }]}>{sentAt}</Text>
            </View>
          </View>

          <MatchRing pct={matchPct} />
        </View>

        {/* Accept / Decline buttons */}
        <View style={card.buttons}>
          <TouchableOpacity
            style={[card.acceptBtn, { backgroundColor: BRAND, opacity: status === 'accepting' ? 0.7 : 1 }]}
            onPress={handleAccept}
            disabled={status !== 'pending'}
            activeOpacity={0.8}
          >
            {status === 'accepting'
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Icon name="checkmark" size={15} color="#fff" /><Text style={card.acceptText}>Accept</Text></>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[card.declineBtn, { backgroundColor: isDark ? colors.cardBackground : '#f3f4f6', borderColor: colors.border, opacity: status === 'declining' ? 0.7 : 1 }]}
            onPress={handleDecline}
            disabled={status !== 'pending'}
            activeOpacity={0.8}
          >
            {status === 'declining'
              ? <ActivityIndicator size="small" color={colors.textSecondary} />
              : <><Icon name="close" size={15} color={colors.textSecondary} /><Text style={[card.declineText, { color: colors.textSecondary }]}>Decline</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const card = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  top:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info:     { flex: 1, gap: 4 },
  name:     { fontSize: 16, fontWeight: '700' },
  username: { fontSize: 13 },
  tags:     { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meta:     { fontSize: 11 },
  dot:      { fontSize: 11 },
  buttons:  { flexDirection: 'row', gap: 10 },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12,
  },
  acceptText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  declineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
  },
  declineText:  { fontSize: 14, fontWeight: '600' },
  acceptedRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  acceptedText: { fontSize: 13, color: '#22c55e', fontWeight: '600' },
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function FriendRequestsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await friendsAPI.requests();
      setRequests(res?.data?.requests ?? []);
    } catch (e) {
      setError(e?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const handleAccept = useCallback(async (id) => {
    await friendsAPI.acceptRequest(id);
  }, []);

  const handleDecline = useCallback(async (id) => {
    await friendsAPI.rejectRequest(id);
    const removeById = (prev) => prev.filter(r => r.id !== id);
    setTimeout(() => setRequests(removeById), 300);
  }, []);

  const pendingCount = requests.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Friend Requests</Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
        <View style={{ width: 26 }} />
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      )}

      {!loading && error && (
        <View style={styles.centered}>
          <Icon name="wifi-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 12 }]}>Something went wrong</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: BRAND }]} onPress={() => load()}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={requests}
          keyExtractor={item => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} colors={[BRAND]} />
          }
          ListHeaderComponent={
            pendingCount > 0 ? (
              <Text style={[styles.subheading, { color: colors.textSecondary }]}>
                {pendingCount} {pendingCount === 1 ? 'person wants' : 'people want'} to connect with you
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <RequestCard
              item={item}
              colors={colors}
              isDark={isDark}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="people-outline" size={56} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No pending requests</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                When someone sends you a friend request it'll appear here.
              </Text>
            </View>
          }
        />
      )}
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:  { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  badge: {
    backgroundColor: BRAND,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText:  { color: '#fff', fontSize: 11, fontWeight: '700' },
  list:       { paddingTop: 16, paddingBottom: 40 },
  subheading: { fontSize: 13, marginHorizontal: 16, marginBottom: 14 },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  empty:      { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySub:   { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn:   { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
});
