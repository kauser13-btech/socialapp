import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Loading } from '../../components/ui';
import PreferenceCard from '../../components/preferences/PreferenceCard';
import { feedAPI, preferencesAPI, notificationsAPI, friendsAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

// ─── Birthday Strip ───────────────────────────────────────────────────────────
function BirthdayStrip({ birthdays, colors, isDark, onWish, onPress }) {
  if (!birthdays || birthdays.length === 0) return null;

  return (
    <View style={[bdayStyles.section, { backgroundColor: isDark ? '#2d1f3d' : '#fdf4ff', borderColor: '#c084fc' }]}>
      {/* Header */}
      <View style={bdayStyles.header}>
        <Text style={bdayStyles.cake}>🎂</Text>
        <Text style={[bdayStyles.title, { color: colors.textPrimary }]}>Upcoming Birthdays</Text>
      </View>

      {/* Cards */}
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


export default function FeedScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('forYou');
  const [preferences, setPreferences] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [birthdays, setBirthdays] = useState([]);

  useEffect(() => {
    loadFeed();
  }, [activeTab]);

  useEffect(() => {
    notificationsAPI.getUnreadCount().then(res => {
      if (res.success) setUnreadCount(res.data?.count ?? 0);
    }).catch(() => {});
    friendsAPI.getBirthdays().then(res => {
      if (res.success) setBirthdays(res.data.birthdays || []);
    }).catch(() => {});
  }, []);

  const loadFeed = async ({ isRefresh = false } = {}) => {
    try {
      if (!initialLoading && !isRefresh) setTabLoading(true);

      let response;
      if (activeTab === 'forYou') response = await feedAPI.getFeed();
      else if (activeTab === 'following') response = await feedAPI.getFollowingFeed();
      else if (activeTab === 'myPreference') response = await preferencesAPI.list();
      else if (activeTab === 'trending') response = await feedAPI.getTrending();
      else response = await feedAPI.getDiscover();

      if (response.success) {
        setPreferences(response.data.preferences || response.data || []);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setInitialLoading(false);
      setTabLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed({ isRefresh: true });
    setRefreshing(false);
  };

  const tabs = [
    { id: 'forYou', label: 'For You' },
    { id: 'following', label: 'Following' },
    { id: 'myPreference', label: 'My Preferences' },
    { id: 'trending', label: 'Trending' },
    { id: 'discover', label: 'Discover' },
  ];

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
          {/* Map */}
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate('Map')}
            activeOpacity={0.7}
          >
            <Icon name="map-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* Notification Bell */}
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

          {/* Profile Initial */}
          <TouchableOpacity
            style={[styles.profileInitial, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.profileInitialText}>
              {(user?.first_name || user?.name || '?')[0].toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Birthday strip */}
      <BirthdayStrip
        birthdays={birthdays}
        colors={colors}
        onWish={(b) => navigation.navigate('Chat', {
          userId: b.id,
          user: b,
          prefilledMessage: `Happy Birthday ${b.first_name}! 🎂🎉`,
        })}
        onPress={(b) => navigation.navigate('Profile', { username: b.username })}
      />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const inactiveBg = isDark ? colors.cardBackground : '#f3f4f6';
            const tabBg = isActive ? colors.primary : inactiveBg;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabPill, { backgroundColor: tabBg }]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.tabText, 
                  { color: isActive ? '#ffffff' : colors.textSecondary },
                  isActive && styles.tabTextActive
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {tabLoading && (
        <View style={styles.tabLoadingContainer}>
          <Loading />
        </View>
      )}
      {!tabLoading && (
        <FlatList
          data={preferences}
          renderItem={({ item }) => <PreferenceCard preference={item} onUpdate={loadFeed} />}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '15' }]}>
                <Icon name="layers-outline" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No preferences found</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                {activeTab === 'myPreference' && "You haven't shared any preferences yet."}
                {activeTab === 'following' && "Follow people to see their preferences here."}
                {activeTab !== 'myPreference' && activeTab !== 'following' && "Be the first to share your preferences in this section!"}
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
      )}

      {/* Floating Action Button */}
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
  container: { 
    flex: 1 
  },
  tabLoadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  /* Header Area */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  logoImage: {
    width: 100,
    height: 38,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  profileInitial: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitialText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 100,
  },

  /* Tabs */
  tabsContainer: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  tabsScroll: {
    paddingHorizontal: 24,
    gap: 10,
  },
  tabPill: { 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: { 
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    fontWeight: '600',
  },

  /* List & Cards */
  list: { 
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },

  /* Empty State */
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIconWrap: { 
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  emptySubtext: { 
    fontSize: 15, 
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  }
});
