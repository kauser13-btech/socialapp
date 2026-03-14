import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Avatar, Button } from '../ui';
import ImageWithLoader from '../ui/ImageWithLoader';
import { preferencesAPI } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/styles';

export default function PreferenceCard({ preference, onUpdate }) {
  const navigation = useNavigation();
  const [isLiked, setIsLiked] = useState(preference.is_liked || false);
  const [isSaved, setIsSaved] = useState(preference.is_saved || false);
  const [likesCount, setLikesCount] = useState(preference.likes_count || 0);

  // Debug: Log preference data
  // console.log('PreferenceCard rendering with preference:', {
  //   id: preference?.id,
  //   title: preference?.title,
  //   hasUser: !!preference?.user,
  // });

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
    if (!preference?.id) {
      console.error('Cannot navigate to detail: preference ID is missing', preference);
      return;
    }
    console.log('Navigating to preference detail with ID:', preference.id);
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
            <Text style={styles.userName}>{preference.user?.name}</Text>
            <Text style={styles.username}>@{preference.user?.username}</Text>
          </View>
        </TouchableOpacity>
        {preference.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText} numberOfLines={1}>{preference.category.name}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{preference.title}</Text>
        {preference.description && (
          <Text style={styles.description} numberOfLines={3}>
            {preference.description}
          </Text>
        )}

        {/* Rating */}
        {preference.rating && (
          <View style={styles.ratingContainer}>
            <View style={styles.stars}>{renderStars(preference.rating)}</View>
          </View>
        )}

        {/* Location */}
        {preference.location && (
          <Text style={styles.location}>📍 {preference.location}</Text>
        )}

        {/* Images */}
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

        {/* Tags */}
        {preference.tags && preference.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {preference.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Text style={[styles.actionIcon, isLiked && styles.actionIconActive]}>
            {isLiked ? '❤️' : '🤍'}
          </Text>
          <Text style={styles.actionText}>{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handlePress}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>{preference.comments_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>🔗</Text>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
          <Text style={[styles.actionIcon, isSaved && styles.actionIconActive]}>
            {isSaved ? '🔖' : '📑'}
          </Text>
          <Text style={styles.actionText}>Save</Text>
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
    color: colors.textPrimary,
  },
  username: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  categoryBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    maxWidth: 120,
    flexShrink: 1,
  },
  categoryText: {
    fontSize: fontSize.sm,
    color: colors.background,
    fontWeight: fontWeight.medium,
  },
  content: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagText: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    color: colors.textSecondary,
  },
});
