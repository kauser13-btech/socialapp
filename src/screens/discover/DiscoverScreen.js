import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import Geolocation from '@react-native-community/geolocation';
import { Input, Loading } from '../../components/ui';
import PreferenceCard from '../../components/preferences/PreferenceCard';
import { searchAPI, feedAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

const CATEGORY_ICONS = {
  food: { name: 'restaurant', color: '#f43f5e' },
  dining: { name: 'restaurant', color: '#f43f5e' },
  movie: { name: 'film', color: '#8b5cf6' },
  film: { name: 'film', color: '#8b5cf6' },
  travel: { name: 'airplane', color: '#0ea5e9' },
  trip: { name: 'airplane', color: '#0ea5e9' },
  music: { name: 'musical-notes', color: '#10b981' },
  game: { name: 'game-controller', color: '#f59e0b' },
  book: { name: 'book', color: '#6366f1' },
  read: { name: 'book', color: '#6366f1' },
  sport: { name: 'fitness', color: '#ec4899' },
  fitness: { name: 'fitness', color: '#ec4899' },
  tech: { name: 'hardware-chip', color: '#64748b' },
  gadget: { name: 'hardware-chip', color: '#64748b' },
};

function getIconForCategory(name) {
  if (!name) return { name: 'folder-open', color: '#6366f1' };
  const lower = name.toLowerCase();
  for (const key of Object.keys(CATEGORY_ICONS)) {
    if (lower.includes(key)) return CATEGORY_ICONS[key];
  }
  return { name: 'folder-open', color: '#6366f1' };
}

function openInMaps(lat, lon, label) {
  const encoded = encodeURIComponent(label || 'Location');
  const url = Platform.OS === 'ios'
    ? `maps://?q=${encoded}&ll=${lat},${lon}`
    : `geo:${lat},${lon}?q=${encoded}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`)
  );
}

