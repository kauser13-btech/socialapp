import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Loading } from '../../components/ui';
import PreferenceCard from '../../components/preferences/PreferenceCard';
import { searchAPI } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight } from '../../constants/styles';

export default function CategoryScreen({ route }) {
  const { slug } = route.params;
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, [slug]);

  const loadPreferences = async () => {
    try {
      const response = await searchAPI.getCategoryPreferences(slug);
      if (response.success) setPreferences(response.data.preferences || []);
    } catch (error) {
      console.error('Error loading category preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading fullScreen />;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={preferences}
        renderItem={({ item }) => <PreferenceCard preference={item} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
});
