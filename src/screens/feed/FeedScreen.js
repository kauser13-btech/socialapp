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
import { colors, spacing, fontSize, fontWeight } from '../../constants/styles';

export default function FeedScreen({ navigation }) {
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
      if (initialLoading || isRefresh) {
        // keep existing state visible, only show spinner inline or pull-to-refresh
      } else {
        setTabLoading(true);
      }
      let response;
      if (activeTab === 'forYou') {
        response = await feedAPI.getFeed();
      } else if (activeTab === 'myPreference') {
        response = await preferencesAPI.list();
      } else if (activeTab === 'trending') {
        response = await feedAPI.getTrending();
      } else {
        response = await feedAPI.getDiscover();
      }

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

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.logo}>Unomi</Text>
      <Button
        onPress={() => navigation.navigate('PreferenceCreate')}
        size="small"
      >
        + Create
      </Button>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsWrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'forYou' && styles.activeTab]}
          onPress={() => setActiveTab('forYou')}
        >
          <Text style={[styles.tabText, activeTab === 'forYou' && styles.activeTabText]}>
            For You
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'myPreference' && styles.activeTab]}
          onPress={() => setActiveTab('myPreference')}
        >
          <Text style={[styles.tabText, activeTab === 'myPreference' && styles.activeTabText]}>
            My Preference
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'trending' && styles.activeTab]}
          onPress={() => setActiveTab('trending')}
        >
          <Text style={[styles.tabText, activeTab === 'trending' && styles.activeTabText]}>
            Trending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
            Discover
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  if (initialLoading) {
    return <Loading fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      {renderTabs()}
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
              <Text style={styles.emptyText}>No preferences found</Text>
              <Text style={styles.emptySubtext}>Be the first to share your preferences!</Text>
              <Button
                onPress={() => navigation.navigate('PreferenceCreate')}
                style={styles.emptyButton}
              >
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  tabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
  },
  tab: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  list: {
    padding: spacing.md,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    marginTop: spacing.md,
  },
});
