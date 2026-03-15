import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Button, Card } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../constants/styles';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { colors } = useTheme();

  const menuItems = [
    { title: 'Friends', icon: '👥', screen: 'Friends' },
    { title: 'Groups', icon: '👨‍👩‍👧‍👦', screen: 'Groups' },
    { title: 'Notifications', icon: '🔔', screen: 'Notifications' },
    { title: 'Settings', icon: '⚙️', screen: 'Settings' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Avatar user={user} size="xlarge" />
        <Text style={[styles.name, { color: colors.textPrimary }]}>{user?.name}</Text>
        <Text style={[styles.username, { color: colors.textSecondary }]}>@{user?.username}</Text>
      </View>

      <Card style={styles.menu}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>{item.title}</Text>
            <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        ))}
      </Card>

      <Button onPress={logout} variant="danger" style={styles.logoutButton}>
        Logout
      </Button>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', padding: spacing.xl },
  name: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, marginTop: spacing.md },
  username: { fontSize: fontSize.md },
  menu: { margin: spacing.md },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1 },
  menuIcon: { fontSize: fontSize.xl, marginRight: spacing.md },
  menuTitle: { flex: 1, fontSize: fontSize.md },
  menuArrow: { fontSize: fontSize.xl },
  logoutButton: { margin: spacing.md },
});
