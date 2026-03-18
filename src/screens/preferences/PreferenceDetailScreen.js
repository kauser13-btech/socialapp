import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Loading } from '../../components/ui';
import PreferenceCard from '../../components/preferences/PreferenceCard';
import CommentSection from '../../components/comments/CommentSection';
import { preferencesAPI, authAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../constants/styles';

export default function PreferenceDetailScreen({ route }) {
  const { id } = route.params || {};
  const { colors } = useTheme();
  const [preference, setPreference] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!id) { setError('Invalid preference ID'); setLoading(false); return; }
    loadPreference();
    authAPI.me().then((data) => {
      console.log('data', data.data);
      if (data) setCurrentUser(data.data.user || data.data);
    }).catch(console.error);
  }, [id]);

  const loadPreference = async () => {
    try {
      const response = await preferencesAPI.get(id);
      if (response.success) setPreference(response.data.preference || response.data);
    } catch (err) {
      setError(err.message || 'Failed to load preference');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading fullScreen />;

  if (error || !preference) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>{error || 'Preference not found'}</Text>
          <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>The preference you're looking for might have been deleted or doesn't exist.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <PreferenceCard preference={preference} onUpdate={loadPreference} />
        <CommentSection preferenceId={id} currentUser={currentUser} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  errorText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, textAlign: 'center', marginBottom: spacing.sm },
  errorSubtext: { fontSize: fontSize.md, textAlign: 'center' },
});
