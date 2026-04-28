import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { storiesAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

// ─── Single story circle ──────────────────────────────────────────────────────
function StoryCircle({ group, onPress, colors, isOwn }) {
  const user    = group.user;
  const allSeen = group.all_viewed;
  const ringColor = allSeen ? colors.border : colors.primary;
  const avatarUrl = user?.avatar_url;

  return (
    <TouchableOpacity style={styles.circle} onPress={() => onPress(group)} activeOpacity={0.8}>
      {/* Ring */}
      <View style={[styles.ring, { borderColor: ringColor }]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '22' }]}>
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>
              {(user?.first_name || user?.name || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      {/* Username */}
      <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
        {isOwn ? 'Your story' : (user?.first_name || user?.username || 'User')}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Add story button ─────────────────────────────────────────────────────────
function AddStoryButton({ onPress, colors, hasStory }) {
  return (
    <TouchableOpacity style={styles.circle} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.ring, { borderColor: hasStory ? colors.primary : colors.border }]}>
        <View style={[styles.addAvatar, { backgroundColor: colors.primary + '15' }]}>
          <Icon name="add" size={28} color={colors.primary} />
        </View>
      </View>
      <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
        Add story
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function StoriesRow({ navigation }) {
  const { colors } = useTheme();
  const { user }   = useAuth();
  const [groups, setGroups]   = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    storiesAPI.list()
      .then(r => { if (r.success) setGroups(r.data.groups || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []));

  const ownGroup = groups.find(g => g.is_own);

  const handleCirclePress = (group) => {
    navigation.navigate('StoryViewer', { groups, startUserId: group.user.id });
  };

  const handleAddPress = () => {
    if (ownGroup) {
      // Already has stories — open own story viewer
      navigation.navigate('StoryViewer', { groups, startUserId: user?.id });
    } else {
      navigation.navigate('CreateStory', {
        onCreated: (newGroup) => setGroups(prev => [newGroup, ...prev]),
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { borderBottomColor: colors.border }]}>
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {/* Add / own story button always first */}
        <AddStoryButton
          onPress={handleAddPress}
          colors={colors}
          hasStory={!!ownGroup}
        />

        {/* Other users' stories */}
        {groups
          .filter(g => !g.is_own)
          .map(g => (
            <StoryCircle
              key={g.user.id}
              group={g}
              onPress={handleCirclePress}
              colors={colors}
              isOwn={false}
            />
          ))}
      </ScrollView>
    </View>
  );
}

const CIRCLE_SIZE = 64;

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  circle: {
    alignItems: 'center',
    width: CIRCLE_SIZE + 8,
    gap: 5,
  },
  ring: {
    width: CIRCLE_SIZE + 4,
    height: CIRCLE_SIZE + 4,
    borderRadius: (CIRCLE_SIZE + 4) / 2,
    borderWidth: 2.5,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
  },
  avatarPlaceholder: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '700',
  },
  addAvatar: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 11,
    fontWeight: '500',
    width: CIRCLE_SIZE + 8,
    textAlign: 'center',
  },
});
