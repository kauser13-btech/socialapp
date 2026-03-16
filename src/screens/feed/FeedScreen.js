import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button, Loading } from '../../components/ui';
import PreferenceCard from '../../components/preferences/PreferenceCard';
import { feedAPI, preferencesAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

export default function FeedScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('forYou');
  const [preferences, setPreferences] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFeed();
  }, [activeTab]);

  const loadFeed = async ({ isRefresh = false } = {}) => {
    try {
      if (!initialLoading && !isRefresh) setTabLoading(true);
      let response;
      if (activeTab === 'forYou') response = await feedAPI.getFeed();
      else if (activeTab === 'myPreference') response = await preferencesAPI.list();
      else if (activeTab === 'trending') response = await feedAPI.getTrending();
      else response = await feedAPI.getDiscover();

      if (response.success) {
        setPreferences(response.data.preferences || response.data || []);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setInitialLoading(false);
      setTabLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed({ isRefresh: true });
    setRefreshing(false);
  };

  const tabs = [
    { id: 'forYou', label: 'For You' },
    { id: 'myPreference', label: 'My Preferences' },
    { id: 'trending', label: 'Trending' },
    { id: 'discover', label: 'Discover' },
  ];

  if (initialLoading) return <Loading fullScreen />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      
      {/* Header */}
      <View style={styles.header}>
        <Image 
          source={require('../../../assets/logo_text.png')} 
          style={styles.logoImage} 
          resizeMode="contain" 
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabPill, 
                  { backgroundColor: isActive ? colors.primary : (isDark ? colors.cardBackground : '#f3f4f6') }
                ]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.tabText, 
                  { color: isActive ? '#ffffff' : colors.textSecondary },
                  isActive && styles.tabTextActive
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {tabLoading ? (
        <View style={styles.tabLoadingContainer}>
          <Loading />
        </View>
      ) : (
        <FlatList
          data={preferences}
          renderItem={({ item }) => <PreferenceCard preference={item} onUpdate={loadFeed} />}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '15' }]}>
                <Icon name="layers-outline" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No preferences found</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                {activeTab === 'myPreference' 
                  ? "You haven't shared any preferences yet." 
                  : "Be the first to share your preferences in this section!"}
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('PreferenceCreate')}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyBtnText}>Create Preference</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={() => navigation.navigate('PreferenceCreate')}
        activeOpacity={0.8}
      >
        <Icon name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  tabLoadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  /* Header Area */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  logoImage: { 
    width: 100, 
    height: 38, // Adjust ratio matching ~1024x276
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 100,
  },

  /* Tabs */
  tabsContainer: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  tabsScroll: {
    paddingHorizontal: 24,
    gap: 10,
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

  /* List & Cards */
  list: { 
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },

  /* Empty State */
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIconWrap: { 
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  emptySubtext: { 
    fontSize: 15, 
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  }
});
