import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Loading } from '../../components/ui';
import PreferenceCard from '../../components/preferences/PreferenceCard';
import { feedAPI, notificationsAPI, friendsAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Dummy story data ─────────────────────────────────────────────────────────
const RING_COLORS = [
  '#f97316', '#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ec4899',
];

const DUMMY_STORY_GROUPS = [
  {
    user: { id: 1, first_name: 'Sarah', name: 'Sarah Chen' },
    all_viewed: false,
    stories: [
      {
        id: 101, emoji: '📚', title: 'The Midnight Library', author: 'Matt Haig',
        category: 'Books', rating: 4.9,
        quote: 'This book changed how I think about the choices we make. Absolutely beautiful.',
        caption: 'Currently reading and absolutely hooked! 📖',
        views_count: 24, created_at: Date.now() - 1000 * 60 * 5,
        viewers: [
          { id: 2, name: 'Alex', time: '2m ago' },
          { id: 3, name: 'Jordan', time: '4m ago' },
        ],
      },
      {
        id: 102, emoji: '☕', title: 'Blue Bottle Coffee', author: 'Oakland, CA',
        category: 'Coffee', rating: 4.7,
        quote: 'The single origin Ethiopia pour-over is transcendent.',
        caption: 'My morning ritual ☕',
        views_count: 18, created_at: Date.now() - 1000 * 60 * 30,
        viewers: [{ id: 4, name: 'Emma', time: '25m ago' }],
      },
    ],
  },
  {
    user: { id: 2, first_name: 'Alex', name: 'Alex Rivera' },
    all_viewed: false,
    stories: [
      {
        id: 201, emoji: '🎵', title: 'After Hours', author: 'The Weeknd',
        category: 'Music', rating: 4.8,
        quote: "Blinding Lights still gives me chills every single time.",
        caption: 'Album of the decade, no debate 🔥',
        views_count: 41, created_at: Date.now() - 1000 * 60 * 15,
        viewers: [
          { id: 1, name: 'Sarah', time: '10m ago' },
          { id: 3, name: 'Jordan', time: '12m ago' },
          { id: 5, name: 'Marcus', time: '14m ago' },
        ],
      },
    ],
  },
  {
    user: { id: 3, first_name: 'Jordan', name: 'Jordan Kim' },
    all_viewed: true,
    stories: [
      {
        id: 301, emoji: '🍜', title: 'Momofuku Noodle Bar', author: 'New York',
        category: 'Food', rating: 4.6,
        quote: 'The pork belly ramen is life-changing. Worth every penny.',
        caption: 'Best bowl I have had all year 🍜',
        views_count: 33, created_at: Date.now() - 1000 * 60 * 60 * 2,
        viewers: [],
      },
    ],
  },
  {
    user: { id: 4, first_name: 'Emma', name: 'Emma Walsh' },
    all_viewed: false,
    stories: [
      {
        id: 401, emoji: '🎬', title: 'Dune: Part Two', author: 'Denis Villeneuve',
        category: 'Movies', rating: 4.9,
        quote: 'Visually stunning. The sandworm scenes are unlike anything else.',
        caption: 'Go see this in IMAX. Trust me.',
        views_count: 57, created_at: Date.now() - 1000 * 60 * 45,
        viewers: [{ id: 5, name: 'Marcus', time: '40m ago' }],
      },
      {
        id: 402, emoji: '🧘', title: 'Headspace', author: 'Meditation App',
        category: 'Wellness', rating: 4.5,
        quote: '10 minutes a day has genuinely changed my mornings.',
        caption: 'My anxiety toolkit 🌿',
        views_count: 29, created_at: Date.now() - 1000 * 60 * 50,
        viewers: [],
      },
    ],
  },
  {
    user: { id: 5, first_name: 'Marcus', name: 'Marcus Lee' },
    all_viewed: false,
    stories: [
      {
        id: 501, emoji: '🏋️', title: 'Atom Gym', author: 'Brooklyn, NY',
        category: 'Fitness', rating: 4.7,
        quote: 'Great equipment, zero egos. This is my second home.',
        caption: 'Found my gym 💪',
        views_count: 19, created_at: Date.now() - 1000 * 60 * 20,
        viewers: [],
      },
    ],
  },
];

// ─── Stories Strip ────────────────────────────────────────────────────────────
function ringBorderColor({ isYou, viewed, ringColor, colors }) {
  if (isYou) return { borderColor: colors.primary, borderStyle: 'dashed' };
  if (viewed) return { borderColor: colors.textSecondary };
  return { borderColor: ringColor };
}

function StoryBubble({ group, index, isYou, onPress, colors, isDark }) {
  const ringColor = RING_COLORS[index % RING_COLORS.length];
  const name = isYou ? 'Your Story' : (group.user.first_name || group.user.name);
  const initial = name[0].toUpperCase();
  const viewed = !isYou && group.all_viewed;

  return (
    <TouchableOpacity style={storyStyles.bubble} onPress={onPress} activeOpacity={0.8}>
      <View style={[storyStyles.ringOuter, ringBorderColor({ isYou, viewed, ringColor, colors })]}>
        {isYou ? (
          <View style={[storyStyles.avatar, { backgroundColor: isDark ? colors.cardBackground : '#f0f0f5' }]}>
            <Icon name="add" size={24} color={colors.primary} />
          </View>
        ) : (
          <View style={[storyStyles.avatar, { backgroundColor: viewed ? colors.border : ringColor }]}>
            <Text style={storyStyles.initial}>{initial}</Text>
          </View>
        )}
      </View>
      <Text style={[storyStyles.label, { color: colors.textSecondary }]} numberOfLines={1}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

function StoriesStrip({ colors, isDark, navigation }) {
  const handleYouPress = () => {
    navigation.navigate('CreateStory', { onCreated: () => {} });
  };

  const handleGroupPress = (group) => {
    navigation.navigate('StoryViewer', {
      groups: DUMMY_STORY_GROUPS,
      startUserId: group.user.id,
    });
  };

  return (
    <View style={[storyStyles.strip, { borderBottomColor: colors.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={storyStyles.scroll}>
        {/* Your Story bubble */}
        <StoryBubble
          isYou
          index={0}
          onPress={handleYouPress}
          colors={colors}
          isDark={isDark}
        />
        {/* Friend story bubbles */}
        {DUMMY_STORY_GROUPS.map((group, index) => (
          <StoryBubble
            key={group.user.id}
            group={group}
            index={index + 1}
            onPress={() => handleGroupPress(group)}
            colors={colors}
            isDark={isDark}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const storyStyles = StyleSheet.create({
  strip: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
    paddingTop: 4,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 14,
  },
  bubble: {
    alignItems: 'center',
    width: 68,
  },
  ringOuter: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 66,
  },
});

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
        const dayWord   = b.days_until === 1 ? 'day' : 'days';
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
    }).catch(() => {});
    friendsAPI.getBirthdays().then(res => {
      if (res.success) setBirthdays(res.data.birthdays || []);
    }).catch(() => {});
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
          source={require('../../../assets/logo_icon.png')}
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
      <StoriesStrip colors={colors} isDark={isDark} navigation={navigation} />

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
  list: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 100 },

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
