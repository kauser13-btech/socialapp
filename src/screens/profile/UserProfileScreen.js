import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Avatar, Button, Loading } from '../../components/ui';
import PreferenceCard from '../../components/preferences/PreferenceCard';
import { userAPI, friendsAPI, analyticsAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../../constants/styles';

// ─── Score colour helper ───────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 70) return '#10b981'; // green
  if (score >= 40) return '#f59e0b'; // amber
  return '#ef4444';                   // red
}

// ─── Single signal bar ────────────────────────────────────────────────────
function SignalBar({ label, icon, value, colors }) {
  const color = scoreColor(value);
  return (
    <View style={compatStyles.signalRow}>
      <Icon name={icon} size={14} color={color} style={compatStyles.signalIcon} />
      <Text style={[compatStyles.signalLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[compatStyles.barTrack, { backgroundColor: colors.border }]}>
        <View style={[compatStyles.barFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={[compatStyles.signalValue, { color }]}>{value}%</Text>
    </View>
  );
}

// ─── Taste Match Card ─────────────────────────────────────────────────────
function TasteMatchCard({ compatibility, colors, userName }) {
  const { score, shared_interests = [], breakdown = {} } = compatibility;
  const color = scoreColor(score);

  const SIGNALS = [
    { label: 'Interests', icon: 'heart',    key: 'interests' },
    { label: 'Likes',     icon: 'thumbs-up', key: 'likes' },
    { label: 'Saves',     icon: 'bookmark',  key: 'saves' },
  ];

  return (
    <View style={[compatStyles.card, { backgroundColor: colors.cardBackground || colors.gray100, borderColor: colors.border }]}>
      {/* Header */}
      <View style={compatStyles.cardHeader}>
        <View style={[compatStyles.headerIcon, { backgroundColor: color + '18' }]}>
          <Icon name="sparkles" size={16} color={color} />
        </View>
        <Text style={[compatStyles.cardTitle, { color: colors.textPrimary }]}>Taste Match</Text>
        {userName ? (
          <Text style={[compatStyles.cardSubtitle, { color: colors.textSecondary }]}>with {userName}</Text>
        ) : null}
      </View>

      {/* Score ring + signals */}
      <View style={compatStyles.body}>
        {/* Circular score */}
        <View style={[compatStyles.scoreRing, { borderColor: color }]}>
          <Text style={[compatStyles.scoreNumber, { color }]}>{score}</Text>
          <Text style={[compatStyles.scorePercent, { color }]}>%</Text>
        </View>

        {/* Signal bars */}
        <View style={compatStyles.signals}>
          {SIGNALS.map(s => (
            <SignalBar
              key={s.key}
              label={s.label}
              icon={s.icon}
              value={breakdown[s.key] ?? 0}
              colors={colors}
            />
          ))}
        </View>
      </View>

      {/* Shared interest chips */}
      {shared_interests.length > 0 && (
        <View style={compatStyles.chipsSection}>
          <Text style={[compatStyles.chipsLabel, { color: colors.textSecondary }]}>
            Shared interests
          </Text>
          <View style={compatStyles.chips}>
            {shared_interests.slice(0, 5).map((interest) => (
              <View key={interest} style={[compatStyles.chip, { backgroundColor: color + '18', borderColor: color + '40' }]}>
                <Text style={[compatStyles.chipText, { color }]}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export default function UserProfileScreen({ route, navigation }) {
  const { username } = route.params;
  const { user: currentUser } = useAuth();
  const { colors } = useTheme();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [relationship, setRelationship] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [badgeTotalCount, setBadgeTotalCount] = useState(0);

  useEffect(() => { loadUser(); }, [username]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUser(username);
      if (response.success) {
        const loadedUser = response.data.user;
        setUser(loadedUser);
        setStats(response.data.stats);
        setRelationship(response.data.relationship);
        checkFriendshipStatus(loadedUser.id);
        loadPreferences();
        if (currentUser?.id !== loadedUser.id) {
          analyticsAPI.getCompatibility(loadedUser.id)
            .then(r => {
              console.log('[Compatibility]', JSON.stringify(r));
              if (r.success) setCompatibility(r.data);
            })
            .catch(e => console.error('[Compatibility error]', e));
        }
        analyticsAPI.getBadges(loadedUser.id)
          .then(r => {
            if (r.success) {
              setEarnedBadges((r.data.badges || []).filter(b => b.earned).slice(0, 5));
              setBadgeTotalCount(r.data.total_count ?? 0);
            }
          })
          .catch(() => {});
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await userAPI.getUserPreferences(username);
      if (response.success) setPreferences(response.data?.preferences || response.data || []);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const checkFriendshipStatus = async (userId) => {
    try {
      const [friendsRes, sentRes] = await Promise.all([
        friendsAPI.list(),
        friendsAPI.sentRequests(),
      ]);
      const friends = friendsRes?.data?.friends || [];
      if (friends.some(f => f.id === userId)) {
        setFriendshipStatus('friends');
        return;
      }
      const sent = sentRes?.data?.sent_requests || [];
      if (sent.some(r => r.friend_id === userId)) {
        setFriendshipStatus('pending');
        return;
      }
      setFriendshipStatus('none');
    } catch (error) {
      console.error('Error checking friendship:', error);
      setFriendshipStatus('none');
    }
  };

  const handleFollow = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      if (relationship?.is_following) {
        await userAPI.unfollow(user.username);
        setRelationship(prev => ({ ...prev, is_following: false }));
        setStats(prev => ({ ...prev, followers_count: (prev?.followers_count || 1) - 1 }));
      } else {
        await userAPI.follow(user.username);
        setRelationship(prev => ({ ...prev, is_following: true }));
        setStats(prev => ({ ...prev, followers_count: (prev?.followers_count || 0) + 1 }));
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update follow status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFriendRequest = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      if (friendshipStatus === 'none') {
        const res = await friendsAPI.sendRequest(user.id);
        // Backend auto-accepts if they already sent us a request
        if (res?.message === 'Friend request accepted') {
          setFriendshipStatus('friends');
          Alert.alert('Success', "You're now friends!");
        } else {
          setFriendshipStatus('pending');
          Alert.alert('Success', 'Friend request sent!');
        }
      } else if (friendshipStatus === 'friends') {
        Alert.alert('Remove Friend', `Are you sure you want to remove ${user.first_name} from your friends?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => {
            friendsAPI.remove(user.id)
              .then(() => setFriendshipStatus('none'))
              .catch(() => Alert.alert('Error', 'Failed to remove friend'));
          }},
        ]);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send friend request');
    } finally {
      setActionLoading(false);
    }
  };

  const getFullName = () => {
    if (!user) return '';
    return user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name || user.last_name || user.username;
  };

  const getFriendButtonText = () => ({ friends: 'Friends', pending: 'Pending' }[friendshipStatus] || 'Add Friend');
  const getFriendButtonVariant = () => ({ friends: 'secondary', pending: 'outline' }[friendshipStatus] || 'primary');

  if (loading) return <Loading fullScreen />;

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>User not found</Text>
          <Button onPress={() => navigation.goBack()}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  const isOwnProfile = currentUser?.id === user.id;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Avatar src={user.avatar_url} name={getFullName()} size="xlarge" />
          <Text style={[styles.name, { color: colors.textPrimary }]}>{getFullName()}</Text>
          <Text style={[styles.username, { color: colors.textSecondary }]}>@{user.username}</Text>
          {user.bio ? <Text style={[styles.bio, { color: colors.textPrimary }]}>{user.bio}</Text> : null}
          {user.location ? (
            <View style={styles.locationContainer}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={[styles.location, { color: colors.textSecondary }]}>{user.location}</Text>
            </View>
          ) : null}
          {stats && (
            <View style={styles.statsRow}>
              {[['Preferences', stats.preferences_count], ['Followers', stats.followers_count], ['Following', stats.following_count]].map(([label, val]) => (
                <View key={label} style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{val || 0}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
                </View>
              ))}
            </View>
          )}
          {!isOwnProfile && compatibility && (
            <TasteMatchCard compatibility={compatibility} colors={colors} userName={user.first_name} />
          )}
          {earnedBadges.length > 0 && (
            <TouchableOpacity
              style={[badgeStyles.card, { backgroundColor: colors.cardBackground || colors.gray100, borderColor: colors.border }]}
              onPress={() => navigation.navigate('Badges')}
              activeOpacity={0.8}
            >
              <View style={badgeStyles.header}>
                <Text style={[badgeStyles.title, { color: colors.textPrimary }]}>🏅 Badges</Text>
                <View style={badgeStyles.right}>
                  <Text style={[badgeStyles.count, { color: colors.primary }]}>
                    {earnedBadges.length} / {badgeTotalCount}
                  </Text>
                  <Icon name="chevron-forward" size={14} color={colors.textTertiary} />
                </View>
              </View>
              <View style={badgeStyles.row}>
                {earnedBadges.map(b => (
                  <View key={b.id} style={[badgeStyles.emoji, { backgroundColor: b.color + '20' }]}>
                    <Text style={badgeStyles.emojiText}>{b.icon}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          )}
          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              <Button style={styles.actionButton} variant={relationship?.is_following ? 'secondary' : 'primary'} onPress={handleFollow} loading={actionLoading} disabled={actionLoading}>
                {relationship?.is_following ? 'Following' : 'Follow'}
              </Button>
              <Button style={styles.actionButton} variant={getFriendButtonVariant()} onPress={handleFriendRequest} disabled={actionLoading || friendshipStatus === 'pending'}>
                {getFriendButtonText()}
              </Button>
              {friendshipStatus === 'friends' && (
                <Button style={styles.actionButton} variant="outline" onPress={() => navigation.navigate('Chat', { userId: user.id, user })}>
                  Message
                </Button>
              )}
            </View>
          )}
          {isOwnProfile && (
            <Button style={styles.editButton} variant="outline" onPress={() => navigation.navigate('Settings')}>
              Edit Profile
            </Button>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Preferences</Text>
          {preferences.length > 0 ? (
            preferences.map((preference) => (
              <PreferenceCard key={preference.id} preference={preference} onUpdate={loadPreferences} />
            ))
          ) : (
            <View style={[styles.emptySection, { backgroundColor: colors.gray100 }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No public preferences yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1 },
  name: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, marginTop: spacing.md },
  username: { fontSize: fontSize.md, marginTop: spacing.xs },
  bio: { fontSize: fontSize.md, textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.lg },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  locationIcon: { fontSize: fontSize.sm, marginRight: spacing.xs },
  location: { fontSize: fontSize.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: spacing.lg, paddingVertical: spacing.md },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  statLabel: { fontSize: fontSize.sm, marginTop: spacing.xs },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg, width: '100%' },
  actionButton: { minWidth: 100 },
  editButton: { marginTop: spacing.lg, minWidth: 150 },
  section: { padding: spacing.lg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, marginBottom: spacing.md },
  emptySection: { padding: spacing.xl, alignItems: 'center', borderRadius: borderRadius.md },
  emptyText: { fontSize: fontSize.md },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { fontSize: fontSize.lg, marginBottom: spacing.lg },
});

// ─── Badge preview styles ──────────────────────────────────────────────────
const badgeStyles = StyleSheet.create({
  card: {
    width: '100%',
    marginTop: spacing.lg,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 15, fontWeight: '700' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  count: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  emoji: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 20 },
});

// ─── Taste Match styles ────────────────────────────────────────────────────
const compatStyles = StyleSheet.create({
  card: {
    width: '100%',
    marginTop: spacing.lg,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginLeft: 2,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 16,
  },
  scoreRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scoreNumber: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 28,
    letterSpacing: -1,
  },
  scorePercent: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  signals: {
    flex: 1,
    gap: 8,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signalIcon: { width: 16 },
  signalLabel: {
    fontSize: 12,
    fontWeight: '500',
    width: 54,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  signalValue: {
    fontSize: 11,
    fontWeight: '700',
    width: 30,
    textAlign: 'right',
  },
  chipsSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chipsLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
