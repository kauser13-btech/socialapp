import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/ui';
import { colors, spacing, fontSize } from '../../constants/styles';

export default function SettingsScreen({ navigation }) {
  const settings = [
    { title: 'Account', icon: '👤', screen: 'EditProfile' },
    { title: 'Privacy', icon: '🔒', screen: null },
    { title: 'Notifications', icon: '🔔', screen: null },
    { title: 'About', icon: 'ℹ️', screen: null },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Card style={styles.card}>
          {settings.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.item}
              onPress={() => item.screen && navigation.navigate(item.screen)}
            >
              <Text style={styles.icon}>{item.icon}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: { margin: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { fontSize: fontSize.xl, marginRight: spacing.md },
  title: { flex: 1, fontSize: fontSize.md },
  arrow: { fontSize: fontSize.xl, color: colors.textSecondary },
});
