import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Platform, Animated, ScrollView, PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/Ionicons';
import { feedAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

const RADIUS_OPTIONS = [5, 10, 20, 50];
const DEFAULT_DELTA = 0.05;

// ─── Pin Marker ───────────────────────────────────────────────────────────────
function PrefPin({ pref, selected, onPress, color }) {
  const imgUrl = pref.images?.[0]?.url;
  const scale  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1.25 : 1,
      useNativeDriver: true,
      friction: 4,
    }).start();
  }, [selected, scale]);

  return (
    <Marker
      coordinate={{ latitude: pref.latitude, longitude: pref.longitude }}
      onPress={() => onPress(pref)}
      tracksViewChanges={false}
    >
      <Animated.View style={[styles.pin, selected && { borderColor: color }, { transform: [{ scale }] }]}>
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.pinImage} />
        ) : (
          <View style={[styles.pinPlaceholder, { backgroundColor: color + '33' }]}>
            <Icon name="bookmark" size={14} color={color} />
          </View>
        )}
      </Animated.View>
      <View style={[styles.pinTail, { borderTopColor: selected ? color : '#fff' }]} />
    </Marker>
  );
}

// ─── Bottom Card ──────────────────────────────────────────────────────────────
function PrefCard({ pref, colors, isDark, onClose, onViewDetail }) {
  if (!pref) return null;
  const imgUrl = pref.images?.[0]?.url;

  return (
    <View style={[styles.card, { backgroundColor: isDark ? colors.cardBackground : '#fff', borderColor: colors.border }]}>
      <TouchableOpacity style={styles.cardClose} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Icon name="close" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.cardInner} onPress={onViewDetail} activeOpacity={0.85}>
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImagePlaceholder, { backgroundColor: colors.primary + '18' }]}>
            <Icon name="image-outline" size={28} color={colors.primary} />
          </View>
        )}

        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {pref.title}
          </Text>

          {pref.category?.name && (
            <View style={[styles.cardCatBadge, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.cardCatText, { color: colors.primary }]}>{pref.category.name}</Text>
            </View>
          )}

          <View style={styles.cardMeta}>
            {pref.location ? (
              <View style={styles.cardMetaRow}>
                <Icon name="location-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.cardMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {pref.location}
                </Text>
              </View>
            ) : null}
            {pref.distance_km != null && (
              <View style={styles.cardMetaRow}>
                <Icon name="navigate-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.cardMetaText, { color: colors.textSecondary }]}>
                  {pref.distance_km < 1
                    ? `${Math.round(pref.distance_km * 1000)} m away`
                    : `${pref.distance_km} km away`}
                </Text>
              </View>
            )}
          </View>

          {pref.rating != null && (
            <View style={styles.cardRating}>
              {[1, 2, 3, 4, 5].map(s => (
                <Icon
                  key={s}
                  name={s <= pref.rating ? 'star' : 'star-outline'}
                  size={13}
                  color="#f59e0b"
                />
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>

      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.cardBy, { color: colors.textTertiary }]}>
          by @{pref.user?.username || 'unknown'}
        </Text>
        <TouchableOpacity onPress={onViewDetail} style={[styles.viewBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.viewBtnText}>View</Text>
          <Icon name="arrow-forward" size={13} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MapScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const mapRef = useRef(null);

  const [location, setLocation]       = useState(null);
  const [locError, setLocError]       = useState(false);
  const [locLoading, setLocLoading]   = useState(true);
  const [prefs, setPrefs]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [selected, setSelected]       = useState(null);
  const [radius, setRadius]           = useState(10);
  const [showRadiusPicker, setShowRadiusPicker] = useState(false);

  // Get user location on mount
  useEffect(() => {
    const getLocation = () => {
      Geolocation.getCurrentPosition(
        pos => {
          setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          setLocLoading(false);
        },
        () => {
          setLocError(true);
          setLocLoading(false);
        },
        { enableHighAccuracy: false, timeout: 10000 },
      );
    };

    if (Platform.OS === 'android') {
      PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
        title: 'Location Permission',
        message: 'This app needs access to your location to show nearby places on the map.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }).then(result => {
        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          getLocation();
        } else {
          setLocError(true);
          setLocLoading(false);
        }
      });
    } else {
      getLocation();
    }
  }, []);

  // Fetch nearby preferences whenever location or radius changes
  useEffect(() => {
    if (!location) return;
    fetchNearby();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, radius]);

  const fetchNearby = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    try {
      const res = await feedAPI.getNearby(location.latitude, location.longitude, radius);
      if (res.success) setPrefs(res.data.preferences || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [location, radius]);

  const handlePinPress = (pref) => {
    setSelected(pref);
    mapRef.current?.animateToRegion({
      latitude:  pref.latitude  - 0.005,
      longitude: pref.longitude,
      latitudeDelta:  DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA,
    }, 350);
  };

  const recenter = () => {
    if (!location) return;
    setSelected(null);
    mapRef.current?.animateToRegion({
      ...location,
      latitudeDelta:  DEFAULT_DELTA,
      longitudeDelta: DEFAULT_DELTA,
    }, 350);
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (locLoading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>Getting your location…</Text>
      </SafeAreaView>
    );
  }

  if (locError) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Icon name="location-outline" size={52} color={colors.textTertiary} />
        <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>Location required</Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          Enable location permissions in Settings to use the map.
        </Text>
      </SafeAreaView>
    );
  }

  const initialRegion = {
    ...location,
    latitudeDelta:  DEFAULT_DELTA * (radius / 5),
    longitudeDelta: DEFAULT_DELTA * (radius / 5),
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
      >
        {/* Radius circle */}
        <Circle
          center={location}
          radius={radius * 1000}
          strokeColor={colors.primary + '60'}
          fillColor={colors.primary + '10'}
          strokeWidth={1}
        />

        {/* Preference pins */}
        {prefs.map(pref => (
          pref.latitude && pref.longitude ? (
            <PrefPin
              key={pref.id}
              pref={pref}
              selected={selected?.id === pref.id}
              onPress={handlePinPress}
              color={colors.primary}
            />
          ) : null
        ))}
      </MapView>

      {/* Top bar */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <TouchableOpacity
          style={[styles.topBtn, { backgroundColor: isDark ? colors.cardBackground : '#fff' }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Icon name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={[styles.topTitle, { backgroundColor: isDark ? colors.cardBackground : '#fff' }]}>
          <Icon name="location" size={14} color={colors.primary} />
          <Text style={[styles.topTitleText, { color: colors.textPrimary }]}>
            {loading ? 'Searching…' : `${prefs.length} nearby`}
          </Text>
          {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 4 }} />}
        </View>

        {/* Radius picker toggle */}
        <TouchableOpacity
          style={[styles.topBtn, { backgroundColor: isDark ? colors.cardBackground : '#fff' }]}
          onPress={() => setShowRadiusPicker(v => !v)}
        >
          <Text style={[styles.radiusLabel, { color: colors.primary }]}>{radius} km</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Radius options */}
      {showRadiusPicker && (
        <View style={[styles.radiusPicker, { backgroundColor: isDark ? colors.cardBackground : '#fff' }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
            {RADIUS_OPTIONS.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusChip, { borderColor: r === radius ? colors.primary : colors.border, backgroundColor: r === radius ? colors.primary + '15' : 'transparent' }]}
                onPress={() => { setRadius(r); setShowRadiusPicker(false); setSelected(null); }}
              >
                <Text style={[styles.radiusChipText, { color: r === radius ? colors.primary : colors.textSecondary }]}>{r} km</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recenter button */}
      <View style={styles.recenterWrap}>
        <TouchableOpacity
          style={[styles.recenterBtn, { backgroundColor: isDark ? colors.cardBackground : '#fff' }]}
          onPress={recenter}
        >
          <Icon name="locate" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Bottom preference card */}
      {selected && (
        <View style={styles.cardWrap}>
          <PrefCard
            pref={selected}
            colors={colors}
            isDark={isDark}
            onClose={() => setSelected(null)}
            onViewDetail={() => navigation.navigate('PreferenceDetail', { id: selected.id })}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  stateTitle: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  stateText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  topTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  topTitleText: { fontSize: 14, fontWeight: '600' },
  radiusLabel: { fontSize: 13, fontWeight: '700' },

  // Radius picker
  radiusPicker: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    right: 12,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  radiusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  radiusChipText: { fontSize: 13, fontWeight: '600' },

  // Recenter
  recenterWrap: {
    position: 'absolute',
    right: 12,
    bottom: 200,
  },
  recenterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

  // Pin
  pin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  pinImage: { width: '100%', height: '100%' },
  pinPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
    alignSelf: 'center',
    marginTop: -1,
  },

  // Bottom card
  cardWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  cardClose: { position: 'absolute', top: 12, right: 12, zIndex: 10 },
  cardInner: { flexDirection: 'row', padding: 14, gap: 12 },
  cardImage: { width: 80, height: 80, borderRadius: 12 },
  cardImagePlaceholder: { width: 80, height: 80, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 5, paddingRight: 24 },
  cardTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  cardCatBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  cardCatText: { fontSize: 11, fontWeight: '600' },
  cardMeta: { gap: 3 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 12, flex: 1 },
  cardRating: { flexDirection: 'row', gap: 2 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cardBy: { fontSize: 12 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16 },
  viewBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
