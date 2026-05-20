import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, StatusBar, ScrollView, Image,
  ActivityIndicator, TextInput, PanResponder, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';
import { useAuth } from '../../contexts/AuthContext';
import { storiesAPI, messagesAPI, preferencesAPI, fixImageUrl, fixVideoUrl } from '../../lib/api';

const { width: W, height: H } = Dimensions.get('window');
const SWIPE_THRESHOLD = 60;

const FALLBACK_COLORS = ['#6B63F5', '#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];
const REACTIONS       = ['❤️', '🔥', '😍'];

const CAT_GRADIENTS = [
  { keys: ['food', 'dining'],    top: '#f97316', bot: '#ea580c' },
  { keys: ['movie', 'film'],     top: '#8b5cf6', bot: '#6d28d9' },
  { keys: ['travel', 'trip'],    top: '#0ea5e9', bot: '#0284c7' },
  { keys: ['music'],             top: '#10b981', bot: '#059669' },
  { keys: ['game'],              top: '#f59e0b', bot: '#d97706' },
  { keys: ['book', 'read'],      top: '#f97316', bot: '#b45309' },
  { keys: ['sport', 'fitness'],  top: '#ec4899', bot: '#db2777' },
  { keys: ['tech', 'gadget'],    top: '#64748b', bot: '#475569' },
];
const CAT_EMOJIS = {
  book: '📚', restaurant: '🍽️', film: '🎬', airplane: '✈️',
  'musical-notes': '🎵', 'game-controller': '🎮', fitness: '💪', 'hardware-chip': '💻',
};
const CAT_ICONS = [
  { keys: ['food', 'dining'],   icon: 'restaurant' },
  { keys: ['movie', 'film'],    icon: 'film' },
  { keys: ['travel', 'trip'],   icon: 'airplane' },
  { keys: ['music'],            icon: 'musical-notes' },
  { keys: ['game'],             icon: 'game-controller' },
  { keys: ['book', 'read'],     icon: 'book' },
  { keys: ['sport', 'fitness'], icon: 'fitness' },
  { keys: ['tech', 'gadget'],   icon: 'hardware-chip' },
];

function catGradient(name) {
  if (!name) return ['#6B63F5', '#4f46e5'];
  const l = name.toLowerCase();
  const m = CAT_GRADIENTS.find(g => g.keys.some(k => l.includes(k)));
  return m ? [m.top, m.bot] : ['#6B63F5', '#4f46e5'];
}
function catEmoji(name) {
  if (!name) return '📁';
  const l = name.toLowerCase();
  const m = CAT_ICONS.find(g => g.keys.some(k => l.includes(k)));
  return m ? (CAT_EMOJIS[m.icon] || '📁') : '📁';
}

function timeAgo(ts) {
  if (!ts) return '';
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (secs < 60)   return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}
function getUsername(user) {
  return user?.name || user?.first_name || user?.username || 'User';
}

// ── Story background — image or video ────────────────────────────────────────
// Images stay visible indefinitely. Videos loop forever.
// A black background is shown while media loads to avoid the fallback-color flash.
function StoryMedia({ story, groupIdx, paused, muted, onVideoLoad }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgErr,    setImgErr]    = useState(false);
  const isCard  = story.media_type === 'card';
  const isVideo = story.media_type === 'video';

  const mediaUri  = isVideo ? fixVideoUrl(story.image_url) : fixImageUrl(story.image_url);
  const videoType = mediaUri?.toLowerCase().endsWith('.mov') ? 'video/mp4' : undefined;
  const fallback  = FALLBACK_COLORS[groupIdx % FALLBACK_COLORS.length];

  if (isCard) {
    const [gradTop, gradBot] = catGradient(story.preference?.category?.name);
    return (
      <View style={[med.full, { backgroundColor: gradBot }]}>
        <View style={[med.gradOverlay, { backgroundColor: gradTop }]} />
      </View>
    );
  }

  return (
    <View style={[med.full, { backgroundColor: fallback }]}>
      {isVideo ? (
        <Video
          source={{ uri: mediaUri, type: videoType }}
          style={med.full}
          resizeMode="cover"
          repeat={true}
          paused={paused}
          muted={muted}
          onLoad={onVideoLoad}
          onError={(e) => console.warn('[StoryVideo] error:', JSON.stringify(e))}
          ignoreSilentSwitch="ignore"
          playInBackground={false}
          playWhenInactive={false}
        />
      ) : (
        mediaUri && !imgErr && (
          <Image
            source={{ uri: mediaUri }}
            style={med.full}
            resizeMode="cover"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgErr(true)}
          />
        )
      )}
      {/* Loading spinner shown only until media is ready */}
      {!isVideo && !imgLoaded && !imgErr && (
        <ActivityIndicator
          style={med.loader}
          color="rgba(255,255,255,0.6)"
          size="large"
        />
      )}
      <View style={med.shadTop} />
      <View style={med.shadBot} />
    </View>
  );
}
const med = StyleSheet.create({
  full:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gradOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: H * 0.55, opacity: 0.85 },
  loader:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  shadTop:     { position: 'absolute', top: 0, left: 0, right: 0, height: 180, backgroundColor: 'rgba(0,0,0,0.45)' },
  shadBot:     { position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, backgroundColor: 'rgba(0,0,0,0.55)' },
});

