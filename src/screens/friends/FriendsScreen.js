import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Share, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Loading } from '../../components/ui';
import { friendsAPI } from '../../lib/api';
import { useSocket } from '../../contexts/SocketContext';
import { useTheme } from '../../contexts/ThemeContext';

const BRAND = '#6B63F5';

// ─── Circular match ring ──────────────────────────────────────────────────────
function MatchRing({ pct }) {
  const size   = 56;
  const stroke = 3.5;
  const deg    = (pct / 100) * 360;
  let color;
  if (pct >= 80) color = BRAND;
  else if (pct >= 60) color = '#818cf8';
  else color = '#a5b4fc';

  return (
    <View style={[ring.wrap, { width: size, height: size }]}>
      {/* Track */}
      <View style={[ring.track, { width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: '#e0e0ff' }]} />
      {/* Fill — left half */}
      <View style={[ring.half, ring.halfLeft, { width: size / 2, height: size, borderTopLeftRadius: size / 2, borderBottomLeftRadius: size / 2 }]}>
        <View style={[
          ring.sector,
          {
            width: size / 2, height: size,
            borderTopLeftRadius: size / 2,
            borderBottomLeftRadius: size / 2,
            borderWidth: stroke,
            borderColor: deg >= 180 ? color : 'transparent',
            borderRightWidth: 0,
          },
        ]} />
      </View>
      {/* Fill — right half */}
      <View style={[ring.half, ring.halfRight, { width: size / 2, height: size, borderTopRightRadius: size / 2, borderBottomRightRadius: size / 2 }]}>
        <View style={[
          ring.sector,
          {
            width: size / 2, height: size,
            borderTopRightRadius: size / 2,
            borderBottomRightRadius: size / 2,
            borderWidth: stroke,
            borderColor: deg > 0 ? color : 'transparent',
            borderLeftWidth: 0,
            transform: [{ rotate: deg < 180 ? `${deg - 180}deg` : '0deg' }],
          },
        ]} />
      </View>
      {/* Inner label */}
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
  pct:       { fontSize: 13, fontWeight: '800', lineHeight: 15 },
  matchText: { fontSize: 7, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5 },
});

