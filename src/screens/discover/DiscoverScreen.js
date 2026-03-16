import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Input, Loading } from '../../components/ui';
import PreferenceCard from '../../components/preferences/PreferenceCard';
import { searchAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

export default function DiscoverScreen({ navigation }) {
  const { colors, isDark } = useTheme();
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

  // Map backend emoji/icons to Ionicons
  const getIconForCategory = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('food') || lower.includes('dining')) return { name: 'restaurant', color: '#f43f5e' };
    if (lower.includes('movie') || lower.includes('film')) return { name: 'film', color: '#8b5cf6' };
    if (lower.includes('travel') || lower.includes('trip')) return { name: 'airplane', color: '#0ea5e9' };
    if (lower.includes('music')) return { name: 'musical-notes', color: '#10b981' };
    if (lower.includes('game')) return { name: 'game-controller', color: '#f59e0b' };
    if (lower.includes('book') || lower.includes('read')) return { name: 'book', color: '#6366f1' };
    if (lower.includes('sport') || lower.includes('fitness')) return { name: 'fitness', color: '#ec4899' };
    if (lower.includes('tech') || lower.includes('gadget')) return { name: 'hardware-chip', color: '#64748b' };
    return { name: 'folder-open', color: colors.primary };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      
      {/* Header & Search */}
      <View style={styles.headerArea}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Discover</Text>
        <View style={[styles.searchWrapper, { backgroundColor: isDark ? colors.cardBackground : '#f3f4f6' }]}>
          <Icon name="search" size={20} color={colors.textTertiary} style={styles.searchIcon} />
          <Input
            placeholder="Search preferences, people, places..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            style={styles.searchInputContainer}
            inputStyle={[styles.searchInput, { color: colors.textPrimary }]}
          />
        </View>
      </View>

      {/* Modern Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabPill, 
                  { backgroundColor: isActive ? colors.primary : (isDark ? colors.cardBackground : '#f3f4f6') }
                ]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.tabText, 
                  { color: isActive ? '#ffffff' : colors.textSecondary },
                  isActive && styles.tabTextActive
                ]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && <Loading fullScreen />}
      
      {/* Search Results */}
      {!loading && searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          renderItem={({ item }) => <PreferenceCard preference={item} />}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Default Browse View */}
      {!loading && searchResults.length === 0 && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.categoriesContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Browse Categories</Text>
            
            <View style={styles.categoryGrid}>
              {categories.map((category) => {
                const iconConf = getIconForCategory(category.name);
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.categoryCard, { backgroundColor: isDark ? colors.cardBackground : iconConf.color + '10' }]}
                    onPress={() => navigation.navigate('Category', { slug: category.slug })}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.categoryIconWrap, { backgroundColor: isDark ? iconConf.color + '20' : '#ffffff' }]}>
                      <Icon name={iconConf.name} size={28} color={iconConf.color} />
                    </View>
                    <Text style={[styles.categoryName, { color: colors.textPrimary }]} numberOfLines={2}>
                      {category.name}
                    </Text>
                    <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
                      {category.preferences_count || 0} preferences
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {categories.length === 0 && (
              <View style={styles.emptyCategories}>
                <Icon name="albums-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No categories found.
                </Text>
              </View>
            )}

          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  
  /* Header Area */
  headerArea: { 
    paddingHorizontal: 24, 
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInputContainer: {
    flex: 1,
    marginBottom: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  searchInput: {
    height: 40,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    fontSize: 16,
  },

  /* Tabs */
  tabsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  tabsScroll: {
    paddingHorizontal: 24,
    gap: 12,
  },
  tabPill: { 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: { 
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    fontWeight: '600',
  },

  /* Content */
  content: { 
    flex: 1 
  },
  list: { 
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  
  /* Categories Grid */
  categoriesContainer: { 
    paddingHorizontal: 24, 
    paddingBottom: 40,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    letterSpacing: -0.3,
    marginBottom: 16, 
  },
  categoryGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 16,
    justifyContent: 'space-between',
  },
  categoryCard: { 
    borderRadius: 20, 
    padding: 20, 
    width: '47%',
    alignItems: 'flex-start',
  },
  categoryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryName: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  categoryCount: { 
    fontSize: 12, 
    fontWeight: '500', 
  },
  emptyCategories: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
  }
});
