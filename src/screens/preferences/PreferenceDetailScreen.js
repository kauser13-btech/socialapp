import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { Loading } from '../../components/ui';
import { preferencesAPI, fixImageUrl } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

const CATEGORY_META = [
  { keys: ['food', 'dining'], emoji: '🍽️', color: '#f97316', gradient: ['#f97316', '#ea580c'] },
  { keys: ['movie', 'film'], emoji: '🎬', color: '#8b5cf6', gradient: ['#8b5cf6', '#6d28d9'] },
  { keys: ['travel', 'trip'], emoji: '✈️', color: '#0ea5e9', gradient: ['#0ea5e9', '#0284c7'] },
  { keys: ['music'], emoji: '🎵', color: '#10b981', gradient: ['#10b981', '#059669'] },
  { keys: ['game'], emoji: '🎮', color: '#f59e0b', gradient: ['#f59e0b', '#d97706'] },
  { keys: ['book', 'read'], emoji: '📚', color: '#6366f1', gradient: ['#6366f1', '#4f46e5'] },
  { keys: ['sport', 'fitness'], emoji: '💪', color: '#ec4899', gradient: ['#ec4899', '#db2777'] },
  { keys: ['tech', 'gadget'], emoji: '💻', color: '#64748b', gradient: ['#64748b', '#475569'] },
];

function getCategoryMeta(name) {
  if (!name) return { emoji: '📁', color: '#6B63F5', gradient: ['#6B63F5', '#4f46e5'] };
  const lower = name.toLowerCase();
  const match = CATEGORY_META.find(({ keys }) => keys.some(k => lower.includes(k)));
  return match || { emoji: '📁', color: '#6B63F5', gradient: ['#6B63F5', '#4f46e5'] };
}

function renderStars(rating, size = 18) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Icon key={i} name={i <= rating ? 'star' : 'star-outline'} size={size} color="#f59e0b" />
    );
  }
  return stars;
}

function formatAddedDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `Added ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

const AVATAR_COLORS = ['#f97316', '#10b981', '#8b5cf6', '#ef4444', '#0ea5e9', '#f59e0b', '#ec4899', '#6366f1'];

function FriendsWhoLoveThis({ preferenceId, cardBackground, textPrimary, textSecondary }) {
  const [friends, setFriends] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!preferenceId) { setLoading(false); return; }
    preferencesAPI.getFriendsWhoLove(preferenceId)
      .then(res => {
        console.log('getFriendsWhoLove response:', JSON.stringify(res));
        if (res.success) {
          setFriends(res.data.friends || []);
          setTotal(res.data.total || 0);
        }
      })
      .catch(err => console.warn('getFriendsWhoLove error:', err))
      .finally(() => setLoading(false));
  }, [preferenceId]);

  if (loading) return null;
  if (total === 0) return null;

  const preview = friends.slice(0, 5);
  const extra = total > preview.length ? total - preview.length : 0;

  return (
    <View style={fStyles.section}>
      <Text style={[fStyles.label, { color: textSecondary }]}>
        {total} {total === 1 ? 'friend' : 'friends'} also love this
      </Text>
      <View style={fStyles.row}>
        {preview.map((f, idx) => {
          const initials = (f.name || f.username || '?').charAt(0).toUpperCase();
          const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
          return (
            <View
              key={f.id}
              style={[
                fStyles.avatar,
                { left: idx * 26, zIndex: preview.length - idx, borderColor: cardBackground },
              ]}
            >
              {f.avatar ? (
                <Image source={{ uri: fixImageUrl(f.avatar) }} style={fStyles.avatarImg} />
              ) : (
                <View style={[fStyles.avatarFallback, { backgroundColor: color }]}>
                  <Text style={fStyles.avatarText}>{initials}</Text>
                </View>
              )}
            </View>
          );
        })}
        {extra > 0 && (
          <Text style={[fStyles.extraText, { color: textSecondary, left: preview.length * 26 + 6 }]}>
            +{extra} more
          </Text>
        )}
        <View style={{ width: preview.length * 26 + (extra > 0 ? 58 : 0) }} />
      </View>
    </View>
  );
}

const fStyles = StyleSheet.create({
  section: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', height: 36, position: 'relative' },
  avatar: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  extraText: { position: 'absolute', fontSize: 14, fontWeight: '600' },
});

const DUMMY_SIMILAR = [
  { id: 1, title: 'Atomic Habits', author: 'James Clear', friends: 47, gradient: ['#f97316', '#ea580c'] },
  { id: 2, title: 'A Little Life', author: 'Hanya Yanagihara', friends: 31, gradient: ['#8b5cf6', '#6d28d9'] },
  { id: 3, title: 'The Alchemist', author: 'Paulo Coelho', friends: 58, gradient: ['#0ea5e9', '#0284c7'] },
  { id: 4, title: 'Educated', author: 'Tara Westover', friends: 22, gradient: ['#10b981', '#059669'] },
  { id: 5, title: 'Normal People', author: 'Sally Rooney', friends: 36, gradient: ['#ec4899', '#db2777'] },
];

function SimilarItems({ categoryName, textPrimary, cardBackground, textSecondary }) {
  return (
    <View style={{ padding: 16 }}>
      <Text style={[sStyles.title, { color: textPrimary }]}>
        Similar {categoryName || 'Items'} Friends Love
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={sStyles.scroll}
      >
        {DUMMY_SIMILAR.map((item) => (
          <View key={item.id} style={sStyles.card}>
            <View style={[sStyles.thumb, { backgroundColor: item.gradient[0] }]}>
              <View style={[sStyles.thumbContent, { backgroundColor: cardBackground }]}>
                <Text style={[sStyles.thumbTitle, { color: textPrimary }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[sStyles.thumbAuthor, { color: textSecondary }]} numberOfLines={2}>{item.author} · {item.friends} friends</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const sStyles = StyleSheet.create({
  section: { marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  scroll: { gap: 12, paddingBottom: 4 },
  card: { width: 140 },
  thumb: {
    width: 140,
    height: 170,
    borderRadius: 16,
    overflow: 'hidden',
  },

  thumbScrim: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: '55%',
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  thumbContent: {
    backgroundColor: '#fff',
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 10,
    height: '40%',
  },
  thumbTitle: { fontSize: 13, fontWeight: '700', lineHeight: 17, marginBottom: 3 },
  thumbAuthor: { fontSize: 11, fontWeight: '500', marginBottom: 5 },
  friendsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  friendsText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },
});

export default function PreferenceDetailScreen({ route }) {
  const { id } = route.params || {};
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [preference, setPreference] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    if (!id) { setError('Invalid preference ID'); setLoading(false); return; }
    loadAll();
  }, [id]);

  const loadAll = async () => {
    try {
      const prefRes = await preferencesAPI.get(id);

      if (prefRes.success) {
        const pref = prefRes.data.preference || prefRes.data;
        setPreference(pref);
        setIsFavorite(pref.is_favorite || false);
      }

    } catch (err) {
      setError(err.message || 'Failed to load preference');
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async (value) => {
    setIsFavorite(value);
    setFavoriteLoading(true);
    try {
      await preferencesAPI.setFavorite(id, value);
    } catch (err) {
      console.warn('setFavorite error:', err);
      setIsFavorite(!value);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleShareToFeed = async () => {
    try {
      await preferencesAPI.shareToFeed(id);
      Alert.alert('Shared!', 'Your preference has been shared to your feed.');
    } catch (err) {
      console.warn('shareToFeed error:', err);
      Alert.alert('Error', 'Failed to share to feed. Please try again.');
    }
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Preference',
      'Are you sure you want to remove this preference?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await preferencesAPI.delete(id);
              navigation.goBack();
            } catch (err) {
              console.warn('delete preference error:', err);
              Alert.alert('Error', 'Failed to remove preference.');
            }
          },
        },
      ]
    );
  };

  const handleEditNote = () => {
    navigation.navigate('PreferenceCreate', { editId: id, initialNote: preference?.description });
  };

  if (loading) return <Loading fullScreen />;

  if (error || !preference) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={styles.errorWrap}>
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            {error || 'Preference not found'}
          </Text>
          <Text style={[styles.errorSub, { color: colors.textSecondary }]}>
            This preference may have been deleted or doesn't exist.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const catMeta = getCategoryMeta(preference.category?.name);
  const heroImage = preference.images?.[0]?.url || null;
  const heroHeight = HERO_HEIGHT + insets.top;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Hero Section ── */}
        <View style={[styles.heroContainer, { height: heroHeight, backgroundColor: catMeta.gradient[0] }]}>
          {/* Background gradient fill */}
          <View style={[styles.heroBgGradient, { backgroundColor: catMeta.gradient[1] }]} />

          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 10 }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Icon name="arrow-back" size={16} color="#fff" />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          {/* CURRENTLY READING label */}
          <View style={[styles.currentlyReadingWrap, { top: insets.top + 52 }]}>
            <Text style={styles.currentlyReadingLabel}>
              {catMeta.emoji} CURRENTLY {preference.category?.name ? preference.category.name.toUpperCase() : 'READING'}
            </Text>
          </View>

          {/* Card — centered in hero */}
          <View style={[styles.heroCard, { top: insets.top + 76 }]}>
            {heroImage ? (
              <Image source={{ uri: heroImage }} style={styles.heroCardImage} resizeMode="cover" />
            ) : (
              <View style={[styles.heroCardImage, { backgroundColor: catMeta.gradient[0] }]} />
            )}
            {/* Bottom info strip */}
            <View style={styles.heroCardInfo}>
              <View style={[styles.heroCardCategoryPill, { backgroundColor: catMeta.color + '22' }]}>
                <Text style={styles.heroCardCategoryEmoji}>{catMeta.emoji}</Text>
                <Text style={[styles.heroCardCategoryText, { color: catMeta.color }]}>
                  {preference.category?.name || 'General'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── White content card ── */}
        <View style={[styles.contentCard, { backgroundColor: colors.cardBackground }]}>

          <View style={styles.contentBlock}>


            {/* Title */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {preference.title}
            </Text>

            {/* Subtitle row: author · year · type */}
            {(preference.author || preference.year || preference.subtitle) && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {[preference.author, preference.year, preference.subtitle]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            )}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Rating row */}
            {preference.rating ? (
              <View style={styles.ratingRow}>
                <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>
                  YOUR RATING
                </Text>
                <View style={styles.starsRow}>
                  {renderStars(preference.rating)}
                </View>
                <Text style={[styles.addedDate, { color: colors.textSecondary }]}>
                  {formatAddedDate(preference.created_at)}
                </Text>
              </View>
            ) : null}
          </View>


          {/* Note section */}
          {preference.description ? (
            <View style={[styles.noteCard, { backgroundColor: isDark ? '#2a2410' : '#fffbeb', borderColor: isDark ? '#4a3d1a' : '#fde68a' }]}>
              <Text style={[styles.noteLabel, { color: catMeta.color }]}>YOUR NOTE</Text>
              <Text style={[styles.noteText, { color: colors.textPrimary }]}>
                "{preference.description}"
              </Text>
            </View>
          ) : null}

          {/* Current Favorite toggle */}
          <View style={[
            styles.favoriteRow,
            { borderBottomWidth: 1, borderBottomColor: isFavorite ? '#ef4444' : colors.border },
            isFavorite && { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2' }
          ]}>
            <View style={styles.favoriteLeft}>
              <View style={styles.favoriteIconWrap}>
                <Icon
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={32}
                  color={isFavorite ? '#ef4444' : colors.textSecondary}
                />
              </View>
              <View style={styles.favoriteMeta}>
                <Text style={[styles.favoriteTitle, { color: colors.textPrimary }]}>
                  Current Favorite
                </Text>
                <Text style={[styles.favoriteDesc, { color: colors.textSecondary }]}>
                  Shows friends what you're loving now
                </Text>
              </View>
            </View>


            {favoriteLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={isFavorite}
                onValueChange={handleFavoriteToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
                ios_backgroundColor={colors.border}
              />
            )}
          </View>


          {/* Friends who love this */}
          <View style={{
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}>
            <FriendsWhoLoveThis
              preferenceId={id}
              cardBackground={colors.cardBackground}
              textPrimary={colors.textPrimary}
              textSecondary={colors.textSecondary} />
          </View>


          <View style={{ paddingVertical: 16, backgroundColor: isDark ? colors.background : '#f4f4f4' }}>

            {/* Action buttons */}
            <View style={[styles.actionRow, { backgroundColor: isDark ? colors.cardBackground : '#fff' }]}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnOutline, { backgroundColor: isDark ? colors.background : '#ededed', borderColor: colors.border }]}
                onPress={handleEditNote}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Edit Note</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPrimary, { backgroundColor: colors.primary }]}
                onPress={handleShareToFeed}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>Share to Feed</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnOutline, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fff0f0', borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#ffe1e1' }]}
                onPress={handleRemove}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Remove</Text>
              </TouchableOpacity>
            </View>

            {/* Similar items */}
            <SimilarItems
              categoryName={preference.category?.name}
              textPrimary={colors.textPrimary}
              textSecondary={colors.textSecondary}
              cardBackground={colors.cardBackground}
            />

          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const HERO_HEIGHT = 260;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {},

  /* Hero */
  heroContainer: {
    height: HERO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBgGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.55,
  },

  backBtn: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.30)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Currently reading label */
  currentlyReadingWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  currentlyReadingLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  /* Floating card inside hero */
  heroCard: {
    position: 'absolute',
    left: 40,
    right: 40,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  heroCardImage: {
    width: '100%',
    height: 140,
  },
  heroCardInfo: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroCardCategoryPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  heroCardCategoryEmoji: { fontSize: 13 },
  heroCardCategoryText: { fontSize: 12, fontWeight: '700' },

  /* Content card */
  contentCard: {
    minHeight: 200,
  },

  contentBlock: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },

  /* Title */
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 4,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
  },

  /* Rating */
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    flex: 1,
  },
  addedDate: {
    fontSize: 12,
  },

  /* Note */
  noteCard: {
    borderLeftWidth: 4,
    borderColor: '#c55200',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },

  noteLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 22,
  },

  /* Favorite toggle */
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  favoriteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  favoriteIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteMeta: { flex: 1 },
  favoriteTitle: { fontSize: 15, fontWeight: '700' },
  favoriteDesc: { fontSize: 12, marginTop: 2 },

  /* Actions */
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#fff",
    gap: 8,

  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnOutline: {
    borderWidth: 1,
  },
  actionBtnPrimary: {
    flex: 1.5,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  /* Error */
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
