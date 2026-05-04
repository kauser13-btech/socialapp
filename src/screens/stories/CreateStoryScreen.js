import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, ScrollView, Image,
  Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { storiesAPI, preferencesAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

const { width: W } = Dimensions.get('window');
const PREVIEW_W = W - 32;
const PREVIEW_H = Math.round(PREVIEW_W * (16 / 9));

// ── Category helpers ──────────────────────────────────────────────────────────
const GRADIENTS = [
  { keys: ['food', 'dining'],   top: '#f97316', bot: '#ea580c' },
  { keys: ['movie', 'film'],    top: '#8b5cf6', bot: '#6d28d9' },
  { keys: ['travel', 'trip'],   top: '#0ea5e9', bot: '#0284c7' },
  { keys: ['music'],            top: '#10b981', bot: '#059669' },
  { keys: ['game'],             top: '#f59e0b', bot: '#d97706' },
  { keys: ['book', 'read'],     top: '#6366f1', bot: '#4f46e5' },
  { keys: ['sport', 'fitness'], top: '#ec4899', bot: '#db2777' },
  { keys: ['tech', 'gadget'],   top: '#64748b', bot: '#475569' },
];
const EMOJIS = {
  book: '📚', restaurant: '🍽️', film: '🎬', airplane: '✈️',
  'musical-notes': '🎵', 'game-controller': '🎮', fitness: '💪', 'hardware-chip': '💻',
};
const ICON_MAP = [
  { keys: ['food', 'dining'],    icon: 'restaurant' },
  { keys: ['movie', 'film'],     icon: 'film' },
  { keys: ['travel', 'trip'],    icon: 'airplane' },
  { keys: ['music'],             icon: 'musical-notes' },
  { keys: ['game'],              icon: 'game-controller' },
  { keys: ['book', 'read'],      icon: 'book' },
  { keys: ['sport', 'fitness'],  icon: 'fitness' },
  { keys: ['tech', 'gadget'],    icon: 'hardware-chip' },
];

function catGradient(name) {
  if (!name) return ['#6B63F5', '#4f46e5'];
  const l = name.toLowerCase();
  const m = GRADIENTS.find(g => g.keys.some(k => l.includes(k)));
  return m ? [m.top, m.bot] : ['#6B63F5', '#4f46e5'];
}
function catEmoji(name) {
  if (!name) return '📁';
  const l = name.toLowerCase();
  const m = ICON_MAP.find(g => g.keys.some(k => l.includes(k)));
  return m ? (EMOJIS[m.icon] || '📁') : '📁';
}

// ── Audience options ──────────────────────────────────────────────────────────
const AUDIENCE = [
  { key: 'public',       label: 'Public',        sub: 'Anyone on UNOMI',      icon: 'globe-outline' },
  { key: 'friends',      label: 'Friends',        sub: 'Your friends list',    icon: 'people-outline' },
  { key: 'close_friends', label: 'Close Friends', sub: 'Your curated list',    icon: 'heart-outline' },
];

// ── Story type tiles ──────────────────────────────────────────────────────────
const TYPES = [
  { key: 'card',  label: 'Card',  icon: 'bookmark-outline' },
  { key: 'photo', label: 'Photo', icon: 'camera-outline' },
  { key: 'video', label: 'Video', icon: 'videocam-outline' },
];

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ n, title, colors }) {
  return (
    <View style={sh.row}>
      <View style={[sh.badge, { backgroundColor: colors.primary }]}>
        <Text style={sh.num}>{n}</Text>
      </View>
      <Text style={[sh.title, { color: colors.textPrimary }]}>{title}</Text>
    </View>
  );
}
const sh = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  badge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  num:   { color: '#fff', fontSize: 11, fontWeight: '800' },
  title: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
});

