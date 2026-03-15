import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input, Loading } from '../../components/ui';
import PreferenceCard from '../../components/preferences/PreferenceCard';
import { searchAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../../constants/styles';

export default function DiscoverScreen({ navigation }) {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [categories, setCategories] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      const response = await searchAPI.getCategories();
      if (response.success) setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      let response;
      if (activeTab === 'all') response = await searchAPI.search(searchQuery);
      else if (activeTab === 'people') response = await searchAPI.searchUsers(searchQuery);
      else if (activeTab === 'preferences') response = await searchAPI.searchPreferences(searchQuery);
      else response = await searchAPI.searchPlaces(searchQuery);
      if (response.success) setSearchResults(response.data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = ['all', 'people', 'preferences', 'places'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Discover</Text>
      </View>

      <View style={styles.searchContainer}>
        <Input
          placeholder="Search preferences, people, places..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
      </View>

      <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && [styles.activeTab, { borderBottomColor: colors.primary }]]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <Loading fullScreen />}
      {!loading && searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          renderItem={({ item }) => <PreferenceCard preference={item} />}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
        />
      )}
      {!loading && searchResults.length === 0 && (
        <ScrollView style={styles.content}>
          <View style={styles.categoriesContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Browse Categories</Text>
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('Category', { slug: category.slug })}
                >
                  <Text style={styles.categoryIcon}>{category.icon || '📁'}</Text>
                  <Text style={[styles.categoryName, { color: colors.textPrimary }]} numberOfLines={2}>{category.name}</Text>
                  <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>{category.preferences_count || 0} preferences</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold },
  searchContainer: { padding: spacing.md },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2 },
  tabText: { fontSize: fontSize.sm },
  activeTabText: { fontWeight: fontWeight.semibold },
  content: { flex: 1 },
  list: { padding: spacing.md },
  categoriesContainer: { padding: spacing.md },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, marginBottom: spacing.md },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  categoryCard: { borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center', borderWidth: 1, width: '47%' },
  categoryIcon: { fontSize: 36, marginBottom: spacing.sm },
  categoryName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, textAlign: 'center', marginBottom: spacing.xs },
  categoryCount: { fontSize: fontSize.xs, textAlign: 'center' },
});
