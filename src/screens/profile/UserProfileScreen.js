import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Button, Loading } from '../../components/ui';
import PreferenceCard from '../../components/preferences/PreferenceCard';
import { userAPI, friendsAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/styles';

export default function UserProfileScreen({ route, navigation }) {
  const { username } = route.params;
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [relationship, setRelationship] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState(null);

  useEffect(() => {
    loadUser();
  }, [username]);

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
      console.error('Error loading user:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await userAPI.getUserPreferences(username);
      if (response.success) {
        setPreferences(response.data?.preferences || response.data || []);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const checkFriendshipStatus = async (userId) => {
    try {
      const friendsResponse = await friendsAPI.list();
      if (friendsResponse.success) {
        const friends = friendsResponse.data.friends || [];
        const isFriend = friends.some(f => f.id === userId);
        if (isFriend) {
          setFriendshipStatus('friends');
          return;
        }
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
      console.error('Error toggling follow:', error);
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
        Alert.alert(
          'Remove Friend',
          `Are you sure you want to remove ${user.first_name} from your friends?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: async () => {
                try {
                  await friendsAPI.remove(user.id);
                  setFriendshipStatus('none');
                } catch (err) {
                  Alert.alert('Error', 'Failed to remove friend');
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error with friend request:', error);
      Alert.alert('Error', error.message || 'Failed to send friend request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = () => {
    if (!user) return;
    navigation.navigate('Chat', {
      userId: user.id,
      user: user,
    });
  };

  const getFullName = () => {
    if (!user) return '';
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.first_name || user.last_name || user.username;
  };

  const getFriendButtonText = () => {
    switch (friendshipStatus) {
      case 'friends':
        return 'Friends';
      case 'pending':
        return 'Pending';
      default:
        return 'Add Friend';
    }
  };

  const getFriendButtonVariant = () => {
    switch (friendshipStatus) {
      case 'friends':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'primary';
    }
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>User not found</Text>
          <Button onPress={() => navigation.goBack()}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  const isOwnProfile = currentUser?.id === user.id;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView>
        <View style={styles.header}>
          <Avatar
            src={user.avatar_url}
            name={getFullName()}
            size="xlarge"
          />
          <Text style={styles.name}>{getFullName()}</Text>
          <Text style={styles.username}>@{user.username}</Text>

          {user.bio ? (
            <Text style={styles.bio}>{user.bio}</Text>
          ) : null}

          {user.location ? (
            <View style={styles.locationContainer}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.location}>{user.location}</Text>
            </View>
          ) : null}

          {stats && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.preferences_count || 0}</Text>
                <Text style={styles.statLabel}>Preferences</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.followers_count || 0}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.following_count || 0}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>
          )}

          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              <Button
                style={styles.actionButton}
                variant={relationship?.is_following ? 'secondary' : 'primary'}
                onPress={handleFollow}
                loading={actionLoading}
                disabled={actionLoading}
              >
                {relationship?.is_following ? 'Following' : 'Follow'}
              </Button>

              <Button
                style={styles.actionButton}
                variant={getFriendButtonVariant()}
                onPress={handleFriendRequest}
                disabled={actionLoading || friendshipStatus === 'pending'}
              >
                {getFriendButtonText()}
              </Button>

              {friendshipStatus === 'friends' && (
                <Button
                  style={styles.actionButton}
                  variant="outline"
                  onPress={handleMessage}
                >
                  Message
                </Button>
              )}
            </View>
          )}

          {isOwnProfile && (
            <Button
              style={styles.editButton}
              variant="outline"
              onPress={() => navigation.navigate('Settings')}
            >
              Edit Profile
            </Button>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          {preferences.length > 0 ? (
            preferences.map((preference) => (
              <PreferenceCard
                key={preference.id}
                preference={preference}
                onUpdate={loadPreferences}
              />
            ))
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>No public preferences yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  username: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  bio: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  locationIcon: {
    fontSize: fontSize.sm,
    marginRight: spacing.xs,
  },
  location: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    width: '100%',
  },
  actionButton: {
    minWidth: 100,
  },
  editButton: {
    marginTop: spacing.lg,
    minWidth: 150,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  emptySection: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
});
