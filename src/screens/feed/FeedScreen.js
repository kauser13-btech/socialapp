import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Loading } from '../../components/ui';
import PreferenceCard from '../../components/preferences/PreferenceCard';
import { feedAPI, preferencesAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../constants/styles';

export default function FeedScreen({ navigation }) {
  const { colors } = useTheme();
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
    { id: 'myPreference', label: 'My Preference' },
    { id: 'trending', label: 'Trending' },
    { id: 'discover', label: 'Discover' },
  ];

  if (initialLoading) return <Loading fullScreen />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.logo, { color: colors.primary }]}>Unomi</Text>
        <Button onPress={() => navigation.navigate('PreferenceCreate')} size="small">
          + Create
        </Button>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsWrapper, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && [styles.activeTab, { borderBottomColor: colors.primary }]]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab.id ? colors.primary : colors.textSecondary }, activeTab === tab.id && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textPrimary }]}>No preferences found</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Be the first to share your preferences!</Text>
              <Button onPress={() => navigation.navigate('PreferenceCreate')} style={styles.emptyButton}>
                Create Preference
              </Button>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabLoadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  logo: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold },
  tabsWrapper: { borderBottomWidth: 1 },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.sm },
  tab: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2 },
  tabText: { fontSize: fontSize.md },
  activeTabText: { fontWeight: fontWeight.semibold },
  list: { padding: spacing.md },
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, marginBottom: spacing.sm },
  emptySubtext: { fontSize: fontSize.md, marginBottom: spacing.lg },
  emptyButton: { marginTop: spacing.md },
});
