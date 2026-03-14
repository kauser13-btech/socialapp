import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Loading } from '../../components/ui';
import PreferenceCard from '../../components/preferences/PreferenceCard';
import CommentSection from '../../components/comments/CommentSection';
import { preferencesAPI } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight } from '../../constants/styles';

export default function PreferenceDetailScreen({ route, navigation }) {
  const { id } = route.params || {};
  const [preference, setPreference] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!id) {
      console.error('No preference ID provided');
      setError('Invalid preference ID');
      setLoading(false);
      return;
    }
    loadPreference();
    loadCurrentUser();
  }, [id]);

  const loadCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        setCurrentUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadPreference = async () => {
    try {
      console.log('Loading preference with ID:', id);
      const response = await preferencesAPI.get(id);
      if (response.success) {
        setPreference(response.data.preference || response.data);
      }
    } catch (error) {
      console.error('Error loading preference:', error);
      setError(error.message || 'Failed to load preference');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading fullScreen />;

  if (error || !preference) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error || 'Preference not found'}
          </Text>
          <Text style={styles.errorSubtext}>
            The preference you're looking for might have been deleted or doesn't exist.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <PreferenceCard preference={preference} onUpdate={loadPreference} />
        <CommentSection preferenceId={id} currentUser={currentUser} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorSubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
