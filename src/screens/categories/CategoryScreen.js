import React, { useState, useEffect } from 'react';
import { FlatList, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Loading } from '../../components/ui';
import PreferenceCard from '../../components/preferences/PreferenceCard';
import { searchAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { spacing } from '../../constants/styles';

export default function CategoryScreen({ route }) {
  const { slug, categoryName } = route.params || {};
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPreferences(); }, [slug]);

  const loadPreferences = async () => {
    try {
      const response = await searchAPI.getCategoryPreferences(slug);
      if (response.success) setPreferences(response.data.preferences || []);
    } catch (error) {
      console.error('Error loading category preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading fullScreen />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {categoryName || slug || 'Category'}
        </Text>
        <View style={styles.backBtn} />
      </View>
      <FlatList
        data={preferences}
        renderItem={({ item }) => <PreferenceCard preference={item} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="folder-open-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No preferences in this category</Text>
          </View>
        }
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  list: { padding: spacing.md },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