// ─── Avatar with initials + online dot ───────────────────────────────────────
const AVATAR_COLORS = ['#f97316','#3b82f6','#8b5cf6','#10b981','#ec4899','#06b6d4','#a855f7','#84cc16'];
function getAvatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + (name.codePointAt(i) ?? 0)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function UserAvatar({ user, size = 52, isOnline }) {
  const name   = `${user?.first_name || ''}${user?.last_name || ''}`;
  const initials = ((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')).toUpperCase() || '?';
  const bg     = getAvatarColor(name);
  return (
    <View style={{ width: size, height: size }}>
      <View style={[av.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
        <Text style={[av.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
      </View>
      {isOnline && (
        <View style={[av.dot, { width: 11, height: 11, borderRadius: 6, bottom: 1, right: 1 }]} />
      )}
    </View>
  );
}

const av = StyleSheet.create({
  circle:   { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontWeight: '700' },
  dot:      { position: 'absolute', backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff' },
});

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

// ─── Interest tag ─────────────────────────────────────────────────────────────
function Tag({ label, isDark }) {
  return (
    <View style={[tag.wrap, { backgroundColor: isDark ? '#2a2560' : '#ede9fe' }]}>
      <Text style={tag.text}>{label}</Text>
    </View>
  );
}

const tag = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  text: { fontSize: 12, color: BRAND, fontWeight: '600' },
});

// ─── Friend row ───────────────────────────────────────────────────────────────
function FriendRow({ item, isOnline, onPress, colors, isDark }) {
  const matchPct = item.match_percentage ?? Math.floor(40 + Math.abs(item.id * 17) % 56);

  // Resolve categories — fall back to deterministic dummy interests
  const raw = item.top_categories || item.categories || [];
  const interests = raw.length > 0
    ? raw.slice(0, 2).map(c => (typeof c === 'string' ? c : c.name || c.emoji_label || c.label || ''))
    : FALLBACK_INTERESTS[Math.abs(item.id) % FALLBACK_INTERESTS.length];

  return (
    <TouchableOpacity
      style={[row.wrap, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <UserAvatar user={item} size={52} isOnline={isOnline} />

      <View style={row.info}>
        <View style={row.nameRow}>
          <Text style={[row.name, { color: colors.textPrimary }]}>
            {item.first_name} {item.last_name}
          </Text>
          {isOnline && <View style={row.onlineDot} />}
        </View>
        <View style={row.tags}>
          {interests.map(label => (
            <Tag key={label} label={label} isDark={isDark} />
          ))}
        </View>
      </View>

      <MatchRing pct={matchPct} />
    </TouchableOpacity>
  );
}

const row = StyleSheet.create({
  wrap:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  info:      { flex: 1, gap: 6 },
  nameRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name:      { fontSize: 16, fontWeight: '700' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  tags:      { flexDirection: 'row', gap: 6 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function FriendsScreen({ navigation }) {
  const { onlineUsers }  = useSocket();
  const { colors, isDark } = useTheme();

  const [friends, setFriends]     = useState([]);
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');

  useFocusEffect(useCallback(() => { load(); }, []));

  const load = async () => {
    try {
      const [fRes, rRes] = await Promise.all([friendsAPI.list(), friendsAPI.requests()]);
      if (fRes.success)  setFriends(fRes.data.friends || []);
      if (rRes.success)  setRequests(rRes.data.requests || []);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleInvite = () => {
    Share.share({ message: 'Join me on Unomi! Download the app and connect with me.' });
  };

  const filtered = friends.filter(f => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      f.first_name?.toLowerCase().includes(q) ||
      f.last_name?.toLowerCase().includes(q) ||
      f.username?.toLowerCase().includes(q)
    );
  });

  if (loading) return <Loading fullScreen />;

  // Build initials string for request banner avatars
  const reqNames = requests.slice(0, 2).map(r => r.user?.first_name || '?');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Friends</Text>
        <TouchableOpacity style={[styles.inviteBtn, { backgroundColor: isDark ? '#2a2560' : '#ede9fe' }]} onPress={handleInvite} activeOpacity={0.8}>
          <Icon name="person-add-outline" size={15} color={BRAND} />
          <Text style={styles.inviteBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={[styles.searchWrap, { backgroundColor: isDark ? colors.cardBackground : '#f3f4f6' }]}>
        <Icon name="search-outline" size={17} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search people, find friends..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* ── Friend requests banner — fixed above list ── */}
      {requests.length > 0 && (
        <TouchableOpacity
          style={[styles.reqBanner, { backgroundColor: isDark ? '#1e1a4a' : '#eeeeff' }]}
          onPress={() => navigation.navigate('FriendRequests')}
          activeOpacity={0.85}
        >
          <View style={styles.reqAvatars}>
            {reqNames.map((name, i) => (
              <View
                key={name}
                style={[styles.reqAvatar, {
                  backgroundColor: getAvatarColor(name),
                  marginLeft: i > 0 ? -12 : 0,
                  zIndex: reqNames.length - i,
                }]}
              >
                <Text style={styles.reqAvatarText}>{name[0].toUpperCase()}</Text>
              </View>
            ))}
          </View>
          <View style={styles.reqInfo}>
            <Text style={[styles.reqCount, { color: colors.textPrimary }]}>
              {requests.length} Friend Request{requests.length > 1 ? 's' : ''}
            </Text>
            <Text style={[styles.reqSub, { color: colors.textSecondary }]} numberOfLines={1}>
              {requests.slice(0, 2).map(r => r.user?.first_name).join(' and ')}
              {requests.length > 2 ? ` and ${requests.length - 2} more` : ' want to connect'}
            </Text>
          </View>
          <View style={styles.reviewBtn}>
            <Text style={styles.reviewBtnText}>Review</Text>
          </View>
        </TouchableOpacity>
      )}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={BRAND} colors={[BRAND]} />
        }
        ListHeaderComponent={
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Your Friends · {friends.length}
          </Text>
        }
        renderItem={({ item }) => (
          <FriendRow
            item={item}
            isOnline={onlineUsers?.has(item.id)}
            colors={colors}
            isDark={isDark}
            onPress={() => navigation.navigate('UserProfile', { username: item.username })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="people-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {search ? 'No results' : 'No friends yet'}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {search ? 'Try a different name' : 'Tap Invite to bring friends over'}
            </Text>
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  inviteBtnText: { fontSize: 14, fontWeight: '700', color: BRAND },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },

  // Request banner
  reqBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  reqAvatars: { flexDirection: 'row' },
  reqAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  reqAvatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  reqInfo: { flex: 1 },
  reqCount: { fontSize: 15, fontWeight: '700' },
  reqSub: { fontSize: 13, marginTop: 1 },
  reviewBtn: {
    backgroundColor: BRAND,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  reviewBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginHorizontal: 16,
    marginBottom: 4,
  },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center' },
});
