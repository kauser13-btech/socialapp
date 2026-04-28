import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { messagesAPI, friendsAPI } from '../../lib/api';

export default function SharePollModal({ poll, visible, onClose, colors, isDark }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(null);

  React.useEffect(() => {
    if (!visible) return;
    setLoading(true);
    friendsAPI.list()
      .then(r => setFriends(r.data?.friends || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible]);

  const handleSend = async (friend) => {
    if (sending) return;
    setSending(friend.id);
    try {
      await messagesAPI.sharePoll(friend.id, poll.id, null);
      Alert.alert('Sent!', `Poll shared with @${friend.username}.`);
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to share poll.');
    } finally {
      setSending(null);
    }
  };

  const renderBody = () => {
    if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />;
    if (friends.length === 0) {
      return <Text style={[styles.empty, { color: colors.textTertiary }]}>No friends to share with yet.</Text>;
    }
    return (
      <FlatList
        data={friends}
        keyExtractor={f => f.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item: friend }) => (
          <TouchableOpacity
            style={[styles.friendRow, { borderBottomColor: colors.border }]}
            onPress={() => handleSend(friend)}
            activeOpacity={0.75}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {(friend.first_name || friend.username || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.friendName, { color: colors.textPrimary }]}>
                {friend.first_name} {friend.last_name}
              </Text>
              <Text style={[styles.friendUser, { color: colors.textSecondary }]}>@{friend.username}</Text>
            </View>
            {sending === friend.id
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Icon name="paper-plane-outline" size={18} color={colors.primary} />}
          </TouchableOpacity>
        )}
      />
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Share Poll</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.preview, { backgroundColor: isDark ? colors.cardBackground : '#f8fafc', borderColor: colors.border }]}>
          <Icon name="bar-chart-outline" size={16} color={colors.primary} />
          <Text style={[styles.previewText, { color: colors.textPrimary }]} numberOfLines={2}>
            {poll.question}
          </Text>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Send to a friend</Text>
        {renderBody()}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 17, fontWeight: '700' },
  preview: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    margin: 16, padding: 14, borderRadius: 12, borderWidth: 1,
  },
  previewText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', marginHorizontal: 16, marginBottom: 4 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  list: { paddingHorizontal: 16 },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  friendName: { fontSize: 14, fontWeight: '600' },
  friendUser: { fontSize: 12, marginTop: 1 },
});
