import React, { useState, useCallback } from 'react';
import {
  View, Text, Image, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Loading } from '../../components/ui';
import { pollsAPI, preferencesAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import SharePollModal from '../../components/polls/SharePollModal';

// ─── Poll Option Row ──────────────────────────────────────────────────────────
function PollOption({ opt, totalVotes, isVoted, isWinner, closed, onVote }) {
  const pct = totalVotes > 0 ? Math.round(opt.votes / totalVotes * 100) : 0;
  const imgUrl = opt.preference?.images?.[0]?.url;
  const barColor = isWinner ? '#10b981' : '#4f6ef7';

  return (
    <TouchableOpacity
      style={[styles.optionRow, isVoted && styles.optionRowVoted]}
      onPress={() => { if (!closed) onVote(opt.id); }}
      activeOpacity={closed ? 1 : 0.75}
      disabled={closed}
    >
      <View style={styles.optionInner}>
        {/* Thumbnail */}
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.optionThumb} />
        ) : (
          <View style={[styles.optionThumbPlaceholder, { backgroundColor: barColor + '22' }]}>
            <Icon name="image-outline" size={14} color={barColor} />
          </View>
        )}

        {/* Text + bar */}
        <View style={{ flex: 1 }}>
          <View style={styles.optionMeta}>
            {isWinner && <Icon name="trophy" size={12} color="#10b981" style={{ marginRight: 3 }} />}
            <Text style={[styles.optionTitle, isVoted && { color: '#4f6ef7', fontWeight: '700' }]} numberOfLines={1}>
              {opt.preference?.title || 'Option'}
            </Text>
            {isVoted && <Icon name="checkmark-circle" size={13} color="#4f6ef7" style={{ marginLeft: 3 }} />}
          </View>
          <View style={styles.optionBarWrap}>
            <View style={styles.optionBarTrack}>
              <View style={[styles.optionBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
            </View>
            <Text style={[styles.optionPct, isWinner && { color: '#10b981', fontWeight: '700' }]}>{pct}%</Text>
          </View>
          <Text style={styles.optionVotes}>{opt.votes} vote{opt.votes === 1 ? '' : 's'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Poll Card ────────────────────────────────────────────────────────────────
function PollCard({ poll, currentUserId, colors, isDark, onUpdate }) {
  const [voting, setVoting] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const closed = poll.status === 'closed';
  const isCreator = poll.creator?.id === currentUserId;

  const handleVote = async (optionId) => {
    if (voting) return;
    setVoting(true);
    try {
      const res = await pollsAPI.vote(poll.id, optionId);
      if (res.success) onUpdate(res.data.poll);
    } catch { Alert.alert('Error', 'Failed to vote.'); }
    finally { setVoting(false); }
  };

  const handleClose = () => {
    Alert.alert('Close Poll', 'End this poll and reveal the winner?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Close', style: 'destructive', onPress: () => {
        pollsAPI.close(poll.id)
          .then(res => { if (res.success) onUpdate(res.data.poll); })
          .catch(() => Alert.alert('Error', 'Failed to close poll.'));
      }},
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Poll', 'Delete this poll permanently?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        pollsAPI.delete(poll.id)
          .then(() => onUpdate(null))
          .catch(() => Alert.alert('Error', 'Failed to delete poll.'));
      }},
    ]);
  };

  return (
    <View style={[styles.pollCard, { backgroundColor: isDark ? colors.cardBackground : '#fff', borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.pollHeader}>
        <View style={[styles.pollStatusDot, { backgroundColor: closed ? '#94a3b8' : '#10b981' }]} />
        <Text style={[styles.pollQuestion, { color: colors.textPrimary }]} numberOfLines={2}>
          {poll.question}
        </Text>
        {isCreator && (
          <View style={styles.pollActions}>
            {!closed && (
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="lock-closed-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Status badge */}
      <View style={styles.pollMeta}>
        <View style={[styles.statusBadge, { backgroundColor: closed ? '#94a3b818' : '#10b98118' }]}>
          <Text style={[styles.statusBadgeText, { color: closed ? '#94a3b8' : '#10b981' }]}>
            {closed ? 'Closed' : 'Open'}
          </Text>
        </View>
        <Text style={[styles.pollVoteCount, { color: colors.textSecondary }]}>
          {poll.total_votes} vote{poll.total_votes === 1 ? '' : 's'}
        </Text>
        {voting && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 6 }} />}
      </View>

      {/* Winner banner */}
      {closed && poll.winner && (
        <View style={styles.winnerBanner}>
          <Icon name="trophy" size={14} color="#f59e0b" />
          <Text style={styles.winnerText} numberOfLines={1}>
            Winner: {poll.winner.preference?.title}
          </Text>
        </View>
      )}

      {/* Options */}
      {poll.options.map((opt) => (
        <PollOption
          key={opt.id}
          opt={opt}
          totalVotes={poll.total_votes}
          isVoted={poll.user_vote === opt.id}
          isWinner={closed && poll.winner?.id === opt.id}
          closed={closed}
          onVote={handleVote}
        />
      ))}

      {/* Footer: creator + share */}
      <View style={styles.pollFooter}>
        <Text style={[styles.pollCreator, { color: colors.textTertiary }]}>
          by @{poll.creator?.username}
        </Text>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => setShowShare(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="paper-plane-outline" size={15} color={colors.primary} />
          <Text style={[styles.shareBtnText, { color: colors.primary }]}>Share</Text>
        </TouchableOpacity>
      </View>

      <SharePollModal
        poll={poll}
        visible={showShare}
        onClose={() => setShowShare(false)}
        colors={colors}
        isDark={isDark}
      />
    </View>
  );
}

// ─── Create Poll Modal ────────────────────────────────────────────────────────
function CreatePollModal({ visible, onClose, onCreate, colors, isDark }) {
  const [question, setQuestion] = useState('');
  const [myPrefs, setMyPrefs] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    setPrefsLoading(true);
    preferencesAPI.list()
      .then(r => { if (r.success) setMyPrefs(r.data?.preferences || r.data || []); })
      .catch(() => {})
      .finally(() => setPrefsLoading(false));
  }, [visible]);

  const togglePref = (id) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length < 10) return [...prev, id];
      return prev;
    });
  };

  const handleCreate = async () => {
    if (!question.trim()) { Alert.alert('Required', 'Enter a question.'); return; }
    if (selected.length < 2) { Alert.alert('Required', 'Pick at least 2 preferences.'); return; }
    setLoading(true);
    try {
      const res = await pollsAPI.create({ question: question.trim(), preference_ids: selected });
      if (res.success) {
        onCreate(res.data.poll);
        setQuestion('');
        setSelected([]);
        onClose();
      }
    } catch (e) { Alert.alert('Error', e.message || 'Failed to create poll.'); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>New Poll</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={loading}
            style={[styles.modalCreateBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.modalCreateBtnText}>Create</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          {/* Question */}
          <Text style={[styles.modalLabel, { color: colors.textPrimary }]}>Question</Text>
          <TextInput
            style={[styles.questionInput, { backgroundColor: isDark ? colors.cardBackground : '#f8fafc', color: colors.textPrimary, borderColor: colors.border }]}
            placeholder='e.g. "Where should we eat tonight?"'
            placeholderTextColor={colors.textTertiary}
            value={question}
            onChangeText={setQuestion}
            multiline
          />

          {/* Preference picker */}
          <Text style={[styles.modalLabel, { color: colors.textPrimary, marginTop: 20 }]}>
            Pick options ({selected.length}/10 selected, min 2)
          </Text>

          {prefsLoading
            ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            : myPrefs.map(pref => {
                const isSelected = selected.includes(pref.id);
                const prefBg = isSelected ? colors.primary + '12' : isDark ? colors.cardBackground : '#f8fafc';
                return (
                  <TouchableOpacity
                    key={pref.id}
                    style={[styles.prefPickerRow, { backgroundColor: prefBg, borderColor: isSelected ? colors.primary : colors.border }]}
                    onPress={() => togglePref(pref.id)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.prefPickerCheck, { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary : 'transparent' }]}>
                      {isSelected && <Icon name="checkmark" size={12} color="#fff" />}
                    </View>
                    <View style={styles.prefPickerInfo}>
                      <Text style={[styles.prefPickerTitle, { color: colors.textPrimary }]} numberOfLines={1}>{pref.title}</Text>
                      <Text style={[styles.prefPickerCat, { color: colors.textSecondary }]}>{pref.category?.name}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
          }
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const TABS = ['All', 'My Polls'];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PollsScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [polls, setPolls]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab]   = useState('All');

  useFocusEffect(useCallback(() => { loadPolls(); }, []));

  const loadPolls = async () => {
    setLoading(true);
    try {
      const res = await pollsAPI.list();
      if (res.success) setPolls(res.data.polls || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handlePollUpdate = (updatedPoll) => {
    if (updatedPoll === null) {
      loadPolls();
    } else {
      setPolls(prev => prev.map(p => p.id === updatedPoll.id ? updatedPoll : p));
    }
  };

  const handlePollCreated = (poll) => {
    setPolls(prev => [poll, ...prev]);
  };

  const visiblePolls = activeTab === 'My Polls'
    ? polls.filter(p => p.creator?.id === user?.id)
    : polls;

  if (loading) return <Loading fullScreen />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Polls</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Vote on your favorite preferences</Text>
        </View>
        <TouchableOpacity
          style={[styles.newPollBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.8}
        >
          <Icon name="add" size={18} color="#fff" />
          <Text style={styles.newPollBtnText}>New Poll</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {TABS.map(tab => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.textSecondary }]}>
                {tab}
                {tab === 'My Polls' && polls.some(p => p.creator?.id === user?.id)
                  ? ` (${polls.filter(p => p.creator?.id === user?.id).length})`
                  : ''}
              </Text>
              {active && <View style={[styles.tabUnderline, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Polls list */}
      <FlatList
        data={visiblePolls}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.pollsList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PollCard
            poll={item}
            currentUserId={user?.id}
            colors={colors}
            isDark={isDark}
            onUpdate={handlePollUpdate}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="bar-chart-outline" size={52} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {activeTab === 'My Polls' ? 'No polls created yet' : 'No polls yet'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {activeTab === 'My Polls'
                ? 'Tap "New Poll" to create your first poll.'
                : 'Be the first to ask something!'}
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowCreate(true)}
            >
              <Text style={styles.emptyBtnText}>Create Poll</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <CreatePollModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handlePollCreated}
        colors={colors}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  newPollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newPollBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  tabItem: {
    marginRight: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabLabel: { fontSize: 14, fontWeight: '600' },
  tabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, borderRadius: 1 },

  // Poll list
  pollsList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },

  // Poll card
  pollCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  pollHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  pollStatusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  pollQuestion: { flex: 1, fontSize: 15, fontWeight: '700', letterSpacing: -0.2, lineHeight: 20 },
  pollActions: { flexDirection: 'row', gap: 10, marginLeft: 4 },
  pollMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  pollVoteCount: { fontSize: 12 },

  // Winner banner
  winnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  winnerText: { fontSize: 13, fontWeight: '700', color: '#92400e', flex: 1 },

  // Poll option
  optionRow: {
    borderRadius: 10,
    padding: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  optionRowVoted: { borderColor: '#4f6ef760', backgroundColor: '#4f6ef708' },
  optionInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionThumb: { width: 44, height: 44, borderRadius: 8 },
  optionThumbPlaceholder: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  optionMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  optionTitle: { fontSize: 13, fontWeight: '500', flex: 1 },
  optionBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionBarTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  optionBarFill: { height: 5, borderRadius: 3 },
  optionPct: { fontSize: 12, fontWeight: '600', width: 34, textAlign: 'right', color: '#64748b' },
  optionVotes: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  pollFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  pollCreator: { fontSize: 11 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shareBtnText: { fontSize: 13, fontWeight: '600' },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalCreateBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  modalCreateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalBody: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  questionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 80,
  },

  // Preference picker rows
  prefPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  prefPickerCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefPickerInfo: { flex: 1 },
  prefPickerTitle: { fontSize: 14, fontWeight: '600' },
  prefPickerCat: { fontSize: 12, marginTop: 2 },
});