// ─── Map Pin Card ─────────────────────────────────────────────────────────────
function MapPinCard({ item, colors, isDark }) {
  const catIcon = getIconForCategory(item.category?.name);
  const hasCoords = item.latitude != null && item.longitude != null;

  return (
    <View style={[
      mapStyles.pinCard,
      { backgroundColor: isDark ? colors.cardBackground : '#fff', borderColor: colors.border },
    ]}>
      {/* Left accent */}
      <View style={[mapStyles.accent, { backgroundColor: catIcon.color }]} />

      <View style={mapStyles.pinContent}>
        {/* Category + title */}
        <View style={mapStyles.pinHeader}>
          <View style={[mapStyles.catBadge, { backgroundColor: catIcon.color + '18' }]}>
            <Icon name={catIcon.name} size={13} color={catIcon.color} />
            <Text style={[mapStyles.catText, { color: catIcon.color }]}>
              {item.category?.name || 'General'}
            </Text>
          </View>
          {item.rating ? (
            <View style={mapStyles.ratingRow}>
              <Icon name="star" size={12} color="#fbbf24" />
              <Text style={[mapStyles.ratingText, { color: colors.textSecondary }]}>{item.rating}</Text>
            </View>
          ) : null}
        </View>

        <Text style={[mapStyles.pinTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.title}
        </Text>

        <View style={mapStyles.pinLocation}>
          <Icon name="location" size={13} color={catIcon.color} />
          <Text style={[mapStyles.pinLocationText, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.location || `${Number(item.latitude).toFixed(4)}, ${Number(item.longitude).toFixed(4)}`}
          </Text>
        </View>

        <Text style={[mapStyles.pinUser, { color: colors.textSecondary }]}>
          by @{item.user?.username}
        </Text>
      </View>

      {/* Open in maps button */}
      {hasCoords && (
        <TouchableOpacity
          style={[mapStyles.openBtn, { backgroundColor: catIcon.color + '18' }]}
          onPress={() => openInMaps(item.latitude, item.longitude, item.title)}
          activeOpacity={0.7}
        >
          <Icon name="navigate" size={18} color={catIcon.color} />
          <Text style={[mapStyles.openBtnText, { color: catIcon.color }]}>Open</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DiscoverScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [categories, setCategories] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [mapItems, setMapItems] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const SEARCH_TABS = ['all', 'people', 'preferences', 'places'];
  const MAIN_TABS = ['browse', 'map', 'nearby'];
  const TAB_ICONS  = { browse: 'compass', map: 'map', nearby: 'navigate' };
  const TAB_LABELS = { browse: 'Browse',  map: 'Map',  nearby: 'Near Me' };

  const [mainTab, setMainTab] = useState('browse');

  // Near Me state
  const [nearbyItems, setNearbyItems]       = useState([]);
  const [nearbyLoading, setNearbyLoading]   = useState(false);
  const [nearbyRadius, setNearbyRadius]     = useState(20);
  const [userLocation, setUserLocation]     = useState(null);
  const [locationError, setLocationError]   = useState(null);
  const locationWatchRef = useRef(null);

  const RADIUS_OPTIONS = [5, 10, 20, 50];

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { if (mainTab === 'map' && mapItems.length === 0) loadMapItems(); }, [mainTab]);
  useEffect(() => {
    if (mainTab === 'nearby') {
      if (userLocation) {
        loadNearby(userLocation.latitude, userLocation.longitude, nearbyRadius);
      } else {
        detectLocation();
      }
    }
  }, [mainTab]);

  const loadCategories = async () => {
    try {
      const response = await searchAPI.getCategories();
      if (response.success) setCategories(response.data.categories || []);
    } catch (e) {
      console.error('Error loading categories:', e);
    }
  };

  const loadMapItems = async () => {
    setMapLoading(true);
    try {
      const response = await feedAPI.getNearby(23.8136224, 90.4334300, 50);
      if (response.success) {
        const items = (response.data?.preferences || []).filter(
          p => p.latitude != null && p.longitude != null
        );
        setMapItems(items);
      }
    } catch (e) {
      console.error('Error loading map items:', e);
    } finally {
      setMapLoading(false);
    }
  };

  const detectLocation = () => {
    setNearbyLoading(true);
    setLocationError(null);
    Geolocation.getCurrentPosition(
      ({ coords }) => {
        const loc = { latitude: coords.latitude, longitude: coords.longitude };
        setUserLocation(loc);
        loadNearby(loc.latitude, loc.longitude, nearbyRadius);
      },
      (err) => {
        setNearbyLoading(false);
        setLocationError('Could not get your location. Please enable location services.');
        console.error('Location error:', err);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  };

  const loadNearby = async (lat, lng, radius) => {
    setNearbyLoading(true);
    try {
      const response = await feedAPI.getNearby(lat, lng, radius);
      if (response.success) {
        setNearbyItems(response.data?.preferences || []);
      }
    } catch (e) {
      setLocationError('Failed to load nearby preferences.');
      console.error('Nearby load error:', e);
    } finally {
      setNearbyLoading(false);
    }
  };

  const handleRadiusChange = (radius) => {
    setNearbyRadius(radius);
    if (userLocation) {
      loadNearby(userLocation.latitude, userLocation.longitude, radius);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      if (activeTab === 'all') {
        const response = await searchAPI.search(searchQuery);
        if (response.success) {
          const users = (response.data?.users || []).map(u => ({ ...u, _type: 'user' }));
          const prefs = (response.data?.preferences || []).map(p => ({ ...p, _type: 'preference' }));
          setSearchResults([...users, ...prefs]);
        }
      } else if (activeTab === 'people') {
        const response = await searchAPI.searchUsers(searchQuery);
        if (response.success) {
          setSearchResults((response.data?.users || []).map(u => ({ ...u, _type: 'user' })));
        }
      } else if (activeTab === 'preferences') {
        const response = await searchAPI.searchPreferences(searchQuery);
        if (response.success) {
          setSearchResults((response.data?.preferences || []).map(p => ({ ...p, _type: 'preference' })));
        }
      } else {
        const response = await searchAPI.searchPlaces(searchQuery);
        if (response.success) {
          setSearchResults((response.data?.places || []).map(p => ({ ...p, _type: 'preference' })));
        }
      }
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Map stats summary ──────────────────────────────────────────────────────
  const uniqueCategories = [...new Set(mapItems.map(i => i.category?.name).filter(Boolean))];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>

      {/* Header */}
      <View style={[styles.headerArea, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Discover</Text>

        {/* Full-width segmented tab toggle */}
        <View style={[styles.mainTabToggle, { backgroundColor: isDark ? colors.cardBackground : '#f0f0f5' }]}>
          {MAIN_TABS.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.mainTabBtn, mainTab === t && { backgroundColor: colors.primary }]}
              onPress={() => setMainTab(t)}
              activeOpacity={0.8}
            >
              <Icon
                name={TAB_ICONS[t]}
                size={14}
                color={mainTab === t ? '#fff' : colors.textSecondary}
              />
              <Text style={[styles.mainTabText, { color: mainTab === t ? '#fff' : colors.textSecondary }]}>
                {TAB_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── BROWSE TAB ── */}
      {mainTab === 'browse' && (
        <>
          {/* Search bar */}
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

          {/* Search filter tabs */}
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
              {SEARCH_TABS.map((tab) => {
                const isActive = activeTab === tab;
                const inactiveBg = isDark ? colors.cardBackground : '#f3f4f6';
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tabPill, { backgroundColor: isActive ? colors.primary : inactiveBg }]}
                    onPress={() => setActiveTab(tab)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tabText, { color: isActive ? '#fff' : colors.textSecondary }, isActive && styles.tabTextActive]}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {loading && <Loading fullScreen />}

          {!loading && searchResults.length > 0 && (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => `${item._type}-${item.id}`}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                if (item._type === 'user') {
                  return (
                    <TouchableOpacity
                      style={[styles.userRow, { backgroundColor: isDark ? colors.cardBackground : '#fff', borderColor: colors.border }]}
                      onPress={() => navigation.navigate('UserProfile', { username: item.username })}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.userAvatar, { backgroundColor: colors.primary + '22' }]}>
                        <Text style={[styles.userAvatarText, { color: colors.primary }]}>
                          {(item.first_name || item.username || '?')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={[styles.userFullName, { color: colors.textPrimary }]}>
                          {item.first_name} {item.last_name}
                        </Text>
                        <Text style={[styles.userUsername, { color: colors.textSecondary }]}>@{item.username}</Text>
                      </View>
                      <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                  );
                }
                return <PreferenceCard preference={item} />;
              }}
            />
          )}

          {!loading && searchResults.length === 0 && (
            <ScrollView showsVerticalScrollIndicator={false}>
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
                        <View style={[styles.categoryIconWrap, { backgroundColor: isDark ? iconConf.color + '20' : '#fff' }]}>
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
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No categories found.</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </>
      )}

      {/* ── NEAR ME TAB ── */}
      {mainTab === 'nearby' && (
        <View style={{ flex: 1 }}>
          {/* Radius selector */}
          <View style={[nearbyStyles.controlBar, { backgroundColor: isDark ? colors.cardBackground : '#f8fafc', borderBottomColor: colors.border }]}>
            <Icon name="navigate-circle" size={16} color={colors.primary} />
            <Text style={[nearbyStyles.controlLabel, { color: colors.textSecondary }]}>Radius:</Text>
            {RADIUS_OPTIONS.map(r => (
              <TouchableOpacity
                key={r}
                style={[nearbyStyles.radiusPill, { backgroundColor: nearbyRadius === r ? colors.primary : (isDark ? colors.border : '#e5e7eb') }]}
                onPress={() => handleRadiusChange(r)}
                activeOpacity={0.7}
              >
                <Text style={[nearbyStyles.radiusPillText, { color: nearbyRadius === r ? '#fff' : colors.textSecondary }]}>{r} km</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={detectLocation} style={nearbyStyles.refreshBtn} activeOpacity={0.7}>
              <Icon name="refresh" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {nearbyLoading ? (
            <Loading fullScreen />
          ) : locationError ? (
            <View style={nearbyStyles.errorBox}>
              <Icon name="location-outline" size={44} color={colors.textTertiary} />
              <Text style={[nearbyStyles.errorTitle, { color: colors.textPrimary }]}>Location unavailable</Text>
              <Text style={[nearbyStyles.errorText, { color: colors.textSecondary }]}>{locationError}</Text>
              <TouchableOpacity
                style={[nearbyStyles.retryBtn, { backgroundColor: colors.primary }]}
                onPress={detectLocation}
                activeOpacity={0.8}
              >
                <Text style={nearbyStyles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : !userLocation ? (
            <View style={nearbyStyles.errorBox}>
              <View style={[nearbyStyles.locIconWrap, { backgroundColor: colors.primary + '15' }]}>
                <Icon name="location" size={44} color={colors.primary} />
              </View>
              <Text style={[nearbyStyles.errorTitle, { color: colors.textPrimary }]}>Find nearby preferences</Text>
              <Text style={[nearbyStyles.errorText, { color: colors.textSecondary }]}>
                Discover preferences shared by others around you.
              </Text>
              <TouchableOpacity
                style={[nearbyStyles.retryBtn, { backgroundColor: colors.primary }]}
                onPress={detectLocation}
                activeOpacity={0.8}
              >
                <Icon name="navigate" size={16} color="#fff" />
                <Text style={nearbyStyles.retryBtnText}>Use My Location</Text>
              </TouchableOpacity>
            </View>
          ) : nearbyItems.length === 0 ? (
            <View style={nearbyStyles.errorBox}>
              <Icon name="map-outline" size={44} color={colors.textTertiary} />
              <Text style={[nearbyStyles.errorTitle, { color: colors.textPrimary }]}>Nothing nearby</Text>
              <Text style={[nearbyStyles.errorText, { color: colors.textSecondary }]}>
                No preferences found within {nearbyRadius} km. Try a larger radius.
              </Text>
            </View>
          ) : (
            <FlatList
              data={nearbyItems}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.mapList}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <Text style={[styles.mapListHeader, { color: colors.textSecondary }]}>
                  {nearbyItems.length} place{nearbyItems.length !== 1 ? 's' : ''} within {nearbyRadius} km
                </Text>
              }
              renderItem={({ item }) => (
                <View>
                  <MapPinCard item={item} colors={colors} isDark={isDark} />
                  {item.distance_km != null && (
                    <View style={[nearbyStyles.distanceBadge, { backgroundColor: colors.primary + '15' }]}>
                      <Icon name="navigate" size={11} color={colors.primary} />
                      <Text style={[nearbyStyles.distanceText, { color: colors.primary }]}>
                        {item.distance_km < 1
                          ? `${Math.round(item.distance_km * 1000)} m away`
                          : `${item.distance_km} km away`}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* ── MAP TAB ── */}
      {mainTab === 'map' && (
        <View style={{ flex: 1 }}>
          {/* Stats bar */}
          <View style={[styles.mapStatsBar, { backgroundColor: isDark ? colors.cardBackground : '#f8fafc', borderBottomColor: colors.border }]}>
            <View style={styles.mapStat}>
              <Icon name="location" size={16} color={colors.primary} />
              <Text style={[styles.mapStatText, { color: colors.textPrimary }]}>
                <Text style={{ fontWeight: '700' }}>{mapItems.length}</Text> places
              </Text>
            </View>
            <View style={styles.mapStatDivider} />
            <View style={styles.mapStat}>
              <Icon name="grid" size={16} color={colors.primary} />
              <Text style={[styles.mapStatText, { color: colors.textPrimary }]}>
                <Text style={{ fontWeight: '700' }}>{uniqueCategories.length}</Text> categories
              </Text>
            </View>
            <View style={styles.mapStatDivider} />
            <TouchableOpacity style={styles.mapStat} onPress={loadMapItems} activeOpacity={0.7}>
              <Icon name="refresh" size={16} color={colors.primary} />
              <Text style={[styles.mapStatText, { color: colors.primary, fontWeight: '600' }]}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {mapLoading ? (
            <Loading fullScreen />
          ) : mapItems.length === 0 ? (
            <View style={styles.mapEmpty}>
              <View style={[styles.mapEmptyIcon, { backgroundColor: colors.primary + '15' }]}>
                <Icon name="map-outline" size={44} color={colors.primary} />
              </View>
              <Text style={[styles.mapEmptyTitle, { color: colors.textPrimary }]}>No mapped places yet</Text>
              <Text style={[styles.mapEmptyText, { color: colors.textSecondary }]}>
                Preferences with location coordinates will appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={mapItems}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.mapList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <MapPinCard item={item} colors={colors} isDark={isDark} />
              )}
              ListHeaderComponent={
                <Text style={[styles.mapListHeader, { color: colors.textSecondary }]}>
                  Tap "Open" to launch in your maps app
                </Text>
              }
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Map Pin Styles ───────────────────────────────────────────────────────────
const mapStyles = StyleSheet.create({
  pinCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
  },
  pinContent: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  pinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  catText: { fontSize: 11, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12, fontWeight: '600' },
  pinTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  pinLocation: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pinLocationText: { fontSize: 13, flex: 1 },
  pinUser: { fontSize: 12, marginTop: 2 },
  openBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    gap: 4,
    minWidth: 60,
  },
  openBtnText: { fontSize: 11, fontWeight: '700' },
});

// ─── Main Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  headerArea: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },

  /* Full-width segmented tab toggle */
  mainTabToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
  },
  mainTabText: { fontSize: 13, fontWeight: '600' },

  /* Search */
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    height: 46,
  },
  searchIcon: { marginRight: 8 },
  searchInputContainer: { flex: 1, marginBottom: 0, borderWidth: 0, backgroundColor: 'transparent' },
  searchInput: { height: 40, paddingHorizontal: 0, backgroundColor: 'transparent', fontSize: 16 },

  /* Filter tabs */
  tabsContainer: { marginTop: 6, marginBottom: 10 },
  tabsScroll: { paddingHorizontal: 16, gap: 8 },
  tabPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 13, fontWeight: '500' },
  tabTextActive: { fontWeight: '600' },

  /* List */
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  /* User search row */
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    gap: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1 },
  userFullName: { fontSize: 15, fontWeight: '600' },
  userUsername: { fontSize: 13, marginTop: 2 },

  /* Categories */
  categoriesContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 12 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  categoryCard: { borderRadius: 16, padding: 16, width: '47.5%', alignItems: 'flex-start' },
  categoryIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  categoryName: { fontSize: 14, fontWeight: '600', marginBottom: 3, letterSpacing: -0.2 },
  categoryCount: { fontSize: 11, fontWeight: '500' },
  emptyCategories: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 16, fontSize: 15 },

  /* Map */
  mapStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mapStat: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' },
  mapStatText: { fontSize: 13 },
  mapStatDivider: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: '#d1d5db' },
  mapList: { paddingTop: 10, paddingBottom: 40 },
  mapListHeader: { fontSize: 12, textAlign: 'center', marginBottom: 10, fontStyle: 'italic' },
  mapEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  mapEmptyIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  mapEmptyTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, marginBottom: 8 },
  mapEmptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});

// ─── Near Me Styles ───────────────────────────────────────────────────────────
const nearbyStyles = StyleSheet.create({
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  controlLabel: { fontSize: 13, fontWeight: '500' },
  radiusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  radiusPillText: { fontSize: 12, fontWeight: '600' },
  refreshBtn: { marginLeft: 'auto', padding: 4 },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  locIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  errorText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginRight: 16,
    marginTop: -8,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  distanceText: { fontSize: 11, fontWeight: '700' },
});
