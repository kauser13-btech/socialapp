import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Loading } from '../../components/ui';
import { groupsAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

export default function GroupsScreen() {
  const { colors, isDark } = useTheme();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { loadGroups(); }, []));

  const loadGroups = async () => {
    try {
      const res = await groupsAPI.getUserGroups();
      setGroups(res.data?.groups || res.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  if (loading) return <Loading fullScreen />;

  if (groups.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Groups</Text>
        </View>
        <View style={styles.emptyState}>
          <Icon name="people-outline" size={52} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No groups yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Join or create a group to get started.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Groups</Text>
      </View>

      <FlatList
        data={groups}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.groupCard, { backgroundColor: isDark ? colors.cardBackground : '#fff', borderColor: colors.border }]}>
            <View style={[styles.groupAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.groupAvatarText}>{(item.name || '?')[0].toUpperCase()}</Text>
            </View>
            <View style={styles.groupInfo}>
              <Text style={[styles.groupName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
              {item.description ? (
                <Text style={[styles.groupDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
              ) : null}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },

  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },

  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  groupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 15, fontWeight: '700' },
  groupDesc: { fontSize: 13, marginTop: 3, lineHeight: 18 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
