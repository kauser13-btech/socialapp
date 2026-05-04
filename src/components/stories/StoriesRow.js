import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { storiesAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

const CIRCLE_SIZE = 64;

// ─── Single story circle ──────────────────────────────────────────────────────
function StoryCircle({ group, onPress, onLongPress, colors, isOwn }) {
  const user      = group.user;
  const allSeen   = group.all_viewed;
  const ringColor = allSeen ? colors.border : colors.primary;
  const avatarUrl = user?.avatar_url;
  const label     = isOwn ? 'Your story' : (user?.first_name || user?.username || 'User');

  return (
    <TouchableOpacity
      style={styles.circle}
      onPress={() => onPress(group)}
      onLongPress={onLongPress}
      delayLongPress={300}
      activeOpacity={0.8}
    >
      <View style={[styles.ring, { borderColor: isOwn ? colors.primary : ringColor }]}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '22' }]}>
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>
              {(user?.first_name || user?.name || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}
        {/* Plus badge: tap = view, long-press = add new */}
        {isOwn && (
          <View style={[styles.plusBadge, { backgroundColor: colors.primary }]}>
            <Icon name="add" size={12} color="#fff" />
          </View>
        )}
      </View>
      <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Add story button (shown only when user has no story yet) ─────────────────
function AddStoryButton({ onPress, colors }) {
  return (
    <TouchableOpacity style={styles.circle} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.ring, { borderColor: colors.border, borderStyle: 'dashed' }]}>
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
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Re-fetch every time the screen comes into focus so a newly created
  // story is always reflected when returning from CreateStory.
  useFocusEffect(useCallback(() => {
    let active = true;
    storiesAPI.list()
      .then(r => { if (active && r.success) setGroups(r.data.groups || []); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  const ownGroup  = groups.find(g => g.is_own);
  const otherGroups = groups.filter(g => !g.is_own);

  const handleCirclePress = (group) => {
    navigation.navigate('StoryViewer', { groups, startUserId: group.user.id });
  };

  const handleStoryCreated = (newGroup) => {
    setGroups(prev => [newGroup, ...prev.filter(g => !g.is_own)]);
  };

  const handleAddPress = () => {
    navigation.navigate('CreateStory', { onCreated: handleStoryCreated });
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
        {/* Own story: tap = view, long-press = add new story. No story yet = + button */}
        {ownGroup ? (
          <StoryCircle
            group={ownGroup}
            onPress={handleCirclePress}
            onLongPress={handleAddPress}
            colors={colors}
            isOwn
          />
        ) : (
          <AddStoryButton onPress={handleAddPress} colors={colors} />
        )}

        {/* Other users' stories */}
        {otherGroups.map(g => (
          <StoryCircle
            key={g.user.id}
            group={g}
            onPress={handleCirclePress}
            onLongPress={null}
            colors={colors}
            isOwn={false}
          />
        ))}
      </ScrollView>
    </View>
  );
}

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
  plusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  username: {
    fontSize: 11,
    fontWeight: '500',
    width: CIRCLE_SIZE + 8,
    textAlign: 'center',
  },
});
