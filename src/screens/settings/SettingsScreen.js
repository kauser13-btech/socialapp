import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/ui';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize } from '../../constants/styles';

export default function SettingsScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useTheme();

  const settings = [
    { title: 'Account', icon: '👤', screen: 'EditProfile' },
    { title: 'Privacy', icon: '🔒', screen: null },
    { title: 'Notifications', icon: '🔔', screen: null },
    { title: 'About', icon: 'ℹ️', screen: null },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        {/* Dark mode toggle */}
        <Card style={styles.card}>
          <View style={[styles.item, { borderBottomColor: colors.border }]}>
            <Text style={styles.icon}>🌙</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.gray300, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </Card>

        {/* Other settings */}
        <Card style={styles.card}>
          {settings.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={[styles.item, { borderBottomColor: colors.border }]}
              onPress={() => item.screen && navigation.navigate(item.screen)}
            >
              <Text style={styles.icon}>{item.icon}</Text>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.arrow, { color: colors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { margin: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1 },
  icon: { fontSize: fontSize.xl, marginRight: spacing.md },
  title: { flex: 1, fontSize: fontSize.md },
  arrow: { fontSize: fontSize.xl },
});
