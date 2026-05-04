import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Loading } from '../../components/ui';
import PreferenceCard from '../../components/preferences/PreferenceCard';
import StoriesRow from '../../components/stories/StoriesRow';
import { feedAPI, notificationsAPI, friendsAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';


// ─── Birthday Strip ────────────────────────────────────────────────────────────
function BirthdayStrip({ birthdays, colors, isDark, onWish, onPress }) {
  if (!birthdays || birthdays.length === 0) return null;

  return (
    <View style={[bdayStyles.section, { backgroundColor: isDark ? '#2d1f3d' : '#fdf4ff', borderColor: '#c084fc' }]}>
      <View style={bdayStyles.header}>
        <Text style={bdayStyles.cake}>🎂</Text>
        <Text style={[bdayStyles.title, { color: colors.textPrimary }]}>Upcoming Birthdays</Text>
      </View>
      {birthdays.map(b => {
        const dayWord = b.days_until === 1 ? 'day' : 'days';
        const whenLabel = b.is_today
          ? "🎉 It's their birthday today!"
          : `🗓 In ${b.days_until} ${dayWord}`;
        return (
          <TouchableOpacity
            key={b.id}
            style={[bdayStyles.card, {
              backgroundColor: isDark ? '#3b2952' : '#fff',
              borderColor: b.is_today ? '#c084fc' : colors.border,
            }]}
            onPress={() => onPress(b)}
            activeOpacity={0.8}
          >
            <View style={bdayStyles.left}>
              <View style={[bdayStyles.avatar, { backgroundColor: b.is_today ? '#c084fc' : colors.primary }]}>
                <Text style={bdayStyles.avatarText}>{(b.first_name || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={bdayStyles.info}>
                <View style={bdayStyles.nameRow}>
                  <Text style={[bdayStyles.name, { color: colors.textPrimary }]}>{b.first_name} {b.last_name}</Text>
                  {b.is_today && (
                    <View style={bdayStyles.todayBadge}>
                      <Text style={bdayStyles.todayBadgeText}>Today!</Text>
                    </View>
                  )}
                </View>
                <Text style={[bdayStyles.when, { color: colors.textSecondary }]}>{whenLabel}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[bdayStyles.wishBtn, { backgroundColor: b.is_today ? '#c084fc' : colors.primary }]}
              onPress={() => onWish(b)}
              activeOpacity={0.8}
            >
              <Text style={bdayStyles.wishText}>{b.is_today ? '🎉 Wish' : '💬 Chat'}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const bdayStyles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cake: { fontSize: 20 },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    marginBottom: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 14, fontWeight: '600' },
  todayBadge: { backgroundColor: '#c084fc', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  todayBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  when: { fontSize: 12, marginTop: 2 },
  wishBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginLeft: 8 },
  wishText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FeedScreen({ navigation }) {
  const { colors, isDark } = useTheme();

  const [preferences, setPreferences] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [birthdays, setBirthdays] = useState([]);

  useEffect(() => {
    loadFeed(1);
    notificationsAPI.getUnreadCount().then(res => {
      if (res.success) setUnreadCount(res.data?.count ?? 0);
    }).catch(() => { });
    friendsAPI.getBirthdays().then(res => {
      if (res.success) setBirthdays(res.data.birthdays || []);
    }).catch(() => { });
  }, []);

  const loadFeed = async (page = 1) => {
    try {
      const res = await feedAPI.getFeed(page);
      if (res.success) {
        const items = res.data?.preferences || [];
        const pagination = res.data?.pagination || {};
        setPreferences(prev => page === 1 ? items : [...prev, ...items]);
        setCurrentPage(pagination.current_page || page);
        setTotalPages(pagination.total_pages || 1);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed(1);
    setRefreshing(false);
  };

  const onEndReached = async () => {
    if (loadingMore || currentPage >= totalPages) return;
    setLoadingMore(true);
    await loadFeed(currentPage + 1);
    setLoadingMore(false);
  };

  if (initialLoading) return <Loading fullScreen />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('../../../assets/logo_text.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <Icon name="notifications-outline" size={24} color={colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate('Messages')}
            activeOpacity={0.7}
          >
            <Icon name="chatbubble-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stories */}
      <StoriesRow navigation={navigation} />

      {/* Birthday strip */}
      <BirthdayStrip
        birthdays={birthdays}
        colors={colors}
        isDark={isDark}
        onWish={(b) => navigation.navigate('Chat', {
          userId: b.id, user: b,
          prefilledMessage: `Happy Birthday ${b.first_name}! 🎂🎉`,
        })}
        onPress={(b) => navigation.navigate('Profile', { username: b.username })}
      />

      {/* Feed */}
      <FlatList
        style={{ backgroundColor: "#F2F2F7" }}
        data={preferences}
        renderItem={({ item }) => <PreferenceCard preference={item} onUpdate={() => loadFeed(1)} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? <Loading /> : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '15' }]}>
              <Icon name="layers-outline" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Nothing here yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Create your first preference or follow friends to fill your feed!
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('PreferenceCreate')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyBtnText}>Create Preference</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={() => navigation.navigate('PreferenceCreate')}
        activeOpacity={0.8}
      >
        <Icon name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  logoImage: { width: 100, height: 40 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: 2, right: 2,
    minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  profileInitial: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  profileInitialText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  /* List */
  list: { paddingTop: 8, paddingBottom: 10 },

  /* Empty */
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, marginBottom: 8 },
  emptySubtext: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  /* FAB */
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, zIndex: 100,
  },
});
