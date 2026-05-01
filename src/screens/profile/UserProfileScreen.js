import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  TouchableOpacity, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Avatar, Loading } from '../../components/ui';
import { userAPI, friendsAPI, analyticsAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../constants/styles';

const AVATAR_SIZE = 96;
const AVATAR_RING = 4;
const HEADER_H    = 190;
const CARD_W      = 160;
const CARD_H      = 200;

// ─── Category rules ───────────────────────────────────────────────────────────
const CATEGORY_RULES = [
  { keys: ['food', 'dining', 'restaurant'], icon: 'restaurant',      color: '#f97316' },
  { keys: ['film', 'movie', 'cinema'],      icon: 'film',            color: '#8b5cf6' },
  { keys: ['travel', 'trip', 'adventure'],  icon: 'airplane',        color: '#0ea5e9' },
  { keys: ['music', 'song', 'concert'],     icon: 'musical-notes',   color: '#10b981' },
  { keys: ['game', 'gaming'],               icon: 'game-controller', color: '#f59e0b' },
  { keys: ['book', 'read', 'literature'],   icon: 'book',            color: '#6366f1' },
  { keys: ['sport', 'fitness', 'gym'],      icon: 'fitness',         color: '#ec4899' },
  { keys: ['tech', 'gadget', 'software'],   icon: 'hardware-chip',   color: '#64748b' },
  { keys: ['art', 'design', 'craft'],       icon: 'color-palette',   color: '#e879f9' },
  { keys: ['nature', 'outdoor', 'hiking'],  icon: 'leaf',            color: '#16a34a' },
  { keys: ['health', 'wellness'],           icon: 'heart',           color: '#ef4444' },
  { keys: ['fashion', 'style'],             icon: 'shirt',           color: '#f43f5e' },
  { keys: ['photo', 'photography'],         icon: 'camera',          color: '#0891b2' },
];

const CATEGORY_GRADIENTS = [
  { keys: ['food', 'dining'],   colors: ['#f97316', '#ea580c'] },
  { keys: ['film', 'movie'],    colors: ['#8b5cf6', '#6d28d9'] },
  { keys: ['travel', 'trip'],   colors: ['#0ea5e9', '#0284c7'] },
  { keys: ['music'],            colors: ['#10b981', '#059669'] },
  { keys: ['game'],             colors: ['#f59e0b', '#d97706'] },
  { keys: ['book', 'read'],     colors: ['#6366f1', '#4f46e5'] },
  { keys: ['sport', 'fitness'], colors: ['#ec4899', '#db2777'] },
  { keys: ['tech', 'gadget'],   colors: ['#64748b', '#475569'] },
];

function getCategoryMeta(name = '') {
  const lower = name.toLowerCase();
  const match = CATEGORY_RULES.find(r => r.keys.some(k => lower.includes(k)));
  return match ? { icon: match.icon, color: match.color } : { icon: 'folder-open', color: '#6B63F5' };
}

function getCardGradient(name = '') {
  const lower = name.toLowerCase();
  const match = CATEGORY_GRADIENTS.find(r => r.keys.some(k => lower.includes(k)));
  return match ? match.colors : ['#6B63F5', '#4f46e5'];
}

// ─── Gradient cover ───────────────────────────────────────────────────────────
function lerpColor(a, b, t) {
  const ah = a.replace('#', '');
  const bh = b.replace('#', '');
  const ar = Number.parseInt(ah.slice(0, 2), 16);
  const ag = Number.parseInt(ah.slice(2, 4), 16);
  const ab = Number.parseInt(ah.slice(4, 6), 16);
  const br = Number.parseInt(bh.slice(0, 2), 16);
  const bg = Number.parseInt(bh.slice(2, 4), 16);
  const bb = Number.parseInt(bh.slice(4, 6), 16);
  const rr = Math.round(ar + (br - ar) * t).toString(16).padStart(2, '0');
  const rg = Math.round(ag + (bg - ag) * t).toString(16).padStart(2, '0');
  const rb = Math.round(ab + (bb - ab) * t).toString(16).padStart(2, '0');
  return `#${rr}${rg}${rb}`;
}

function GradientBg({ height }) {
  const STEPS = 20;
  const slices = Array.from({ length: STEPS }, (_, i) => ({
    t: i / (STEPS - 1),
    color: lerpColor('#7C5CBF', '#C96A4A', i / (STEPS - 1)),
  }));
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height, flexDirection: 'row' }}>
      {slices.map(s => (
        <View key={s.t} style={{ flex: 1, height, backgroundColor: s.color }} />
      ))}
    </View>
  );
}

