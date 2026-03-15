import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Avatar, Button } from '../ui';
import ImageWithLoader from '../ui/ImageWithLoader';
import { preferencesAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../../constants/styles';

export default function PreferenceCard({ preference, onUpdate }) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [isLiked, setIsLiked] = useState(preference.is_liked || false);
  const [isSaved, setIsSaved] = useState(preference.is_saved || false);
  const [likesCount, setLikesCount] = useState(preference.likes_count || 0);

  const handleLike = async () => {
    try {
      if (isLiked) {
        await preferencesAPI.unlike(preference.id);
        setIsLiked(false);
        setLikesCount((prev) => prev - 1);
      } else {
        await preferencesAPI.like(preference.id);
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (isSaved) {
        await preferencesAPI.unsave(preference.id);
        setIsSaved(false);
      } else {
        await preferencesAPI.save(preference.id);
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  const handlePress = () => {
    if (!preference?.id) return;
    navigation.navigate('PreferenceDetail', { id: preference.id });
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={styles.star}>
          {i <= rating ? '★' : '☆'}
        </Text>
      );
    }
    return stars;
  };

  return (
    <Card style={styles.card} onPress={handlePress}>
      {/* User Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => navigation.navigate('UserProfile', { username: preference.user?.username })}
        >
          <Avatar user={preference.user} size="medium" />
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{preference.user?.name}</Text>
            <Text style={[styles.username, { color: colors.textSecondary }]}>@{preference.user?.username}</Text>
          </View>
        </TouchableOpacity>
        {preference.category && (
          <View style={[styles.categoryBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.categoryText} numberOfLines={1}>{preference.category.name}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{preference.title}</Text>
        {preference.description && (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
            {preference.description}
          </Text>
        )}

        {preference.rating && (
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>{renderStars(preference.rating)}</View>
          </View>
        )}

        {preference.location && (
          <Text style={[styles.location, { color: colors.textSecondary }]}>📍 {preference.location}</Text>
        )}

        {preference.images && preference.images.length > 0 && (
          <ScrollView horizontal style={styles.imagesContainer} showsHorizontalScrollIndicator={false}>
            {preference.images.map((image, index) => (
              <ImageWithLoader
                id={preference?.id}
                key={index}
                uri={image.url}
                style={styles.image}
              />
            ))}
          </ScrollView>
        )}

        {preference.tags && preference.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {preference.tags.map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: colors.gray100 }]}>
                <Text style={[styles.tagText, { color: colors.primary }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Text style={[styles.actionIcon, isLiked && styles.actionIconActive]}>
            {isLiked ? '❤️' : '🤍'}
          </Text>
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handlePress}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>{preference.comments_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>🔗</Text>
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
          <Text style={[styles.actionIcon, isSaved && styles.actionIconActive]}>
            {isSaved ? '🔖' : '📑'}
          </Text>
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Save</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: spacing.md,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  username: {
    fontSize: fontSize.sm,
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    maxWidth: 120,
    flexShrink: 1,
  },
  categoryText: {
    fontSize: fontSize.sm,
    color: '#ffffff',
    fontWeight: fontWeight.medium,
  },
  content: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  ratingContainer: {
    marginBottom: spacing.sm,
  },
  stars: {
    flexDirection: 'row',
  },
  star: {
    fontSize: fontSize.lg,
    color: '#fbbf24',
    marginRight: spacing.xs,
  },
  location: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  imagesContainer: {
    marginVertical: spacing.md,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagText: {
    fontSize: fontSize.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIcon: {
    fontSize: fontSize.lg,
  },
  actionIconActive: {
    transform: [{ scale: 1.2 }],
  },
  actionText: {
    fontSize: fontSize.sm,
  },
});