// ── Inline preference save card ───────────────────────────────────────────────
function PinnedPrefCard({ story, isSaved, onSave }) {
  const pref     = story.preference;
  const catName  = pref?.category?.name;
  const subtitle = pref?.subtitle || pref?.author || pref?.artist || pref?.location || null;
  const emoji    = catEmoji(catName);
  const rating   = pref?.rating ?? 0;

  if (!pref) return null;

  return (
    <View style={pin.wrap}>
      <View style={pin.left}>
        <Text style={pin.emoji}>{emoji}</Text>
        <View style={pin.meta}>
          <Text style={pin.catLabel}>{catName ? catName.toUpperCase() : 'PREFERENCE'}</Text>
          <Text style={pin.title} numberOfLines={1}>{pref.title || 'Untitled'}</Text>
          {!!subtitle && <Text style={pin.subtitle} numberOfLines={1}>{subtitle}</Text>}
          {rating > 0 && (
            <View style={pin.starsRow}>
              {Array.from({ length: 5 }, (_, i) => (
                <Icon key={i} name={i < rating ? 'star' : 'star-outline'} size={10} color="#f59e0b" />
              ))}
            </View>
          )}
          {isSaved && <Text style={pin.savedEyebrow}>Saved to {catName || 'Preferences'} · Just now</Text>}
        </View>
      </View>
      {!!onSave && (
        <TouchableOpacity
          style={[pin.saveBtn, isSaved && pin.saveBtnActive]}
          onPress={onSave}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name={isSaved ? 'bookmark' : 'bookmark-outline'} size={14} color="#fff" />
          <Text style={pin.saveTxt}>{isSaved ? '✓ Saved' : 'Save'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const pin = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16, marginHorizontal: 14, marginBottom: 8,
    padding: 12, gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  left:         { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji:        { fontSize: 22 },
  meta:         { flex: 1 },
  catLabel:     { color: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  title:        { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 1 },
  subtitle:     { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 1 },
  starsRow:     { flexDirection: 'row', gap: 2, marginTop: 3 },
  savedEyebrow: { color: '#4ade80', fontSize: 10, marginTop: 3, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  saveBtnActive: { backgroundColor: '#6B63F5', borderColor: '#6B63F5' },
  saveTxt:       { color: '#fff', fontSize: 12, fontWeight: '700' },
});

// ── Card story rich content ───────────────────────────────────────────────────
function CardStoryContent({ story, isSaved, onSave }) {
  const pref    = story.preference;
  const catName = pref?.category?.name;
  const emoji   = catEmoji(catName);
  const heroImg = pref?.images?.[0]?.url;
  const rating  = pref?.rating ?? 0;
  const label   = catName ? catName.toUpperCase() : 'PREFERENCE';

  return (
    <View style={card.wrap}>
      <View style={card.activityRow}>
        <Text style={card.activityEmoji}>{emoji}</Text>
        <Text style={card.activityLabel}>{label}</Text>
      </View>
      <View style={card.prefCard}>
        <View style={card.coverWrap}>
          {heroImg
            ? <Image source={{ uri: heroImg }} style={card.cover} resizeMode="cover" />
            : <View style={[card.cover, card.coverFallback]} />}
          <View style={card.catBadge}>
            <Text style={card.catBadgeEmoji}>{emoji}</Text>
            <Text style={card.catBadgeTxt}>{catName || 'Card'}</Text>
          </View>
        </View>
        <View style={card.infoWrap}>
          <Text style={card.title} numberOfLines={2}>{pref?.title || 'Untitled'}</Text>
          {rating > 0 && (
            <View style={card.starsRow}>
              {Array.from({ length: 5 }, (_, i) => (
                <Icon key={i} name={i < rating ? 'star' : 'star-outline'} size={13} color="#f59e0b" />
              ))}
            </View>
          )}
        </View>
        {pref && (
          <TouchableOpacity
            style={[card.saveBtn, isSaved && card.saveBtnActive]}
            onPress={onSave}
            activeOpacity={0.75}
          >
            <Icon name={isSaved ? 'bookmark' : 'bookmark-outline'} size={15} color="#fff" />
            <Text style={card.saveTxt}>{isSaved ? '✓ Saved' : 'Save'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {!!story.caption && (
        <Text style={card.caption} numberOfLines={3}>"{story.caption}"</Text>
      )}
      {isSaved && (
        <Text style={card.savedEyebrow}>Saved to {catName || 'Preferences'} · Just now</Text>
      )}
    </View>
  );
}
const card = StyleSheet.create({
  wrap:          { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16 },
  activityRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  activityEmoji: { fontSize: 14 },
  activityLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  prefCard:      { width: W - 64, borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.35)' },
  coverWrap:     { width: '100%', height: (W - 64) * 0.65 },
  cover:         { width: '100%', height: '100%' },
  coverFallback: { backgroundColor: 'rgba(255,255,255,0.15)' },
  catBadge: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  catBadgeEmoji: { fontSize: 11 },
  catBadgeTxt:   { fontSize: 10, fontWeight: '800', color: '#c2410c', letterSpacing: 0.3 },
  infoWrap:      { padding: 14 },
  title:         { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginBottom: 6 },
  starsRow:      { flexDirection: 'row', gap: 2 },
  caption:       { marginTop: 14, color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 19, textAlign: 'center', fontStyle: 'italic' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14, paddingVertical: 8,
    margin: 12, marginTop: 0,
    borderRadius: 20, alignSelf: 'flex-end',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  saveBtnActive: { backgroundColor: '#6B63F5', borderColor: '#6B63F5' },
  saveTxt:       { color: '#fff', fontSize: 12, fontWeight: '700' },
  savedEyebrow:  { color: '#4ade80', fontSize: 11, fontWeight: '600', marginTop: 10 },
});

// ── Viewers sheet ─────────────────────────────────────────────────────────────
function ViewersSheet({ storyId, viewsCount, onClose }) {
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storiesAPI.viewers(storyId)
      .then(r => { if (r.success) setViewers(r.data?.viewers || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storyId]);

  return (
    <TouchableOpacity style={vs.overlay} activeOpacity={1} onPress={onClose}>
      <View style={vs.sheet}>
        <View style={vs.handle} />
        <Text style={vs.title}>Viewers · {viewsCount}</Text>
        {loading
          ? <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
          : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {viewers.length === 0 && <Text style={vs.empty}>No views yet</Text>}
              {viewers.map((v, i) => {
                const u    = v.user;
                const name = getUsername(u);
                return (
                  <View key={u?.id ?? i} style={vs.row}>
                    {u?.avatar_url
                      ? <Image source={{ uri: u.avatar_url }} style={vs.avatar} />
                      : (
                        <View style={[vs.avatarPh, { backgroundColor: FALLBACK_COLORS[i % FALLBACK_COLORS.length] }]}>
                          <Text style={vs.initial}>{name[0].toUpperCase()}</Text>
                        </View>
                      )}
                    <View style={vs.info}>
                      <Text style={vs.name}>{name}</Text>
                      <Text style={vs.time}>{timeAgo(v.viewed_at)}</Text>
                    </View>
                    <Icon name="eye-outline" size={15} color="rgba(255,255,255,0.4)" />
                  </View>
                );
              })}
            </ScrollView>
          )}
      </View>
    </TouchableOpacity>
  );
}
const vs = StyleSheet.create({
  overlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  sheet:    { backgroundColor: '#1c1c1e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, maxHeight: H * 0.55 },
  handle:   { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:    { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 14 },
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  avatar:   { width: 38, height: 38, borderRadius: 19 },
  avatarPh: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  initial:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  info:     { flex: 1 },
  name:     { color: '#fff', fontSize: 14, fontWeight: '600' },
  time:     { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 1 },
  empty:    { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 24, fontSize: 14 },
});

// ── Caption card ──────────────────────────────────────────────────────────────
function CaptionCard({ story }) {
  if (!story.caption) return null;
  const icon = story.media_type === 'card' ? 'bookmark' : 'chatbubble-ellipses-outline';
  return (
    <View style={pc.wrap}>
      <Icon name={icon} size={14} color="#a5b4fc" />
      <Text style={pc.text} numberOfLines={3}>{story.caption}</Text>
    </View>
  );
}
const pc = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, padding: 12, marginHorizontal: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  text: { flex: 1, color: '#fff', fontSize: 13, lineHeight: 18 },
});

// ── Reply bar ─────────────────────────────────────────────────────────────────
function ReplyBar({ authorName, authorId, storyId, author, navigation, onPause, onResume }) {
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState('');
  const [reaction, setReaction] = useState(null);

  const sendReply = async () => {
    if (!text.trim()) return;
    setSending('sending');
    try {
      await messagesAPI.sendStoryReply(authorId, storyId, text.trim());
      setText('');
      setSending('sent');
      setTimeout(() => {
        setSending('');
        navigation.navigate('Chat', { userId: authorId, user: author });
      }, 800);
    } catch {
      setSending('');
    }
  };

  const sendReaction = async (emoji) => {
    setReaction(emoji);
    try {
      await messagesAPI.sendStoryReply(authorId, storyId, emoji);
    } catch { /* silent */ }
    setTimeout(() => setReaction(null), 1500);
  };

  return (
    <View style={rb.wrap}>
      <View style={rb.row}>
        <TextInput
          style={rb.input}
          placeholder={`Reply to ${authorName}...`}
          placeholderTextColor="rgba(255,255,255,0.55)"
          value={text}
          onChangeText={setText}
          onFocus={onPause}
          onBlur={onResume}
          returnKeyType="send"
          onSubmitEditing={sendReply}
          submitBehavior="submit"
        />
        {text.trim() ? (
          <TouchableOpacity
            style={rb.sendBtn}
            onPress={sendReply}
            disabled={sending === 'sending'}
            activeOpacity={0.75}
          >
            {sending === 'sending' && <ActivityIndicator size="small" color="#fff" />}
            {sending === 'sent'    && <Icon name="checkmark-circle" size={22} color="#4ade80" />}
            {sending === ''        && <Icon name="send" size={20} color="#fff" />}
          </TouchableOpacity>
        ) : (
          REACTIONS.map(e => (
            <TouchableOpacity
              key={e}
              style={[rb.emoji, reaction === e && rb.emojiActive]}
              onPress={() => sendReaction(e)}
              activeOpacity={0.7}
            >
              <Text style={rb.emojiTxt}>{e}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );
}
const rb = StyleSheet.create({
  wrap:        { paddingHorizontal: 14, paddingBottom: Platform.OS === 'ios' ? 8 : 14, paddingTop: 6 },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 18, color: '#fff', fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  emoji:       { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  emojiActive: { backgroundColor: 'rgba(255,255,255,0.3)', transform: [{ scale: 1.18 }] },
  emojiTxt:    { fontSize: 20 },
  sendBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
});

// ── Main viewer ───────────────────────────────────────────────────────────────
export default function StoryViewerScreen({ route, navigation }) {
  const { groups, startUserId } = route.params;
  const { user: me } = useAuth();

  const [groupIdx, setGroupIdx]   = useState(Math.max(0, groups.findIndex(g => g.user.id === startUserId)));
  const [storyIdx, setStoryIdx]   = useState(0);
  const [paused, setPaused]       = useState(false);
  const [muted, setMuted]         = useState(true);
  const [showViewers, setShowViewers] = useState(false);
  const [savedPrefIds, setSavedPrefIds] = useState(new Set());

  const viewedRef = useRef(new Set());

  // Always keep a current-value ref so callbacks never close over stale state
  const navRef = useRef({ groupIdx, storyIdx });
  useEffect(() => { navRef.current = { groupIdx, storyIdx }; });

  const currentGroup = groups[groupIdx];
  const currentStory = currentGroup?.stories?.[storyIdx];
  const isOwn        = currentGroup?.user?.id === me?.id;
  const author       = currentGroup?.user;
  const authorName   = getUsername(author);
  const isVideo      = currentStory?.media_type === 'video';
  const isCard       = currentStory?.media_type === 'card';
  const isMedia      = isVideo || currentStory?.media_type === 'image';

  const currentPrefId = currentStory?.preference?.id;
  const isPrefSaved   = currentPrefId != null && savedPrefIds.has(currentPrefId);

  const handleSave = useCallback(async () => {
    if (!currentPrefId) return;
    const wasSaved = savedPrefIds.has(currentPrefId);
    setSavedPrefIds(prev => {
      const next = new Set(prev);
      wasSaved ? next.delete(currentPrefId) : next.add(currentPrefId);
      return next;
    });
    try {
      if (wasSaved) await preferencesAPI.unsave(currentPrefId);
      else          await preferencesAPI.save(currentPrefId);
    } catch {
      setSavedPrefIds(prev => {
        const next = new Set(prev);
        wasSaved ? next.add(currentPrefId) : next.delete(currentPrefId);
        return next;
      });
    }
  }, [currentPrefId, savedPrefIds]);

  // Navigate between stories — reads from ref so it is safe to call from anywhere
  const advance = useCallback(() => {
    const { groupIdx: gi, storyIdx: si } = navRef.current;
    const stories = groups[gi]?.stories || [];
    if (si < stories.length - 1) {
      setStoryIdx(si + 1);
    } else if (gi < groups.length - 1) {
      setGroupIdx(gi + 1);
      setStoryIdx(0);
    } else {
      navigation.goBack();
    }
  }, [groups, navigation]);

  const goBack = useCallback(() => {
    const { groupIdx: gi, storyIdx: si } = navRef.current;
    if (si > 0) {
      setStoryIdx(si - 1);
    } else if (gi > 0) {
      const prev = groups[gi - 1];
      setGroupIdx(gi - 1);
      setStoryIdx(prev.stories.length - 1);
    }
  }, [groups]);

  // Mark viewed once per session
  useEffect(() => {
    if (!currentStory?.id || viewedRef.current.has(currentStory.id)) return;
    viewedRef.current.add(currentStory.id);
    storiesAPI.view(currentStory.id).catch(() => {});
  }, [currentStory?.id]);

  // Swipe left/right to jump between user groups
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) {
          setGroupIdx(prev => {
            const next = prev < groups.length - 1 ? prev + 1 : prev;
            if (next === prev) navigation.goBack();
            else setStoryIdx(0);
            return next;
          });
        } else if (g.dx > SWIPE_THRESHOLD) {
          setGroupIdx(prev => {
            if (prev > 0) { setStoryIdx(0); return prev - 1; }
            return prev;
          });
        }
      },
    })
  ).current;

  if (!currentGroup || !currentStory) {
    navigation.goBack();
    return null;
  }

  const stories = currentGroup.stories;

  return (
    <View style={st.container} {...panResponder.panHandlers}>
      <StatusBar barStyle="light-content" />

      {/* Full-screen media — image stays, video loops */}
      <StoryMedia
        key={`${groupIdx}-${storyIdx}`}
        story={currentStory}
        groupIdx={groupIdx}
        paused={paused}
        muted={muted}
        onVideoLoad={() => {}}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={st.overlay} edges={['top', 'bottom']}>

          {/* Story dots — simple indicator, no timed progress */}
          <View style={st.dotsRow}>
            {stories.map((s, i) => (
              <View
                key={s.id}
                style={[st.dot, i === storyIdx && st.dotActive]}
              />
            ))}
          </View>

          {/* Header */}
          <View style={st.header}>
            {author?.avatar_url
              ? <Image source={{ uri: author.avatar_url }} style={st.avatar} />
              : (
                <View style={[st.avatarPh, { backgroundColor: FALLBACK_COLORS[groupIdx % FALLBACK_COLORS.length] }]}>
                  <Text style={st.avatarInit}>{authorName[0].toUpperCase()}</Text>
                </View>
              )}
            <View style={st.headerMeta}>
              <Text style={st.headerName}>{authorName}</Text>
              <Text style={st.headerTime}>{timeAgo(currentStory.created_at)}</Text>
            </View>

            {isVideo && (
              <TouchableOpacity
                style={st.iconBtn}
                onPress={() => setMuted(m => !m)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name={muted ? 'volume-mute' : 'volume-high'} size={20} color="#fff" />
              </TouchableOpacity>
            )}

            {isOwn && (
              <TouchableOpacity
                style={st.eyeBtn}
                onPress={() => { setPaused(true); setShowViewers(true); }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="eye-outline" size={18} color="#fff" />
                <Text style={st.eyeCount}>{currentStory.views_count ?? 0}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Tap left/right to navigate stories */}
          <View style={st.tapZones}>
            <TouchableOpacity style={st.tapLeft} onPress={goBack} activeOpacity={1} />
            <TouchableOpacity style={st.tapRight} onPress={advance} activeOpacity={1} />
            {isCard && (
              <View style={st.cardContent} pointerEvents="box-none">
                <CardStoryContent
                  story={currentStory}
                  isSaved={isPrefSaved}
                  onSave={handleSave}
                />
              </View>
            )}
          </View>

          {/* Bottom: caption + pinned pref card + reply bar */}
          <View style={st.bottom}>
            {!isCard && <CaptionCard story={currentStory} />}
            {isMedia && currentStory?.preference && (
              <PinnedPrefCard
                story={currentStory}
                isSaved={isPrefSaved}
                onSave={isOwn ? null : handleSave}
              />
            )}
            {!isOwn && (
              <ReplyBar
                authorName={authorName}
                authorId={author?.id}
                storyId={currentStory?.id}
                author={author}
                navigation={navigation}
                onPause={() => setPaused(true)}
                onResume={() => setPaused(false)}
              />
            )}
          </View>

        </SafeAreaView>
      </KeyboardAvoidingView>

      {showViewers && (
        <ViewersSheet
          storyId={currentStory.id}
          viewsCount={currentStory.views_count ?? 0}
          onClose={() => { setShowViewers(false); setPaused(false); }}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#000' },
  overlay:    { flex: 1 },
  dotsRow:    { flexDirection: 'row', justifyContent: 'center', paddingTop: 8, gap: 6 },
  dot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive:  { backgroundColor: '#fff', width: 18 },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, gap: 10 },
  avatar:     { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#fff' },
  avatarPh:   { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  avatarInit: { color: '#fff', fontWeight: '700', fontSize: 15 },
  headerMeta: { flex: 1 },
  headerName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  headerTime: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  iconBtn:    { padding: 4 },
  eyeBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  eyeCount:   { color: '#fff', fontSize: 13, fontWeight: '600' },
  tapZones:   { flex: 1, flexDirection: 'row' },
  tapLeft:    { flex: 1 },
  tapRight:   { flex: 2 },
  cardContent:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  bottom:     { justifyContent: 'flex-end' },
});