// ── Live 9:16 preview ─────────────────────────────────────────────────────────
function LivePreview({ pref, storyType, mediaFile, caption, colors }) {
  const catName  = pref?.category?.name;
  const [grad0]  = catGradient(catName);
  const emoji    = catEmoji(catName);
  const heroImg  = pref?.images?.[0]?.url;
  const mediaUri = mediaFile?.uri;

  // For photo/video: show picked media. For card: show preference hero image.
  // Fall back to gradient colour when nothing is available.
  const bgUri = storyType === 'card' ? (heroImg || null) : (mediaUri || null);
  const showGradient = !bgUri;

  return (
    <View style={[prev.frame, { width: PREVIEW_W, height: PREVIEW_H }]}>
      {/* background — picked photo/video or preference image; gradient fallback */}
      {showGradient
        ? <View style={[prev.fill, { backgroundColor: grad0 }]} />
        : <Image key={bgUri} source={{ uri: bgUri }} style={prev.fill} resizeMode="cover" />
      }
      <View style={prev.dimTop} />
      <View style={prev.dimBot} />

      {/* category badge */}
      {catName && (
        <View style={prev.badge}>
          <Text style={prev.badgeEmoji}>{emoji}</Text>
          <Text style={prev.badgeTxt}>{catName.toUpperCase()}</Text>
        </View>
      )}

      {/* bottom info */}
      {pref && (
        <View style={prev.info}>
          <Text style={prev.infoTitle} numberOfLines={2}>{pref.title}</Text>
          {caption ? <Text style={prev.caption} numberOfLines={2}>"{caption}"</Text> : null}
          {pref.rating ? (
            <View style={prev.stars}>
              {Array.from({ length: 5 }, (_, i) => (
                <Icon key={i} name={i < pref.rating ? 'star' : 'star-outline'} size={11} color="#f59e0b" />
              ))}
            </View>
          ) : null}
        </View>
      )}

      {!pref && (
        <View style={prev.empty}>
          <Icon name="image-outline" size={32} color="rgba(255,255,255,0.4)" />
          <Text style={prev.emptyTxt}>Select a preference</Text>
        </View>
      )}

      {/* type chip */}
      <View style={prev.typeChip}>
        <Icon name={TYPES.find(t => t.key === storyType)?.icon} size={12} color="#fff" />
        <Text style={prev.typeLabel}>{storyType}</Text>
      </View>
    </View>
  );
}

