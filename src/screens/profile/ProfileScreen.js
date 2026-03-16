import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Avatar } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();

  const menuItems = [
    { title: 'Friends', icon: 'people-outline', screen: 'Friends', color: colors.primary },
    { title: 'Groups', icon: 'people-circle-outline', screen: 'Groups', color: '#10b981' },
    { title: 'Notifications', icon: 'notifications-outline', screen: 'Notifications', color: '#f59e0b' },
    { title: 'Settings', icon: 'settings-outline', screen: 'Settings', color: colors.textSecondary },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            <Avatar user={user} size="xlarge" />
            <TouchableOpacity 
              style={[styles.editAvatarBtn, { backgroundColor: colors.primary, borderColor: colors.background }]}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.8}
            >
              <Icon name="pencil" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.name, { color: colors.textPrimary }]}>
            {user?.name || user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'User'}
          </Text>
          <Text style={[styles.username, { color: colors.textSecondary }]}>
            @{user?.username || 'username'}
          </Text>

          <TouchableOpacity 
            style={[styles.editProfileBtn, { backgroundColor: isDark ? colors.cardBackground : '#f3f4f6' }]}
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.7}
          >
            <Text style={[styles.editProfileText, { color: colors.textPrimary }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Preferences & Links</Text>
          <View style={[styles.menuList, { backgroundColor: isDark ? colors.cardBackground : '#ffffff', borderColor: colors.border }]}>
            {menuItems.map((item, index) => {
              const isLast = index === menuItems.length - 1;
              return (
                <TouchableOpacity
                  key={item.screen}
                  style={[
                    styles.menuItem,
                    !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }
                  ]}
                  onPress={() => navigation.navigate(item.screen)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconWrap, { backgroundColor: item.color + '15' }]}>
                    <Icon name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                  <Icon name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={logout}
            activeOpacity={0.7}
          >
            <Icon name="log-out-outline" size={20} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
          </TouchableOpacity>
          <Text style={[styles.versionText, { color: colors.textTertiary }]}>Version 1.0.0</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* Header */
  header: { 
    alignItems: 'center', 
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 16,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { 
    fontSize: 24, 
    fontWeight: '700', 
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  username: { 
    fontSize: 15,
    marginBottom: 20, 
  },
  editProfileBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
  },

  /* Menu */
  menuSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 12,
  },
  menuList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuTitle: { 
    flex: 1, 
    fontSize: 16,
    fontWeight: '500', 
  },

  /* Logout */
  logoutSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  versionText: {
    fontSize: 12,
    marginTop: 24,
  }
});
