import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Avatar } from '../ui';
import ImageWithLoader from '../ui/ImageWithLoader';
import { preferencesAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

export default function PreferenceCard({ preference, onUpdate }) {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
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
        <Icon 
          key={i} 
          name={i <= rating ? "star" : "star-outline"} 
          size={16} 
          color="#fbbf24" 
          style={styles.star} 
        />
      );
    }
    return stars;
  };

  const getIconForCategory = (name) => {
    if (!name) return { name: 'folder-open', color: colors.primary };
    const lower = name.toLowerCase();
    if (lower.includes('food') || lower.includes('dining')) return { name: 'restaurant', color: '#f43f5e' };
    if (lower.includes('movie') || lower.includes('film')) return { name: 'film', color: '#8b5cf6' };
    if (lower.includes('travel') || lower.includes('trip')) return { name: 'airplane', color: '#0ea5e9' };
    if (lower.includes('music')) return { name: 'musical-notes', color: '#10b981' };
    if (lower.includes('game')) return { name: 'game-controller', color: '#f59e0b' };
    if (lower.includes('book') || lower.includes('read')) return { name: 'book', color: '#6366f1' };
    if (lower.includes('sport') || lower.includes('fitness')) return { name: 'fitness', color: '#ec4899' };
    if (lower.includes('tech') || lower.includes('gadget')) return { name: 'hardware-chip', color: '#64748b' };
    return { name: 'folder-open', color: colors.primary };
  };

  const catIcon = preference.category ? getIconForCategory(preference.category.name) : null;

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { 
          backgroundColor: isDark ? colors.cardBackground : '#ffffff',
          borderColor: isDark ? colors.border : '#f3f4f6'
        }
      ]} 
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* User Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => navigation.navigate('UserProfile', { username: preference.user?.username })}
          activeOpacity={0.7}
        >
          <Avatar user={preference.user} size="medium" />
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>
              {preference.user?.name || preference.user?.first_name || 'User'}
            </Text>
            <Text style={[styles.username, { color: colors.textSecondary }]}>@{preference.user?.username}</Text>
          </View>
        </TouchableOpacity>
        
        {preference.category && catIcon && (
          <View style={[styles.categoryBadge, { backgroundColor: isDark ? catIcon.color + '20' : catIcon.color + '15' }]}>
            <Icon name={catIcon.name} size={12} color={catIcon.color} style={{ marginRight: 4 }} />
            <Text style={[styles.categoryText, { color: catIcon.color }]} numberOfLines={1}>
              {preference.category.name}
            </Text>
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
          <View style={styles.locationWrapper}>
            <Icon name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1}>
              {preference.location}
            </Text>
          </View>
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
              <View key={index} style={[styles.tag, { backgroundColor: isDark ? colors.border : '#f3f4f6' }]}>
                <Text style={[styles.tagText, { color: colors.textSecondary }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike} activeOpacity={0.6}>
          <Icon 
            name={isLiked ? "heart" : "heart-outline"} 
            size={22} 
            color={isLiked ? "#ef4444" : colors.textSecondary} 
          />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handlePress} activeOpacity={0.6}>
          <Icon name="chatbubble-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>{preference.comments_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} activeOpacity={0.6}>
          <Icon name="share-social-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleSave} activeOpacity={0.6}>
          <Icon 
            name={isSaved ? "bookmark" : "bookmark-outline"} 
            size={20} 
            color={isSaved ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Save</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  username: {
    fontSize: 13,
    marginTop: 2,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: 120,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  ratingContainer: {
    marginBottom: 12,
  },
  stars: {
    flexDirection: 'row',
  },
  star: {
    marginRight: 2,
  },
  locationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  location: {
    fontSize: 13,
  },
  imagesContainer: {
    marginBottom: 12,
  },
  image: {
    width: 240,
    height: 160,
    borderRadius: 12,
    marginRight: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
