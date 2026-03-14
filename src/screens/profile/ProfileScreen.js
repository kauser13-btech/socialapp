import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Button, Card } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight } from '../../constants/styles';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const menuItems = [
    { title: 'Friends', icon: '👥', screen: 'Friends' },
    { title: 'Groups', icon: '👨‍👩‍👧‍👦', screen: 'Groups' },
    { title: 'Notifications', icon: '🔔', screen: 'Notifications' },
    { title: 'Settings', icon: '⚙️', screen: 'Settings' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Avatar user={user} size="xlarge" />
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.username}>@{user?.username}</Text>
      </View>

      <Card style={styles.menu}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Text style={styles.menuArrow}>›</Text>
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
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', padding: spacing.xl },
  name: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textPrimary, marginTop: spacing.md },
  username: { fontSize: fontSize.md, color: colors.textSecondary },
  menu: { margin: spacing.md },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIcon: { fontSize: fontSize.xl, marginRight: spacing.md },
  menuTitle: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary },
  menuArrow: { fontSize: fontSize.xl, color: colors.textSecondary },
  logoutButton: { margin: spacing.md },
});
