import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
  Modal, TextInput, FlatList, ActivityIndicator, Alert, KeyboardAvoidingView,
  Animated,
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

  // Share modal state
  const [shareVisible, setShareVisible] = useState(false);
  const [shareQuery, setShareQuery] = useState('');
  const [shareResults, setShareResults] = useState([]);
  const [shareSearching, setShareSearching] = useState(false);
  const [shareSending, setShareSending] = useState(false);
  const debounceRef = useRef(null);

  // Collection picker state
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);

  const openShare = () => { setShareVisible(true); };
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
    const match = CATEGORY_ICON_MAP.find(({ keys }) => keys.some(k => lower.includes(k)));
    return match ? { name: match.icon, color: match.color } : { name: 'folder-open', color: colors.primary };
  };

  const catIcon = preference.category ? getIconForCategory(preference.category.name) : null;

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { 
          backgroundColor: isDark ? colors.cardBackground : '#ffffff',
          borderColor: isDark ? colors.border : '#ffffff', // hide border on light mode if card has shadow
          ...(isDark ? {} : shadows.md), // Add shadow on light mode only for cleaner dark mode depth
        }
      ]} 
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Category Background Watermark */}
      {preference.category && catIcon && (
        <Icon 
          name={catIcon.name} 
          size={80} 
          color={isDark ? catIcon.color + '15' : catIcon.color + '10'} 
          style={styles.watermarkIcon} 
        />
      )}

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

        {/* Category Badge */}
        {preference.category && catIcon && (
          <View style={[styles.categoryBadge, { backgroundColor: catIcon.color + '18' }]}>
            <Icon name={catIcon.name} size={13} color={catIcon.color} />
            <Text style={[styles.categoryText, { color: catIcon.color }]}>
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
            {preference.images.map((image) => (
              <ImageWithLoader
                id={preference?.id}
                key={image.id ?? image.url}
                uri={image.url}
                style={styles.image}
              />
            ))}
          </ScrollView>
        )}

        {preference.tags && preference.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {preference.tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: isDark ? colors.border : '#f3f4f6' }]}>
                <Text style={[styles.tagText, { color: colors.textSecondary }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Reaction summary row */}
        {Object.keys(reactions).length > 0 && (
          <View style={styles.reactionSummary}>
            {Object.entries(reactions)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([key, count]) => (
                <Text key={key} style={[styles.reactionChip, { color: colors.textSecondary }]}>
                  {REACTION_MAP[key]}{count}
                </Text>
              ))}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleReactionTap}
          onLongPress={showPicker}
          delayLongPress={400}
          activeOpacity={0.6}
        >
          <Text style={styles.reactionIcon}>{currentEmoji || '👍'}</Text>
          <Text style={[styles.actionText, { color: userReaction ? '#ef4444' : colors.textSecondary }]}>
            {totalReactions}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handlePress} activeOpacity={0.6}>
          <Icon name="chatbubble-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>{preference.comments_count || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={openShare} activeOpacity={0.6}>
          <Icon name="share-social-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSave}
          onLongPress={openCollectionPicker}
          delayLongPress={400}
          activeOpacity={0.6}
        >
          <Icon
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={20}
            color={isSaved ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Collection picker modal */}
      <Modal visible={collectionModalVisible} animationType="slide" transparent onRequestClose={() => setCollectionModalVisible(false)}>
        <KeyboardAvoidingView style={shareStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[shareStyles.sheet, { backgroundColor: colors.background }]}>
            <View style={shareStyles.handle} />
            <View style={shareStyles.sheetHeader}>
              <Text style={[shareStyles.sheetTitle, { color: colors.textPrimary }]}>Add to Collection</Text>
              <TouchableOpacity onPress={() => setCollectionModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[shareStyles.previewChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
              <Icon name="bookmark" size={14} color={colors.primary} />
              <Text style={[shareStyles.previewTitle, { color: colors.primary }]} numberOfLines={1}>{preference.title}</Text>
            </View>
            {collectionsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ padding: 32 }} />
            ) : (
              <FlatList
                data={collections}
                keyExtractor={item => item.id.toString()}
                style={shareStyles.resultsList}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[shareStyles.resultRow, { borderBottomColor: colors.border }]}
                    onPress={() => handleAddToCollection(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 24 }}>{item.emoji || '📁'}</Text>
                    <View style={shareStyles.resultText}>
                      <Text style={[shareStyles.resultName, { color: colors.textPrimary }]}>{item.name}</Text>
                      <Text style={[shareStyles.resultUsername, { color: colors.textSecondary }]}>{item.preferences_count || 0} preferences</Text>
                    </View>
                    <Icon name="add-circle-outline" size={22} color={colors.primary} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={[shareStyles.emptyText, { color: colors.textSecondary }]}>
                    No collections yet. Create one from the Collections screen.
                  </Text>
                }
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reaction picker overlay — dismiss layer is behind the picker */}
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

      {/* ── Share Modal ── */}
      <Modal visible={shareVisible} animationType="slide" transparent onRequestClose={closeShare}>
        <KeyboardAvoidingView
          style={shareStyles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[shareStyles.sheet, { backgroundColor: colors.background }]}>

            {/* Handle + header */}
            <View style={shareStyles.handle} />
            <View style={shareStyles.sheetHeader}>
              <Text style={[shareStyles.sheetTitle, { color: colors.textPrimary }]}>Share Preference</Text>
              <TouchableOpacity onPress={closeShare} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Preview chip */}
            <View style={[shareStyles.previewChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
              <Icon name="bookmark" size={14} color={colors.primary} />
              <Text style={[shareStyles.previewTitle, { color: colors.primary }]} numberOfLines={1}>
                {preference.title}
              </Text>
            </View>

            {/* Search input */}
            <View style={[shareStyles.searchBar, { backgroundColor: isDark ? colors.cardBackground : '#f3f4f6' }]}>
              <Icon name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={[shareStyles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search people..."
                placeholderTextColor={colors.textSecondary}
                value={shareQuery}
                onChangeText={handleShareSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {shareSearching && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            {/* Results */}
            <FlatList
              data={shareResults}
              keyExtractor={item => item.id.toString()}
              style={shareStyles.resultsList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const name = item.first_name && item.last_name
                  ? `${item.first_name} ${item.last_name}`
                  : item.username;
                return (
                  <TouchableOpacity
                    style={[shareStyles.resultRow, { borderBottomColor: colors.border }]}
                    onPress={() => handleSendShare(item)}
                    disabled={shareSending}
                    activeOpacity={0.7}
                  >
                    <Avatar user={item} size="medium" />
                    <View style={shareStyles.resultText}>
                      <Text style={[shareStyles.resultName, { color: colors.textPrimary }]}>{name}</Text>
                      <Text style={[shareStyles.resultUsername, { color: colors.textSecondary }]}>@{item.username}</Text>
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
                  ? <Text style={[shareStyles.emptyText, { color: colors.textSecondary }]}>No users found</Text>
                  : <Text style={[shareStyles.emptyText, { color: colors.textSecondary }]}>Type a name to search</Text>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    // Note: Do not use overflow: 'hidden' with shadows on iOS and Android seamlessly or the shadow gets cropped.
    // Instead we rely on the inner elements respecting the border radius.
  },
  watermarkIcon: {
    position: 'absolute',
    top: -10,
    right: -10,
    zIndex: 0,
    transform: [{ rotate: '15deg' }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 12,
    zIndex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
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
  content: {
    paddingHorizontal: 16,
    zIndex: 1,
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
    zIndex: 1,
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
  reactionSummary: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  reactionChip: {
    fontSize: 13,
    fontWeight: '500',
  },
  reactionIcon: {
    fontSize: 20,
  },
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

const shareStyles = StyleSheet.create({
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
