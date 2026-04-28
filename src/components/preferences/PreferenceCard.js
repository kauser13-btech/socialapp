import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
  Modal, TextInput, FlatList, ActivityIndicator, Alert, KeyboardAvoidingView,
  Animated, ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Avatar } from '../ui';
import ImageWithLoader from '../ui/ImageWithLoader';
import { preferencesAPI, messagesAPI, searchAPI, collectionsAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { shadows } from '../../constants/styles';

const DEBOUNCE_MS = 350;

const REACTIONS = [
  { key: 'like',  emoji: '👍' },
  { key: 'love',  emoji: '❤️' },
  { key: 'haha',  emoji: '😂' },
  { key: 'wow',   emoji: '😮' },
  { key: 'sad',   emoji: '😢' },
  { key: 'angry', emoji: '😡' },
];
const REACTION_MAP = Object.fromEntries(REACTIONS.map(r => [r.key, r.emoji]));

const CATEGORY_ICON_MAP = [
  { keys: ['food', 'dining'],      icon: 'restaurant',     color: '#f97316' },
  { keys: ['movie', 'film'],       icon: 'film',           color: '#8b5cf6' },
  { keys: ['travel', 'trip'],      icon: 'airplane',       color: '#0ea5e9' },
  { keys: ['music'],               icon: 'musical-notes',  color: '#10b981' },
  { keys: ['game'],                icon: 'game-controller', color: '#f59e0b' },
  { keys: ['book', 'read'],        icon: 'book',           color: '#6366f1' },
  { keys: ['sport', 'fitness'],    icon: 'fitness',        color: '#ec4899' },
  { keys: ['tech', 'gadget'],      icon: 'hardware-chip',  color: '#64748b' },
];

// Gradient colors for cards without images, keyed to category
const CATEGORY_GRADIENTS = [
  { keys: ['food', 'dining'],      colors: ['#f97316', '#ea580c'] },
  { keys: ['movie', 'film'],       colors: ['#8b5cf6', '#6d28d9'] },
  { keys: ['travel', 'trip'],      colors: ['#0ea5e9', '#0284c7'] },
  { keys: ['music'],               colors: ['#10b981', '#059669'] },
  { keys: ['game'],                colors: ['#f59e0b', '#d97706'] },
  { keys: ['book', 'read'],        colors: ['#6366f1', '#4f46e5'] },
  { keys: ['sport', 'fitness'],    colors: ['#ec4899', '#db2777'] },
  { keys: ['tech', 'gadget'],      colors: ['#64748b', '#475569'] },
];

function getGradientForCategory(name) {
  if (!name) return ['#6B63F5', '#4f46e5'];
  const lower = name.toLowerCase();
  const match = CATEGORY_GRADIENTS.find(({ keys }) => keys.some(k => lower.includes(k)));
  return match ? match.colors : ['#6B63F5', '#4f46e5'];
}

export default function PreferenceCard({ preference, onUpdate }) {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const [userReaction, setUserReaction] = useState(preference.user_reaction || null);
  const [reactions, setReactions] = useState(preference.reactions || {});
  const [isSaved, setIsSaved] = useState(preference.is_saved || false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const pickerAnim = useRef(new Animated.Value(0)).current;

  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);
  const currentEmoji = userReaction ? REACTION_MAP[userReaction] : null;

  const [shareVisible, setShareVisible] = useState(false);
  const [shareQuery, setShareQuery] = useState('');
  const [shareResults, setShareResults] = useState([]);
  const [shareSearching, setShareSearching] = useState(false);
  const [shareSending, setShareSending] = useState(false);
  const debounceRef = useRef(null);

  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  const openShare = () => setShareVisible(true);
  const closeShare = () => {
    setShareVisible(false);
    setShareQuery('');
    setShareResults([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const handleShareSearch = (text) => {
    setShareQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setShareResults([]); return; }
    setShareSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchAPI.searchUsers(text.trim());
        if (res.success) setShareResults(res.data?.users || res.data || []);
      } catch (err) {
        console.error('Share search error:', err);
      } finally {
        setShareSearching(false);
      }
    }, DEBOUNCE_MS);
  };

  const handleSendShare = async (recipient) => {
    setShareSending(true);
    try {
      await messagesAPI.sharePreference(recipient.id, preference.id, null);
      closeShare();
      Alert.alert('Sent!', `Preference shared with ${recipient.first_name || recipient.username}.`);
    } catch (e) {
      console.error('Share preference error:', e);
      Alert.alert('Error', 'Failed to share preference. Please try again.');
    } finally {
      setShareSending(false);
    }
  };

  const showPicker = () => {
    setPickerVisible(true);
    Animated.spring(pickerAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
  };

  const hidePicker = () => {
    Animated.timing(pickerAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setPickerVisible(false));
  };

  const handleReactionTap = async () => {
    try {
      if (userReaction) {
        const res = await preferencesAPI.unlike(preference.id);
        setUserReaction(null);
        setReactions(res?.data?.reactions || {});
      } else {
        const res = await preferencesAPI.like(preference.id, 'like');
        setUserReaction('like');
        setReactions(res?.data?.reactions || {});
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const handlePickReaction = async (reactionKey) => {
    hidePicker();
    try {
      const res = await preferencesAPI.like(preference.id, reactionKey);
      setUserReaction(reactionKey);
      setReactions(res?.data?.reactions || {});
    } catch (error) {
      console.error('Error setting reaction:', error);
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

  const openCollectionPicker = async () => {
    setCollectionModalVisible(true);
    setCollectionsLoading(true);
    try {
      const res = await collectionsAPI.list();
      if (res.success) setCollections(res.data.collections || []);
    } catch (e) {
      console.error('Load collections error:', e);
    } finally {
      setCollectionsLoading(false);
    }
  };

  const handleAddToCollection = async (collection) => {
    setCollectionModalVisible(false);
    try {
      await collectionsAPI.addPreference(collection.id, preference.id);
      Alert.alert('Added!', `"${preference.title}" added to ${collection.name}.`);
    } catch (e) {
      Alert.alert('Error', 'Failed to add to collection.');
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
        <Icon key={i} name={i <= rating ? 'star' : 'star-outline'} size={14} color="#f59e0b" />
      );
    }
    return stars;
  };

  const getIconForCategory = (name) => {
    if (!name) return { name: 'folder-open', color: colors.primary };
    const lower = name.toLowerCase();
    const match = CATEGORY_ICON_MAP.find(({ keys }) => keys.some(k => lower.includes(k)));
    return match ? { name: match.icon, color: match.color } : { name: 'folder-open', color: colors.primary };
  };

  const catIcon = preference.category ? getIconForCategory(preference.category.name) : null;
  const gradientColors = getGradientForCategory(preference.category?.name);
  const heroImage = preference.images && preference.images.length > 0 ? preference.images[0] : null;

  const timeAgo = (() => {
    if (!preference.created_at) return '';
    const diff = Date.now() - new Date(preference.created_at).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })();

  // Pick a subtle accent tint from the category for the gradient border
  const accentColor = catIcon ? catIcon.color : colors.primary;

  return (
    <View style={[
      styles.cardWrapper,
      {
        backgroundColor: isDark
          ? accentColor + '22'   // dark: faint colored glow ring
          : accentColor + '18',  // light: very soft tinted border
      },
    ]}>
    <View style={[styles.card, { backgroundColor: isDark ? colors.cardBackground : '#ffffff', ...(isDark ? {} : shadows.md) }]}>

      {/* ── User Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.userRow}
          onPress={() => navigation.navigate('UserProfile', { username: preference.user?.username })}
          activeOpacity={0.7}
        >
          <Avatar user={preference.user} size="medium" />
          <View style={styles.userMeta}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>
              {preference.user?.name || preference.user?.first_name || 'User'}
            </Text>
            <View style={styles.subRow}>
              {timeAgo ? <Text style={[styles.timeText, { color: colors.textSecondary }]}>{timeAgo}</Text> : null}
              {timeAgo && preference.category ? <Text style={[styles.dot, { color: colors.textSecondary }]}>·</Text> : null}
              {preference.category && catIcon && (
                <View style={styles.inlineCat}>
                  <Text style={styles.inlineCatEmoji}>
                    {catIcon.name === 'book' ? '📚' :
                     catIcon.name === 'restaurant' ? '🍽️' :
                     catIcon.name === 'film' ? '🎬' :
                     catIcon.name === 'airplane' ? '✈️' :
                     catIcon.name === 'musical-notes' ? '🎵' :
                     catIcon.name === 'game-controller' ? '🎮' :
                     catIcon.name === 'fitness' ? '💪' :
                     catIcon.name === 'hardware-chip' ? '💻' : '📁'}
                  </Text>
                  <Text style={[styles.inlineCatText, { color: catIcon.color }]}>
                    {preference.category.name}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.6}>
          <Icon name="ellipsis-vertical" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Hero Card (image or gradient) ── */}
      <TouchableOpacity onPress={handlePress} activeOpacity={0.92} style={styles.heroWrapper}>
        {heroImage ? (
          <ImageWithLoader
            id={preference?.id}
            uri={heroImage.url}
            style={styles.heroImage}
          />
        ) : (
          <View style={[styles.heroGradient, { backgroundColor: gradientColors[0] }]}>
            {/* Subtle second tone overlay */}
            <View style={[styles.heroGradientOverlay, { backgroundColor: gradientColors[1] }]} />
          </View>
        )}

        {/* Dark overlay for text readability */}
        <View style={styles.heroOverlay} />

        {/* Category badge — top left */}
        {preference.category && catIcon && (
          <View style={styles.heroCategoryBadge}>
            <Text style={styles.heroCategoryEmoji}>
              {catIcon.name === 'book' ? '📚' :
               catIcon.name === 'restaurant' ? '🍽️' :
               catIcon.name === 'film' ? '🎬' :
               catIcon.name === 'airplane' ? '✈️' :
               catIcon.name === 'musical-notes' ? '🎵' :
               catIcon.name === 'game-controller' ? '🎮' :
               catIcon.name === 'fitness' ? '💪' :
               catIcon.name === 'hardware-chip' ? '💻' : '📁'}
            </Text>
            <Text style={styles.heroCategoryText}>{preference.category.name}</Text>
          </View>
        )}

        {/* Title + subtitle overlaid bottom */}
        <View style={styles.heroBottom}>
          <Text style={styles.heroTitle} numberOfLines={2}>{preference.title}</Text>
          {preference.location && (
            <Text style={styles.heroSubtitle} numberOfLines={1}>{preference.location}</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* ── Content below hero ── */}
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.content}>
        <Text style={[styles.contentTitle, { color: colors.textPrimary }]}>{preference.title}</Text>

        {preference.description ? (
          <Text style={[styles.contentDescription, { color: colors.textSecondary }]} numberOfLines={3}>
            "{preference.description}"
          </Text>
        ) : null}

        {/* Rating row */}
        {preference.rating ? (
          <View style={styles.ratingRow}>
            <View style={styles.stars}>{renderStars(preference.rating)}</View>
            <Text style={[styles.ratingNum, { color: colors.textSecondary }]}>{preference.rating.toFixed(1)}</Text>
          </View>
        ) : null}

        {/* Extra images strip (2nd image onwards) */}
        {preference.images && preference.images.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.extraImages}>
            {preference.images.slice(1).map((image) => (
              <ImageWithLoader
                id={preference?.id}
                key={image.id ?? image.url}
                uri={image.url}
                style={styles.extraImage}
              />
            ))}
          </ScrollView>
        )}

        {/* Tags */}
        {preference.tags && preference.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {preference.tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: isDark ? colors.border : '#f3f4f6' }]}>
                <Text style={[styles.tagText, { color: colors.textSecondary }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>

      {/* ── Actions ── */}
      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        {/* Like */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleReactionTap}
          onLongPress={showPicker}
          delayLongPress={400}
          activeOpacity={0.6}
        >
          <Icon
            name={userReaction ? 'heart' : 'heart-outline'}
            size={20}
            color={userReaction ? '#ef4444' : colors.textSecondary}
          />
          <Text style={[styles.actionCount, { color: userReaction ? '#ef4444' : colors.textSecondary }]}>
            {totalReactions}
          </Text>
        </TouchableOpacity>

        {/* Comments */}
        <TouchableOpacity style={styles.actionBtn} onPress={handlePress} activeOpacity={0.6}>
          <Icon name="chatbubble-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.actionCount, { color: colors.textSecondary }]}>{preference.comments_count || 0}</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionBtn} onPress={openShare} activeOpacity={0.6}>
          <Icon name="arrow-redo-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleSave}
          onLongPress={openCollectionPicker}
          delayLongPress={400}
          activeOpacity={0.6}
        >
          <Icon
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isSaved ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Reaction picker overlay */}
      {pickerVisible && (
        <>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={0} onPress={hidePicker} />
          <Animated.View
            style={[
              styles.reactionPicker,
              { backgroundColor: isDark ? colors.cardBackground : '#fff' },
              {
                opacity: pickerAnim,
                transform: [{ translateY: pickerAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
              },
            ]}
          >
            {REACTIONS.map((r) => (
              <TouchableOpacity key={r.key} onPress={() => handlePickReaction(r.key)} style={styles.reactionOption} activeOpacity={0.7}>
                <Text style={styles.reactionEmoji}>{r.emoji}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </>
      )}

      {/* ── Collection picker modal ── */}
      <Modal visible={collectionModalVisible} animationType="slide" transparent onRequestClose={() => setCollectionModalVisible(false)}>
        <KeyboardAvoidingView style={sheetStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[sheetStyles.sheet, { backgroundColor: colors.background }]}>
            <View style={sheetStyles.handle} />
            <View style={sheetStyles.sheetHeader}>
              <Text style={[sheetStyles.sheetTitle, { color: colors.textPrimary }]}>Add to Collection</Text>
              <TouchableOpacity onPress={() => setCollectionModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[sheetStyles.previewChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
              <Icon name="bookmark" size={14} color={colors.primary} />
              <Text style={[sheetStyles.previewTitle, { color: colors.primary }]} numberOfLines={1}>{preference.title}</Text>
            </View>
            {collectionsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ padding: 32 }} />
            ) : (
              <FlatList
                data={collections}
                keyExtractor={item => item.id.toString()}
                style={sheetStyles.resultsList}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[sheetStyles.resultRow, { borderBottomColor: colors.border }]}
                    onPress={() => handleAddToCollection(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 24 }}>{item.emoji || '📁'}</Text>
                    <View style={sheetStyles.resultText}>
                      <Text style={[sheetStyles.resultName, { color: colors.textPrimary }]}>{item.name}</Text>
                      <Text style={[sheetStyles.resultUsername, { color: colors.textSecondary }]}>{item.preferences_count || 0} preferences</Text>
                    </View>
                    <Icon name="add-circle-outline" size={22} color={colors.primary} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={[sheetStyles.emptyText, { color: colors.textSecondary }]}>
                    No collections yet. Create one from the Collections screen.
                  </Text>
                }
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Share Modal ── */}
      <Modal visible={shareVisible} animationType="slide" transparent onRequestClose={closeShare}>
        <KeyboardAvoidingView style={sheetStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[sheetStyles.sheet, { backgroundColor: colors.background }]}>
            <View style={sheetStyles.handle} />
            <View style={sheetStyles.sheetHeader}>
              <Text style={[sheetStyles.sheetTitle, { color: colors.textPrimary }]}>Share Preference</Text>
              <TouchableOpacity onPress={closeShare} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[sheetStyles.previewChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
              <Icon name="bookmark" size={14} color={colors.primary} />
              <Text style={[sheetStyles.previewTitle, { color: colors.primary }]} numberOfLines={1}>{preference.title}</Text>
            </View>
            <View style={[sheetStyles.searchBar, { backgroundColor: isDark ? colors.cardBackground : '#f3f4f6' }]}>
              <Icon name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={[sheetStyles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search people..."
                placeholderTextColor={colors.textSecondary}
                value={shareQuery}
                onChangeText={handleShareSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {shareSearching && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
            <FlatList
              data={shareResults}
              keyExtractor={item => item.id.toString()}
              style={sheetStyles.resultsList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const name = item.first_name && item.last_name
                  ? `${item.first_name} ${item.last_name}`
                  : item.username;
                return (
                  <TouchableOpacity
                    style={[sheetStyles.resultRow, { borderBottomColor: colors.border }]}
                    onPress={() => handleSendShare(item)}
                    disabled={shareSending}
                    activeOpacity={0.7}
                  >
                    <Avatar user={item} size="medium" />
                    <View style={sheetStyles.resultText}>
                      <Text style={[sheetStyles.resultName, { color: colors.textPrimary }]}>{name}</Text>
                      <Text style={[sheetStyles.resultUsername, { color: colors.textSecondary }]}>@{item.username}</Text>
                    </View>
                    {shareSending
                      ? <ActivityIndicator size="small" color={colors.primary} />
                      : <Icon name="send" size={18} color={colors.primary} />
                    }
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                shareQuery.length > 0 && !shareSearching
                  ? <Text style={[sheetStyles.emptyText, { color: colors.textSecondary }]}>No users found</Text>
                  : <Text style={[sheetStyles.emptyText, { color: colors.textSecondary }]}>Type a name to search</Text>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 22,
    marginBottom: 20,
    padding: 2,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    fontSize: 12,
  },
  dot: {
    fontSize: 12,
  },
  inlineCat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  inlineCatEmoji: {
    fontSize: 12,
  },
  inlineCatText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* Hero */
  heroWrapper: {
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: 'hidden',
    height: 220,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    opacity: 0.6,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  heroCategoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroCategoryEmoji: {
    fontSize: 13,
  },
  heroCategoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  heroBottom: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 3,
    fontWeight: '500',
  },

  /* Content */
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  contentTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  contentDescription: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingNum: {
    fontSize: 13,
    fontWeight: '600',
  },
  extraImages: {
    marginBottom: 10,
  },
  extraImage: {
    width: 120,
    height: 80,
    borderRadius: 10,
    marginRight: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 6,
  },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },

  /* Actions */
  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 4,
    gap: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginRight: 18,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '500',
  },

  /* Reaction picker */
  reactionPicker: {
    position: 'absolute',
    bottom: 56,
    left: 8,
    flexDirection: 'row',
    borderRadius: 32,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
  },
  reactionOption: {
    padding: 6,
  },
  reactionEmoji: {
    fontSize: 28,
  },
});

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  resultsList: {
    maxHeight: 320,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  resultText: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '600' },
  resultUsername: { fontSize: 13, marginTop: 1 },
  emptyText: {
    textAlign: 'center',
    padding: 24,
    fontSize: 14,
  },
});
