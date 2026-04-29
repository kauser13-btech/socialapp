import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, StatusBar, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../contexts/AuthContext';

const { height: H } = Dimensions.get('window');
const STORY_DURATION = 5000;

// Gradient backgrounds used instead of real images
const STORY_GRADIENTS = [
  ['#f97316', '#ec4899'],
  ['#6366f1', '#06b6d4'],
  ['#a855f7', '#f97316'],
  ['#10b981', '#6366f1'],
  ['#f59e0b', '#ef4444'],
  ['#ec4899', '#a855f7'],
];

// ─── Progress segment ─────────────────────────────────────────────────────────
function ProgressSegment({ active, done, duration }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(done ? 1 : 0);
    if (active) {
      Animated.timing(anim, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      }).start();
    } else if (!done) {
      anim.setValue(0);
    }
  }, [active, done]);

  return (
    <View style={seg.track}>
      <Animated.View
        style={[seg.fill, { width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
      />
    </View>
  );
}
const seg = StyleSheet.create({
  track: { flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
});

// ─── Viewers bottom sheet ─────────────────────────────────────────────────────
function ViewersSheet({ viewers, onClose }) {
  return (
    <TouchableOpacity style={vs.overlay} activeOpacity={1} onPress={onClose}>
      <View style={vs.sheet}>
        <View style={vs.handle} />
        <Text style={vs.title}>Viewers ({viewers.length})</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {viewers.map((v) => (
            <View key={v.id} style={vs.row}>
              <View style={[vs.avatar, { backgroundColor: STORY_GRADIENTS[v.id % STORY_GRADIENTS.length][0] }]}>
                <Text style={vs.initial}>{v.name[0]}</Text>
              </View>
              <View style={vs.info}>
                <Text style={vs.name}>{v.name}</Text>
                <Text style={vs.time}>{v.time}</Text>
              </View>
              <Icon name="eye-outline" size={16} color="rgba(255,255,255,0.4)" />
            </View>
          ))}
          {viewers.length === 0 && (
            <Text style={vs.empty}>No views yet</Text>
          )}
        </ScrollView>
      </View>
    </TouchableOpacity>
  );
}
const vs = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    maxHeight: H * 0.55,
  },
  handle: { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontWeight: '700', fontSize: 15 },
  info: { flex: 1 },
  name: { color: '#fff', fontSize: 14, fontWeight: '600' },
  time: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 1 },
  empty: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 24, fontSize: 14 },
});

