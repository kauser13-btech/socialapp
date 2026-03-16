import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';

export default function SettingsScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useTheme();

  const settingsItems = [
    { title: 'Account', icon: 'person-outline', color: colors.primary, screen: 'EditProfile' },
    { title: 'Privacy', icon: 'lock-closed-outline', color: '#8b5cf6', screen: null },
    { title: 'Notifications', icon: 'notifications-outline', color: '#f59e0b', screen: null },
    { title: 'Help & Support', icon: 'help-buoy-outline', color: '#10b981', screen: null },
    { title: 'About', icon: 'information-circle-outline', color: colors.textSecondary, screen: null },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Preferences Group */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Preferences</Text>
          <View style={[styles.listGroup, { backgroundColor: isDark ? colors.cardBackground : '#ffffff', borderColor: colors.border }]}>
            
            {/* Dark Mode Toggle */}
            <View style={[styles.listItem, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <View style={[styles.iconWrap, { backgroundColor: isDark ? '#4b5563' : '#e5e7eb' }]}>
                <Icon name={isDark ? "moon" : "moon-outline"} size={20} color={isDark ? '#fbbf24' : colors.textSecondary} />
              </View>
              <Text style={[styles.listTitle, { color: colors.textPrimary }]}>Dark Mode</Text>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.gray300, true: colors.primary }}
                thumbColor="#ffffff"
                ios_backgroundColor={colors.gray300}
              />
            </View>
            
          </View>
        </View>

        {/* General Settings Group */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>General</Text>
          <View style={[styles.listGroup, { backgroundColor: isDark ? colors.cardBackground : '#ffffff', borderColor: colors.border }]}>
            {settingsItems.map((item, index) => {
              const isLast = index === settingsItems.length - 1;
              return (
                <TouchableOpacity
                  key={item.title}
                  style={[
                    styles.listItem,
                    !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }
                  ]}
                  onPress={() => item.screen && navigation.navigate(item.screen)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconWrap, { backgroundColor: item.color + '15' }]}>
                    <Icon name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={[styles.listTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                  
                  {item.screen ? (
                     <Icon name="chevron-forward" size={20} color={colors.textTertiary} />
                  ) : (
                     <Text style={[styles.comingSoon, { color: colors.textTertiary }]}>Coming Soon</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.footerInfo}>
          <Text style={[styles.versionText, { color: colors.textTertiary }]}>Message App v1.0.0</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  header: { 
    paddingHorizontal: 24, 
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  
  /* Sections */
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 12,
  },
  listGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listItem: { 
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
  listTitle: { 
    flex: 1, 
    fontSize: 16,
    fontWeight: '500', 
  },
  comingSoon: {
    fontSize: 12,
    paddingRight: 4,
  },
  
  /* Footer */
  footerInfo: {
    alignItems: 'center',
    marginTop: 16,
  },
  versionText: {
    fontSize: 12,
  }
});