// ─── Favorite card ────────────────────────────────────────────────────────────
function FavoriteCard({ item, onPress }) {
  const catName   = item.category?.name || '';
  const meta      = getCategoryMeta(catName);
  const [c1, c2]  = getCardGradient(catName);
  const heroImage = item.images?.[0]?.url;
  const subtitle  = [item.subtitle, item.year].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity style={favStyles.card} onPress={onPress} activeOpacity={0.88}>
      {heroImage ? (
        <Image source={{ uri: heroImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c1 }]} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c2, opacity: 0.55, borderRadius: 16 }]} />
        </>
      )}
      <View style={favStyles.overlay} />
      <View style={favStyles.badge}>
        <Icon name={meta.icon} size={14} color="#fff" />
      </View>
      <View style={favStyles.heart}>
        <Icon name="heart" size={16} color="#fff" />
      </View>
      <View style={favStyles.bottom}>
        <Text style={favStyles.title} numberOfLines={2}>{item.title || ''}</Text>
        {!!subtitle && <Text style={favStyles.sub} numberOfLines={1}>{subtitle}</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ─── Taste DNA bar ────────────────────────────────────────────────────────────
function TasteDNABar({ name, count, maxCount, colors }) {
  const safeName  = typeof name === 'string' ? name : String(name ?? '');
  const safeCount = Number(count) || 0;
  const pct       = maxCount > 0 ? safeCount / maxCount : 0;
  const meta      = getCategoryMeta(safeName);
  return (
    <TouchableOpacity style={dnaStyles.row} activeOpacity={0.7}>
      <View style={[dnaStyles.iconWrap, { backgroundColor: meta.color + '18' }]}>
        <Icon name={meta.icon} size={15} color={meta.color} />
      </View>
      <Text style={[dnaStyles.label, { color: colors.textPrimary }]}>{safeName}</Text>
      <View style={[dnaStyles.track, { backgroundColor: colors.gray200 }]}>
        <View style={[dnaStyles.fill, { width: `${pct * 100}%`, backgroundColor: meta.color }]} />
      </View>
      <Text style={[dnaStyles.count, { color: colors.textSecondary }]}>{safeCount}</Text>
      <Icon name="chevron-forward" size={14} color={colors.gray400} />
    </TouchableOpacity>
  );
}

// ─── Interest chip ────────────────────────────────────────────────────────────
function InterestChip({ name }) {
  const safeName = typeof name === 'string' ? name : String(name ?? '');
  const meta = getCategoryMeta(safeName);
  return (
    <View style={[chipStyles.chip, { backgroundColor: meta.color + '18', borderColor: meta.color + '40' }]}>
      <Icon name={meta.icon} size={13} color={meta.color} />
      <Text style={[chipStyles.label, { color: meta.color }]}>{safeName}</Text>
    </View>
  );
}

// ─── Allergy chip ─────────────────────────────────────────────────────────────
const SEVERITY_STYLE = {
  severe:   { bg: '#FFF0F0', border: '#ef4444', text: '#ef4444', icon: 'warning' },
  moderate: { bg: '#FFFBEB', border: '#f59e0b', text: '#d97706', icon: 'warning' },
  mild:     { bg: '#FEFCE8', border: '#eab308', text: '#a16207', icon: null     },
};

function AllergyChip({ name, severity = 'mild' }) {
  const key    = (severity || 'mild').toLowerCase();
  const style  = SEVERITY_STYLE[key] || SEVERITY_STYLE.mild;
  const capSev = severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : '';
  const label  = capSev ? `${name} · ${capSev}` : name;
  return (
    <View style={[allergyStyles.chip, { backgroundColor: style.bg, borderColor: style.border }]}>
      {style.icon && <Icon name={style.icon} size={13} color={style.text} />}
      <Text style={[allergyStyles.label, { color: style.text }]}>{label}</Text>
    </View>
  );
}

// ─── Mutual avatar stack ──────────────────────────────────────────────────────
function AvatarStack({ friends = [] }) {
  const COLORS = ['#8b5cf6', '#6B63F5', '#10b981'];
  return (
    <View style={stackStyles.wrap}>
      {friends.slice(0, 3).map((f, i) => (
        <View
          key={f.id || i}
          style={[stackStyles.circle, { backgroundColor: COLORS[i % COLORS.length], marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}
        >
          <Text style={stackStyles.initial}>
            {String(f.first_name || f.username || '?')[0].toUpperCase()}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Own-profile stat item ────────────────────────────────────────────────────
function StatItem({ value, label, onPress }) {
  return (
    <TouchableOpacity style={statStyles.item} onPress={onPress} activeOpacity={0.7}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function UserProfileScreen({ route, navigation }) {
  const { username }   = route.params;
  const { user: me, logout } = useAuth();
  const { colors }     = useTheme();
  const insets         = useSafeAreaInsets();

  const [user,          setUser]          = useState(null);
  const [stats,         setStats]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [friendStatus,  setFriendStatus]  = useState(null);
  const [compatibility, setCompatibility] = useState(null);
  const [mutualFriends, setMutualFriends] = useState([]);
  const [tasteDNA,      setTasteDNA]      = useState([]);
  const [favorites,     setFavorites]     = useState([]);
  const [allergies,     setAllergies]     = useState([]);
  const [prefsCount,    setPrefsCount]    = useState(0);
  const [sharedCount,   setSharedCount]   = useState(0);
  const [likedCount,    setLikedCount]    = useState(0);

  useEffect(() => { loadUser(); }, [username]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const res = await userAPI.getUser(username);
      if (!res.success) return;

      const loaded = res.data.user;
      setUser(loaded);
      setStats(res.data.stats);
      setAllergies(Array.isArray(loaded.allergies) ? loaded.allergies : []);
      checkFriendStatus(loaded.id);

      if (me?.id !== loaded.id) {
        analyticsAPI.getCompatibility(loaded.id)
          .then(r => { if (r.success) setCompatibility(r.data); })
          .catch(() => {});

        friendsAPI.mutualFriends(loaded.id)
          .then(r => setMutualFriends(r?.data?.mutual_friends || r?.data?.friends || []))
          .catch(() => {});
      }

      userAPI.getUserPreferences(username)
        .then(r => {
          const prefs = r?.data?.preferences || r?.data || [];
          setPrefsCount(prefs.length);

          const map = {};
          prefs.forEach(p => {
            const cat    = p.category_name || p.category?.name || p.category || 'Other';
            const catStr = typeof cat === 'string' ? cat : 'Other';
            map[catStr]  = (map[catStr] || 0) + 1;
          });
          setTasteDNA(
            Object.entries(map)
              .map(([name, count]) => ({ name, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 6),
          );

          const favs = prefs
            .filter(p => p.is_favorite || (p.reactions_count > 0))
            .sort((a, b) => (b.reactions_count || 0) - (a.reactions_count || 0))
            .slice(0, 8);
          setFavorites(favs.length > 0 ? favs : prefs.slice(0, 8));

          const liked = prefs.filter(p => p.reactions_count > 0).reduce((s, p) => s + (p.reactions_count || 0), 0);
          setLikedCount(liked);

          const shared = prefs.filter(p => p.shared_count > 0).reduce((s, p) => s + (p.shared_count || 0), 0);
          setSharedCount(shared);
        })
        .catch(() => {});
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const checkFriendStatus = async (userId) => {
    try {
      const [fl, sl] = await Promise.all([friendsAPI.list(), friendsAPI.sentRequests()]);
      if ((fl?.data?.friends || []).some(f => f.id === userId)) { setFriendStatus('friends'); return; }
      if ((sl?.data?.sent_requests || []).some(r => r.friend_id === userId)) { setFriendStatus('pending'); return; }
      setFriendStatus('none');
    } catch { setFriendStatus('none'); }
  };

  const handleMessage     = () => user && navigation.navigate('Chat', { userId: user.id, user });
  const handleCompare     = () => {
    if (compatibility) Alert.alert('Taste Match', `You and ${firstName()} have a ${compatibility.score}% taste match!`);
  };
  const handleRemoveFriend = () => {
    Alert.alert('Remove Friend', `Remove ${firstName()} from your friends?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try { await friendsAPI.remove(user.id); setFriendStatus('none'); }
        catch { Alert.alert('Error', 'Failed to remove friend'); }
        finally { setActionLoading(false); }
      }},
    ]);
  };
  const handleAddFriend = async () => {
    setActionLoading(true);
    try {
      const res = await friendsAPI.sendRequest(user.id);
      if (res?.message === 'Friend request accepted') { setFriendStatus('friends'); Alert.alert('Success', "You're now friends!"); }
      else { setFriendStatus('pending'); Alert.alert('Sent', 'Friend request sent!'); }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to send request');
    } finally { setActionLoading(false); }
  };

  const str      = v => (v == null || typeof v === 'object' ? '' : String(v));
  const fullName = () => {
    if (!user) return '';
    const fn = str(user.first_name); const ln = str(user.last_name);
    if (fn && ln) return `${fn} ${ln}`;
    return fn || ln || str(user.username);
  };
  const firstName = () => str(user?.first_name) || str(user?.username);

  const isFriend     = friendStatus === 'friends';
  const isOwnProfile = me?.id === user?.id;
  const matchScore   = compatibility?.score ?? null;
  const topInterests = tasteDNA.slice(0, 3).map(d => d.name);
  const maxCount     = tasteDNA[0]?.count || 1;
  const friendsCount = stats?.friends_count ?? 0;
  const mutualCount  = mutualFriends.length;
  const statusBarH   = insets.top;
  const totalHeaderH = statusBarH + HEADER_H;

  const formatCount = n => {
    const num = Number(n) || 0;
    return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : String(num);
  };

  if (loading) return <Loading fullScreen />;
  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.lg, marginBottom: spacing.lg }}>User not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>

        {/* ── Gradient header ───────────────────────────────────── */}
        <View style={{ height: totalHeaderH + AVATAR_SIZE / 2 }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: totalHeaderH, overflow: 'hidden' }}>
            <GradientBg height={totalHeaderH} />
          </View>
          <TouchableOpacity style={[styles.backBtn, { top: statusBarH + 12 }]} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Icon name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Edit Profile button — own profile only */}
          {isOwnProfile && (
            <TouchableOpacity
              style={[styles.editProfileBtn, { top: statusBarH + 12 }]}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.85}
            >
              <Text style={styles.editProfileLabel}>Edit Profile</Text>
            </TouchableOpacity>
          )}

          <View style={[styles.avatarRing, { bottom: 0, left: spacing.xl, width: AVATAR_SIZE + AVATAR_RING * 2, height: AVATAR_SIZE + AVATAR_RING * 2, borderRadius: (AVATAR_SIZE + AVATAR_RING * 2) / 2 }]}>
            <Avatar user={{ ...user, name: fullName() }} size="xlarge" />
          </View>
        </View>

        {/* ── Body ─────────────────────────────────────────────── */}
        <View style={[styles.body, { backgroundColor: colors.background }]}>

          {/* Name */}
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{fullName()}</Text>
            {!isOwnProfile && <View style={styles.onlineDot} />}
          </View>

          {/* Handle + location */}
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            @{str(user.username)}{str(user.location) ? ` · ${str(user.location)}` : ''}
          </Text>

          {/* Bio — own profile */}
          {isOwnProfile && !!str(user.bio) && (
            <Text style={[styles.bio, { color: colors.textPrimary }]}>{str(user.bio)}</Text>
          )}

          {/* ── Own profile: 4-stat row ── */}
          {isOwnProfile && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.gray100 }]} />
              <View style={statStyles.row}>
                <StatItem value={formatCount(prefsCount)}    label="Prefs"   onPress={() => navigation.navigate('Preferences')} />
                <View style={[statStyles.sep, { backgroundColor: colors.gray200 }]} />
                <StatItem value={formatCount(friendsCount)}  label="Friends"  onPress={() => navigation.navigate('Friends')} />
                <View style={[statStyles.sep, { backgroundColor: colors.gray200 }]} />
                <StatItem value={formatCount(sharedCount)}   label="Shared"   />
                <View style={[statStyles.sep, { backgroundColor: colors.gray200 }]} />
                <StatItem value={formatCount(likedCount)}    label="Liked"    />
              </View>
              <View style={[styles.divider, { backgroundColor: colors.gray100 }]} />
              <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
                <Icon name="log-out-outline" size={20} color="#ef4444" />
                <Text style={styles.logoutText}>Log Out</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Other user profile ── */}
          {!isOwnProfile && (
            <>
              {/* Taste match pill */}
              {matchScore !== null && (
                <View style={styles.matchPill}>
                  <View style={styles.matchCircle} />
                  <Text style={styles.matchText}>{String(matchScore)}% Taste Match</Text>
                </View>
              )}

              {/* Interest chips */}
              {topInterests.length > 0 && (
                <View style={styles.chipsRow}>
                  {topInterests.map(n => <InterestChip key={n} name={n} />)}
                </View>
              )}
            </>
          )}

          {/* ── Action buttons ── */}
          {!isOwnProfile && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.gray100 }]} />
              <View style={styles.actionsRow}>
                {isFriend ? (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.gray100 }]} onPress={handleMessage} activeOpacity={0.75}>
                    <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Message</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.gray100 }]} onPress={handleAddFriend} disabled={actionLoading || friendStatus === 'pending'} activeOpacity={0.75}>
                    <Text style={[styles.actionLabel, { color: colors.primary }]}>
                      {friendStatus === 'pending' ? 'Pending' : 'Add Friend'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.gray100 }]} onPress={handleCompare} activeOpacity={0.75}>
                  <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Compare</Text>
                </TouchableOpacity>
                {isFriend && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFF0EE' }]} onPress={handleRemoveFriend} disabled={actionLoading} activeOpacity={0.75}>
                    <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={[styles.divider, { backgroundColor: colors.gray100 }]} />

              {/* Friends row */}
              <TouchableOpacity style={styles.friendsRow} onPress={() => navigation.navigate('Friends')} activeOpacity={0.75}>
                <AvatarStack friends={mutualFriends} />
                <View style={styles.friendsInfo}>
                  <Text style={[styles.friendsTitle, { color: colors.textPrimary }]}>Friends · {Number(friendsCount) || 0}</Text>
                  {mutualCount > 0 && (
                    <Text style={[styles.friendsSub, { color: colors.textSecondary }]}>
                      {mutualCount} you both know{Number(friendsCount) - mutualCount > 0 ? ` · ${Number(friendsCount) - mutualCount} people you might add` : ''}
                    </Text>
                  )}
                </View>
                <Icon name="chevron-forward" size={18} color={colors.gray400} />
              </TouchableOpacity>
            </>
          )}

          {/* ── Taste DNA ── */}
          {tasteDNA.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.gray100 }]} />
              <View style={styles.dnaSection}>
                <View style={styles.dnaTitleRow}>
                  <Text style={styles.dnaTitleEmoji}>🧬</Text>
                  <Text style={[styles.dnaSectionTitle, { color: colors.textPrimary }]}>Taste DNA</Text>
                </View>
                {tasteDNA.map(item => (
                  <TasteDNABar key={item.name} name={item.name} count={item.count} maxCount={maxCount} colors={colors} />
                ))}
              </View>
            </>
          )}

          {/* ── Favorites ── */}
          {favorites.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.gray100 }]} />
              <View style={styles.favSection}>
                <View style={styles.favHeader}>
                  <View style={styles.favHeaderLeft}>
                    <View style={styles.favHeartBadge}>
                      <Icon name="heart" size={13} color="#ef4444" />
                    </View>
                    <Text style={[styles.favTitle, { color: '#ef4444' }]}>
                      {isOwnProfile ? 'My Favorites' : `${firstName()}'s Favorites`}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.favUpdated} activeOpacity={0.7} onPress={() => navigation.navigate('UserProfile', { username })}>
                    <Text style={[styles.favUpdatedText, { color: colors.textSecondary }]}>See all</Text>
                    <Icon name="chevron-forward" size={13} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favScroll}>
                  {favorites.map(item => (
                    <FavoriteCard
                      key={item.id}
                      item={item}
                      onPress={() => navigation.navigate('PreferenceDetail', { id: item.id })}
                    />
                  ))}
                </ScrollView>
              </View>
            </>
          )}

          {/* ── Allergies ── */}
          {allergies.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.gray100 }]} />
              <View style={styles.allergySection}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                  ALLERGIES &amp; INTOLERANCES
                </Text>
                <View style={styles.allergyChips}>
                  {allergies.map((a, i) => (
                    <AllergyChip
                      key={a.name || i}
                      name={a.name || String(a)}
                      severity={a.severity}
                    />
                  ))}
                </View>
                <Text style={[styles.allergyNote, { color: colors.textSecondary }]}>
                  Shown when gifting food or making restaurant recommendations
                </Text>
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backBtn: {
    position: 'absolute', left: spacing.md,
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)', zIndex: 20,
  },
  editProfileBtn: {
    position: 'absolute', right: spacing.md,
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 22, backgroundColor: '#fff',
    zIndex: 20,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  editProfileLabel: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#1a1a1a',
  },
  avatarRing: {
    position: 'absolute', backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
  body:      { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  nameRow:   { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: spacing.sm },
  name:      { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, letterSpacing: -0.3, flexShrink: 1 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981', flexShrink: 0 },
  sub:       { fontSize: fontSize.sm, marginTop: 3 },
  bio:       { fontSize: fontSize.sm, lineHeight: 20, marginTop: spacing.sm, color: '#333' },
  matchPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: spacing.md, alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 22, backgroundColor: '#EEEEFF',
    borderWidth: 1, borderColor: '#6B63F530',
  },
  matchCircle: { width: 10, height: 10, borderRadius: 5, borderWidth: 2.5, borderColor: '#6B63F5' },
  matchText:   { color: '#6B63F5', fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  chipsRow:    { flexDirection: 'row', gap: 8, marginTop: spacing.md, flexWrap: 'wrap' },
  divider:     { height: 8, marginHorizontal: -spacing.xl, marginVertical: spacing.lg },
  actionsRow:  { flexDirection: 'row', gap: 10 },
  actionBtn:   { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  friendsRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  friendsInfo: { flex: 1, gap: 3 },
  friendsTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  friendsSub:   { fontSize: fontSize.sm },

  // Taste DNA
  dnaSection:     { gap: spacing.sm },
  dnaTitleRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  dnaTitleEmoji:  { fontSize: 16 },
  dnaSectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  sectionTitle:   { fontSize: 11, fontWeight: fontWeight.bold, letterSpacing: 1, marginBottom: 2 },

  // Favorites
  favSection:     { gap: spacing.md },
  favHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  favHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  favHeartBadge:  {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center',
  },
  favTitle:       { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  favUpdated:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  favUpdatedText: { fontSize: fontSize.sm },
  favScroll:      { paddingVertical: 4, gap: 12 },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#FFF0EE',
  },
  logoutText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: '#ef4444' },

  // Allergies
  allergySection: { gap: spacing.sm },
  allergyChips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergyNote:    { fontSize: fontSize.xs, marginTop: 4, lineHeight: 18 },
});

// ─── Stat row styles ──────────────────────────────────────────────────────────
const statStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 4 },
  item:  { alignItems: 'center', flex: 1 },
  value: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: '#1a1a1a' },
  label: { fontSize: fontSize.xs, color: '#888', marginTop: 2 },
  sep:   { width: 1, height: 32, marginHorizontal: 4 },
});

// ─── Favorite card styles ─────────────────────────────────────────────────────
const favStyles = StyleSheet.create({
  card: {
    width: CARD_W, height: CARD_H,
    borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#6B63F5',
  },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  badge: {
    position: 'absolute', top: 10, left: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  heart: {
    position: 'absolute', top: 10, right: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  bottom:  { position: 'absolute', bottom: 12, left: 12, right: 12 },
  title:   { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 20 },
  sub:     { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
});

// ─── Sub-component styles ─────────────────────────────────────────────────────
const chipStyles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  label: { fontSize: 13, fontWeight: fontWeight.semibold },
});

const stackStyles = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center' },
  circle:  { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  initial: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

const dnaStyles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label:    { fontSize: fontSize.sm, fontWeight: fontWeight.medium, width: 58 },
  track:    { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  fill:     { height: 7, borderRadius: 4 },
  count:    { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, width: 22, textAlign: 'right' },
});

const allergyStyles = StyleSheet.create({
  chip:  {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