// ─── Story card background (gradient simulation with two layers) ───────────────
function StoryBackground({ story, groupIdx, storyIdx }) {
  const colorIdx = (groupIdx * 3 + storyIdx) % STORY_GRADIENTS.length;
  const [top, bottom] = STORY_GRADIENTS[colorIdx];
  return (
    <View style={[bg.full, { backgroundColor: top }]}>
      {/* Simulate gradient with an overlapping bottom view */}
      <View style={[bg.bottomHalf, { backgroundColor: bottom }]} />

      {/* Story content card */}
      <View style={bg.contentCard}>
        <Text style={bg.emoji}>{story.emoji}</Text>
        <Text style={bg.bookTitle}>{story.title}</Text>
        <Text style={bg.author}>{story.author}</Text>
        {story.quote ? (
          <Text style={bg.quote}>"{story.quote}"</Text>
        ) : null}
        <View style={bg.ratingRow}>
          {[1, 2, 3, 4, 5].map(i => (
            <Icon
              key={i}
              name={i <= Math.floor(story.rating) ? 'star' : 'star-outline'}
              size={16}
              color="#f59e0b"
            />
          ))}
          <Text style={bg.ratingNum}>{story.rating}</Text>
        </View>
      </View>

      {/* Category pill */}
      <View style={bg.categoryPill}>
        <Text style={bg.categoryText}>{story.emoji} {story.category}</Text>
      </View>
    </View>
  );
}
const bg = StyleSheet.create({
  full: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bottomHalf: { position: 'absolute', bottom: 0, left: 0, right: 0, height: H * 0.45, opacity: 0.7 },
  contentCard: {
    position: 'absolute',
    bottom: H * 0.18,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    padding: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  emoji: { fontSize: 36, marginBottom: 4 },
  bookTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  author: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '500' },
  quote: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 19, fontStyle: 'italic', marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  ratingNum: { color: '#f59e0b', fontWeight: '700', fontSize: 13, marginLeft: 4 },
  categoryPill: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    left: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  categoryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

// ─── Main Viewer ──────────────────────────────────────────────────────────────
export default function StoryViewerScreen({ route, navigation }) {
  const { groups, startUserId } = route.params;
  const { user: me } = useAuth();

  const [groupIdx, setGroupIdx] = useState(
    Math.max(0, groups.findIndex(g => g.user.id === startUserId))
  );
  const [storyIdx, setStoryIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);

  const timerRef = useRef(null);

  const currentGroup = groups[groupIdx];
  const currentStory = currentGroup?.stories?.[storyIdx];
  const isOwnStory = currentGroup?.user?.id === me?.id;

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
      const prevGroup = groups[groupIdx - 1];
      setGroupIdx(g => g - 1);
      setStoryIdx(prevGroup.stories.length - 1);
    }
  }, [storyIdx, groupIdx, groups]);

  useEffect(() => {
    if (!currentStory || paused) return;
    timerRef.current = setTimeout(advance, STORY_DURATION);
    return () => clearTimeout(timerRef.current);
  }, [groupIdx, storyIdx, paused, advance]);

  if (!currentGroup || !currentStory) {
    navigation.goBack();
    return null;
  }

  const stories = currentGroup.stories;
  const user = currentGroup.user;

  const timeAgo = (() => {
    const secs = Math.floor((Date.now() - currentStory.created_at) / 1000);
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    return `${Math.floor(secs / 3600)}h ago`;
  })();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Colorful background with story content */}
      <StoryBackground story={currentStory} groupIdx={groupIdx} storyIdx={storyIdx} />

      {/* Dark overlay for readability at top */}
      <View style={styles.topGradient} />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>

        {/* Progress bars */}
        <View style={styles.progressRow}>
          {stories.map((s, i) => (
            <ProgressSegment
              key={s.id}
              active={i === storyIdx && !paused}
              done={i < storyIdx}
              duration={STORY_DURATION}
            />
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerAvatar, { backgroundColor: STORY_GRADIENTS[groupIdx % STORY_GRADIENTS.length][0] }]}>
            <Text style={styles.headerInitial}>{(user.first_name || user.name || '?')[0].toUpperCase()}</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.headerName}>{user.first_name || user.name}</Text>
            <Text style={styles.headerTime}>{timeAgo}</Text>
          </View>

          {isOwnStory && (
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => { setShowViewers(true); setPaused(true); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="eye-outline" size={20} color="#fff" />
              <Text style={styles.viewCount}>{currentStory.views_count}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Tap zones */}
        <View style={styles.tapZones}>
          <TouchableOpacity style={styles.tapLeft} onPress={goBack} activeOpacity={1} />
          <TouchableOpacity
            style={styles.tapRight}
            onPressIn={() => { clearTimeout(timerRef.current); setPaused(true); }}
            onPressOut={() => setPaused(false)}
            onPress={advance}
            activeOpacity={1}
          />
        </View>

        {/* Caption */}
        {currentStory.caption ? (
          <View style={styles.captionWrap}>
            <Text style={styles.caption}>{currentStory.caption}</Text>
          </View>
        ) : null}
      </SafeAreaView>

      {/* Viewers sheet */}
      {showViewers && (
        <ViewersSheet
          viewers={currentStory.viewers || []}
          onClose={() => { setShowViewers(false); setPaused(false); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 160,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  overlay: { flex: 1 },

  progressRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 6,
    gap: 4,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
  },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  headerInitial: { color: '#fff', fontWeight: '700', fontSize: 15 },
  headerMeta: { flex: 1 },
  headerName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  headerTime: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 4 },
  viewCount: { color: '#fff', fontSize: 13, fontWeight: '600' },
  closeBtn: { padding: 4 },

  tapZones: { flex: 1, flexDirection: 'row' },
  tapLeft: { flex: 1 },
  tapRight: { flex: 2 },

  captionWrap: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingTop: 10,
  },
  caption: { color: '#fff', fontSize: 15, lineHeight: 22 },
});