const prev = StyleSheet.create({
  frame:    { borderRadius: 18, overflow: 'hidden', backgroundColor: '#222' },
  fill:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dimTop:   { position: 'absolute', top: 0, left: 0, right: 0, height: 100, backgroundColor: 'rgba(0,0,0,0.35)' },
  dimBot:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, backgroundColor: 'rgba(0,0,0,0.55)' },
  badge: {
    position: 'absolute', top: 14, left: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  badgeEmoji: { fontSize: 12 },
  badgeTxt:   { fontSize: 10, fontWeight: '800', color: '#F27322', letterSpacing: 0.3 },
  info:       { position: 'absolute', bottom: 20, left: 16, right: 16 },
  infoTitle:  { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  caption:    { color: 'rgba(255,255,255,0.8)', fontSize: 12, lineHeight: 17, marginBottom: 6, fontStyle: 'italic' },
  stars:      { flexDirection: 'row', gap: 2 },
  empty:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTxt:   { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  typeChip: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 14,
  },
  typeLabel: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
});

// ── Preference card chip (horizontal scroll) ──────────────────────────────────
function PrefChip({ pref, selected, onPress, colors }) {
  const [top] = catGradient(pref?.category?.name);
  const emoji = catEmoji(pref?.category?.name);
  return (
    <TouchableOpacity
      style={[chip.wrap, { borderColor: selected ? colors.primary : colors.border, borderWidth: selected ? 2 : 1 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[chip.thumb, { backgroundColor: top }]}>
        {pref?.images?.[0]?.url
          ? <Image source={{ uri: pref.images[0].url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <Text style={{ fontSize: 16 }}>{emoji}</Text>}
      </View>
      <Text style={[chip.label, { color: colors.textPrimary }]} numberOfLines={2}>{pref.title}</Text>
      {selected && <View style={[chip.check, { backgroundColor: colors.primary }]}><Icon name="checkmark" size={10} color="#fff" /></View>}
    </TouchableOpacity>
  );
}
const chip = StyleSheet.create({
  wrap:  { width: 100, borderRadius: 14, overflow: 'hidden', alignItems: 'center', paddingBottom: 8 },
  thumb: { width: '100%', height: 72, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '600', textAlign: 'center', paddingHorizontal: 6, marginTop: 6, lineHeight: 14 },
  check: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CreateStoryScreen({ navigation, route }) {
  const { onCreated } = route.params || {};
  const { colors, isDark } = useTheme();

  const [prefs, setPrefs]             = useState([]);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [selectedPref, setSelectedPref] = useState(null);

  const [storyType, setStoryType]     = useState('card');
  const [mediaFile, setMediaFile]     = useState(null);

  const [caption, setCaption]         = useState('');
  const [audience, setAudience]       = useState('friends');

  const [uploading, setUploading]     = useState(false);

  // fetch own preferences
  useEffect(() => {
    preferencesAPI.list()
      .then(res => {
        const list = res?.data?.preferences || res?.data || [];
        setPrefs(list);
        if (list.length > 0) setSelectedPref(list[0]);
      })
      .catch(() => {})
      .finally(() => setPrefsLoading(false));
  }, []);

  const pickMedia = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: storyType === 'video' ? 'video' : 'photo',
      quality: 0.85,
      maxWidth: 1080,
      videoQuality: 'medium',
      durationLimit: 15,
    });
    if (!result.didCancel && result.assets?.[0]) {
      setMediaFile(result.assets[0]);
    }
  }, [storyType]);

  const handleTypeChange = (key) => {
    setStoryType(key);
    setMediaFile(null);
  };

  const canShare = !!selectedPref;

  const handleShare = async () => {
    if (!selectedPref) {
      Alert.alert('Pick a preference', 'Choose a preference to share as a story.');
      return;
    }
    if (storyType !== 'card' && !mediaFile) {
      Alert.alert('No media', `Please pick a ${storyType} first.`);
      return;
    }

    setUploading(true);
    try {
      const cap = caption.trim() || null;
      const res = storyType === 'card'
        ? await storiesAPI.createFromCard(selectedPref.id, cap, audience)
        : await storiesAPI.create(mediaFile, cap, audience);

      if (res.success) {
        const story    = res.data.story;
        const newGroup = { user: story.user, is_own: true, all_viewed: false, stories: [story] };
        onCreated?.(newGroup);
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to post story.');
    } finally {
      setUploading(false);
    }
  };

  const bg   = isDark ? colors.background : '#F2F2F7';
  const card = isDark ? colors.cardBackground : '#FFFFFF';

  return (
    <SafeAreaView style={[s.root, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[s.cancel, { color: colors.textPrimary }]}>Cancel</Text>
        </TouchableOpacity>
        <View style={s.pill} />
        <TouchableOpacity
          style={[s.shareBtn, {
            backgroundColor: canShare ? colors.primary : colors.border,
            opacity: uploading ? 0.7 : 1,
          }]}
          onPress={handleShare}
          disabled={!canShare || uploading}
        >
          {uploading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.shareTxt}>Share</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[s.body, { backgroundColor: bg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── 1. Pick a preference ── */}
          <View style={[s.section, { backgroundColor: card }]}>
            <SectionHeader n="1" title="Pick a preference" colors={colors} />
            {prefsLoading && (
              <ActivityIndicator color={colors.primary} style={{ paddingVertical: 16 }} />
            )}
            {!prefsLoading && prefs.length === 0 && (
              <Text style={[s.emptyTxt, { color: colors.textSecondary }]}>No preferences yet — create one first.</Text>
            )}
            {!prefsLoading && prefs.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.chipRow}
              >
                {prefs.map(p => (
                  <PrefChip
                    key={p.id}
                    pref={p}
                    selected={selectedPref?.id === p.id}
                    onPress={() => setSelectedPref(p)}
                    colors={colors}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          {/* ── 2. Story type ── */}
          <View style={[s.section, { backgroundColor: card }]}>
            <SectionHeader n="2" title="Choose your story type" colors={colors} />
            <View style={s.typeRow}>
              {TYPES.map(t => {
                const active = storyType === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[s.typeTile, {
                      borderColor:       active ? colors.primary : colors.border,
                      backgroundColor:   active ? colors.primary + '15' : card,
                    }]}
                    onPress={() => handleTypeChange(t.key)}
                    activeOpacity={0.75}
                  >
                    <Icon name={t.icon} size={24} color={active ? colors.primary : colors.textSecondary} />
                    <Text style={[s.typeLbl, { color: active ? colors.primary : colors.textSecondary }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* media picker for photo/video */}
            {storyType !== 'card' && (
              <TouchableOpacity
                style={[s.mediaPicker, {
                  borderColor: colors.border,
                  backgroundColor: isDark ? colors.cardBackground : '#f8fafc',
                }]}
                onPress={pickMedia}
                activeOpacity={0.8}
              >
                {mediaFile ? (
                  <Image source={{ uri: mediaFile.uri }} style={s.mediaImg} resizeMode="cover" />
                ) : (
                  <View style={s.mediaEmpty}>
                    <Icon name={storyType === 'video' ? 'videocam-outline' : 'image-outline'} size={30} color={colors.textTertiary} />
                    <Text style={[s.mediaEmptyTxt, { color: colors.textSecondary }]}>
                      {storyType === 'video' ? 'Pick a video (max 15s)' : 'Pick a photo'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* ── 3. Caption ── */}
          <View style={[s.section, { backgroundColor: card }]}>
            <SectionHeader n="3" title="Add a caption" colors={colors} />
            <TextInput
              style={[s.captionInput, { color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="What do you want to say about this? (optional)"
              placeholderTextColor={colors.textSecondary}
              value={caption}
              onChangeText={t => setCaption(t.slice(0, 180))}
              multiline
              maxLength={180}
            />
            <Text style={[s.charCount, { color: colors.textTertiary }]}>{caption.length}/180</Text>
          </View>

          {/* ── 4. Audience ── */}
          <View style={[s.section, { backgroundColor: card }]}>
            <SectionHeader n="4" title="Who can see it?" colors={colors} />
            {AUDIENCE.map(a => {
              const active = audience === a.key;
              return (
                <TouchableOpacity
                  key={a.key}
                  style={[s.audienceRow, {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary + '0C' : 'transparent',
                  }]}
                  onPress={() => setAudience(a.key)}
                  activeOpacity={0.75}
                >
                  <View style={[s.audienceIcon, { backgroundColor: active ? colors.primary + '20' : colors.border + '40' }]}>
                    <Icon name={a.icon} size={18} color={active ? colors.primary : colors.textSecondary} />
                  </View>
                  <View style={s.audienceMeta}>
                    <Text style={[s.audienceLbl, { color: active ? colors.primary : colors.textPrimary }]}>{a.label}</Text>
                    <Text style={[s.audienceSub, { color: colors.textSecondary }]}>{a.sub}</Text>
                  </View>
                  <View style={[s.radio, {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : 'transparent',
                  }]}>
                    {active && <Icon name="checkmark" size={11} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Live 9:16 preview ── */}
          <Text style={[s.previewLabel, { color: colors.textSecondary }]}>PREVIEW</Text>
          <LivePreview
            pref={selectedPref}
            storyType={storyType}
            mediaFile={mediaFile}
            caption={caption}
            colors={colors}
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#00000018',
  },
  cancel:   { fontSize: 16 },
  pill:     { width: 36, height: 5, borderRadius: 3, backgroundColor: '#C7C7CC' },
  shareBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 22 },
  shareTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48, gap: 12 },

  section: { borderRadius: 18, padding: 16 },

  emptyTxt: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },

  chipRow: { gap: 10, paddingBottom: 2 },

  typeRow:  { flexDirection: 'row', gap: 10 },
  typeTile: { flex: 1, borderWidth: 2, borderRadius: 14, paddingVertical: 16, alignItems: 'center', gap: 7 },
  typeLbl:  { fontSize: 12, fontWeight: '700' },

  mediaPicker: { marginTop: 12, height: 160, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  mediaImg:    { width: '100%', height: '100%' },
  mediaEmpty:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  mediaEmptyTxt: { fontSize: 13 },

  captionInput: {
    fontSize: 15, lineHeight: 22, minHeight: 80,
    borderWidth: 1, borderRadius: 12, padding: 12,
  },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },

  audienceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 14, padding: 12, marginBottom: 8,
  },
  audienceIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  audienceMeta: { flex: 1 },
  audienceLbl:  { fontSize: 14, fontWeight: '700' },
  audienceSub:  { fontSize: 12, marginTop: 1 },
  radio:        { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

  previewLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginLeft: 4 },
});
