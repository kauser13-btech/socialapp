import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, StatusBar, ScrollView, Image,
  ActivityIndicator, TextInput, PanResponder, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';
import { storiesAPI, messagesAPI } from '../../lib/api';

const { width: W, height: H } = Dimensions.get('window');
const STORY_DURATION  = 5000;
const SWIPE_THRESHOLD = 60;

const FALLBACK_COLORS = ['#f97316', '#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];
const REACTIONS       = ['❤️', '🔥', '😍', '😮', '👏', '😢'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return '';
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (secs < 60)   return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function userName(user) {
  return user?.name || user?.first_name || user?.username || 'User';
}

// ── Progress bar segment ──────────────────────────────────────────────────────
function ProgressSegment({ active, done, duration }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(done ? 1 : 0);
    if (active) {
      Animated.timing(anim, { toValue: 1, duration, useNativeDriver: false }).start();
    } else if (!done) {
      anim.setValue(0);
    }
  }, [active, done]);

  return (
    <View style={seg.track}>
      <Animated.View style={[seg.fill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}
const seg = StyleSheet.create({
  track: { flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, overflow: 'hidden' },
  fill:  { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
});

// ── Story background ──────────────────────────────────────────────────────────
function StoryBg({ story, groupIdx }) {
  const [err, setErr] = useState(false);
  const fallback = FALLBACK_COLORS[groupIdx % FALLBACK_COLORS.length];
  return (
    <View style={[bg.full, { backgroundColor: fallback }]}>
      {story.image_url && !err && (
        <Image source={{ uri: story.image_url }} style={bg.img} resizeMode="cover" onError={() => setErr(true)} />
      )}
      <View style={bg.shadTop} />
      <View style={bg.shadBot} />
    </View>
  );
}
const bg = StyleSheet.create({
  full:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  img:     { width: W, height: H },
  shadTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 180, backgroundColor: 'rgba(0,0,0,0.45)' },
  shadBot: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, backgroundColor: 'rgba(0,0,0,0.55)' },
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
                const name = userName(u);
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

// ── Pinned preference card (shown on card-type stories) ───────────────────────
function PinnedCard({ story }) {
  if (!story.caption) return null;
  return (
    <View style={pc.wrap}>
      <View style={pc.left}>
        <Icon name="bookmark" size={14} color="#6366f1" />
      </View>
      <Text style={pc.text} numberOfLines={2}>{story.caption}</Text>
    </View>
  );
}
const pc = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14, padding: 12, marginHorizontal: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  left: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(99,102,241,0.25)', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, color: '#fff', fontSize: 13, lineHeight: 18 },
});

// ── Reply bar ─────────────────────────────────────────────────────────────────
function ReplyBar({ authorName, authorId, onPause, onResume, story }) {
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState('');   // '' | 'sending' | 'sent'
  const [reaction, setReaction] = useState(null);

  const sendReply = async () => {
    if (!text.trim()) return;
    setSending('sending');
    try {
      await messagesAPI.sendMessage({ receiver_id: authorId, content: text.trim() });
      setText('');
      setSending('sent');
      setTimeout(() => setSending(''), 2000);
    } catch {
      setSending('');
    }
  };

  const sendReaction = async (emoji) => {
    setReaction(emoji);
    try {
      await messagesAPI.sendMessage({ receiver_id: authorId, content: emoji });
    } catch {
      // silent
    }
    setTimeout(() => setReaction(null), 1500);
  };

  return (
    <View style={rb.wrap}>
      {/* emoji reactions row */}
      <View style={rb.emojiRow}>
        {REACTIONS.map(e => (
          <TouchableOpacity
            key={e}
            style={[rb.emoji, reaction === e && rb.emojiActive]}
            onPress={() => sendReaction(e)}
            activeOpacity={0.7}
          >
            <Text style={rb.emojiTxt}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* text input row */}
      <View style={rb.inputRow}>
        <TextInput
          style={rb.input}
          placeholder={`Reply to ${authorName}…`}
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={text}
          onChangeText={setText}
          onFocus={onPause}
          onBlur={onResume}
          returnKeyType="send"
          onSubmitEditing={sendReply}
          submitBehavior="submit"
        />
        <TouchableOpacity
          style={[rb.sendBtn, { opacity: text.trim() ? 1 : 0.4 }]}
          onPress={sendReply}
          disabled={!text.trim() || sending === 'sending'}
        >
          {sending === 'sending' && <ActivityIndicator size="small" color="#fff" />}
          {sending === 'sent'    && <Icon name="checkmark-circle" size={22} color="#4ade80" />}
          {sending === ''        && <Icon name="send" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}
const rb = StyleSheet.create({
  wrap:      { paddingHorizontal: 12, paddingBottom: Platform.OS === 'ios' ? 8 : 12 },
  emojiRow:  { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  emoji:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  emojiActive: { backgroundColor: 'rgba(255,255,255,0.30)', transform: [{ scale: 1.2 }] },
  emojiTxt:  { fontSize: 20 },
  inputRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 16, color: '#fff', fontSize: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  sendBtn:   { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
});

// ── Main viewer ───────────────────────────────────────────────────────────────
export default function StoryViewerScreen({ route, navigation }) {
  const { groups, startUserId } = route.params;
  const { user: me } = useAuth();

  const [groupIdx, setGroupIdx] = useState(
    Math.max(0, groups.findIndex(g => g.user.id === startUserId))
  );
  const [storyIdx, setStoryIdx]   = useState(0);
  const [paused, setPaused]       = useState(false);
  const [showViewers, setShowViewers] = useState(false);

  const timerRef  = useRef(null);
  const viewedRef = useRef(new Set());

  const currentGroup = groups[groupIdx];
  const currentStory = currentGroup?.stories?.[storyIdx];
  const isOwn        = currentGroup?.user?.id === me?.id;
  const author       = currentGroup?.user;
  const authorName   = userName(author);

  // mark viewed
  useEffect(() => {
    if (!currentStory?.id || viewedRef.current.has(currentStory.id)) return;
    viewedRef.current.add(currentStory.id);
    storiesAPI.view(currentStory.id).catch(() => {});
  }, [currentStory?.id]);

  const advance = useCallback(() => {
    const stories = currentGroup?.stories || [];
    if (storyIdx < stories.length - 1) {
      setStoryIdx(s => s + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(g => g + 1);
      setStoryIdx(0);
    } else {
      navigation.goBack();
    }
  }, [currentGroup, storyIdx, groupIdx, groups.length, navigation]);

  const goBack = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx(s => s - 1);
    } else if (groupIdx > 0) {
      const prev = groups[groupIdx - 1];
      setGroupIdx(g => g - 1);
      setStoryIdx(prev.stories.length - 1);
    }
  }, [storyIdx, groupIdx, groups]);

  // auto-advance timer
  useEffect(() => {
    if (!currentStory || paused) return;
    timerRef.current = setTimeout(advance, STORY_DURATION);
    return () => clearTimeout(timerRef.current);
  }, [groupIdx, storyIdx, paused, advance]);

  // horizontal swipe to next/prev user group
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) {
          // swipe left → next group
          setGroupIdx(prev => {
            if (prev < groups.length - 1) { setStoryIdx(0); return prev + 1; }
            navigation.goBack();
            return prev;
          });
        } else if (g.dx > SWIPE_THRESHOLD) {
          // swipe right → prev group
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

      <StoryBg story={currentStory} groupIdx={groupIdx} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={st.overlay} edges={['top', 'bottom']}>

          {/* progress bars */}
          <View style={st.progressRow}>
            {stories.map((s, i) => (
              <ProgressSegment
                key={s.id}
                active={i === storyIdx && !paused}
                done={i < storyIdx}
                duration={STORY_DURATION}
              />
            ))}
          </View>

          {/* header: avatar + name + time + eye + close */}
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

          {/* tap zones (left = back, right = next) */}
          <View style={st.tapZones}>
            <TouchableOpacity style={st.tapLeft} onPress={goBack} activeOpacity={1} />
            <TouchableOpacity
              style={st.tapRight}
              onPressIn={() => { clearTimeout(timerRef.current); setPaused(true); }}
              onPressOut={() => setPaused(false)}
              onPress={advance}
              activeOpacity={1}
            />
          </View>

          {/* bottom: pinned card + reply bar */}
          <View style={st.bottom}>
            <PinnedCard story={currentStory} />
            {!isOwn && (
              <ReplyBar
                authorName={authorName}
                authorId={author?.id}
                onPause={() => setPaused(true)}
                onResume={() => setPaused(false)}
                story={currentStory}
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
  container: { flex: 1, backgroundColor: '#000' },
  overlay:   { flex: 1 },

  progressRow: { flexDirection: 'row', paddingHorizontal: 10, paddingTop: 6, gap: 4 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, gap: 10 },
  avatar:   { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#fff' },
  avatarPh: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  avatarInit: { color: '#fff', fontWeight: '700', fontSize: 15 },
  headerMeta: { flex: 1 },
  headerName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  headerTime: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  eyeBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  eyeCount:  { color: '#fff', fontSize: 13, fontWeight: '600' },

  tapZones: { flex: 1, flexDirection: 'row' },
  tapLeft:  { flex: 1 },
  tapRight: { flex: 2 },

  bottom: { justifyContent: 'flex-end' },
});
