import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Button, Loading } from '../../components/ui';
import PreferenceCard from '../../components/preferences/PreferenceCard';
import { userAPI, friendsAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../../constants/styles';

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

  useEffect(() => { loadUser(); }, [username]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUser(username);
      if (response.success) {
        setUser(response.data.user);
        setStats(response.data.stats);
        setRelationship(response.data.relationship);
        checkFriendshipStatus(response.data.user.id);
        loadPreferences();
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
      const friendsResponse = await friendsAPI.list();
      if (friendsResponse.success) {
        const friends = friendsResponse.data.friends || [];
        setFriendshipStatus(friends.some(f => f.id === userId) ? 'friends' : 'none');
      } else {
        setFriendshipStatus('none');
      }
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
        await friendsAPI.sendRequest(user.id);
        setFriendshipStatus('pending');
        Alert.alert('Success', 'Friend request sent!');
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
