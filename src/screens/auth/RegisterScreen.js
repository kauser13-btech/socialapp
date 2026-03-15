import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Card } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../constants/styles';

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
  const { colors } = useTheme();

  const handleRegister = async () => {
    setErrors({});
    setLoading(true);
    try {
      await register(formData);
    } catch (error) {
      if (error.errors) {
        setErrors(error.errors);
      } else {
        Alert.alert('Error', error.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: null });
  };

  const isFormValid = () => {
    return (
      formData.name &&
      formData.username &&
      formData.email &&
      formData.password &&
      formData.password_confirmation &&
      formData.password === formData.password_confirmation
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.logo, { color: colors.primary }]}>Unomi</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>Join the Community</Text>
          </View>

          <Card style={styles.formCard}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign up to get started</Text>

            <Input label="Full Name" placeholder="Enter your full name" value={formData.name} onChangeText={(t) => updateField('name', t)} error={errors.name} autoCapitalize="words" />
            <Input label="Username" placeholder="Choose a username" value={formData.username} onChangeText={(t) => updateField('username', t)} error={errors.username} autoCapitalize="none" />
            <Input label="Email" placeholder="Enter your email" value={formData.email} onChangeText={(t) => updateField('email', t)} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <Input label="Password" placeholder="Choose a password" value={formData.password} onChangeText={(t) => updateField('password', t)} error={errors.password} secureTextEntry autoCapitalize="none" />
            <Input label="Confirm Password" placeholder="Confirm your password" value={formData.password_confirmation} onChangeText={(t) => updateField('password_confirmation', t)} error={errors.password_confirmation} secureTextEntry autoCapitalize="none" />

            <Button onPress={handleRegister} loading={loading} disabled={!isFormValid()} style={styles.registerButton}>
              Sign Up
            </Button>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
              <Button onPress={() => navigation.navigate('Login')} variant="ghost" size="small">
                Sign In
              </Button>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logo: { fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  tagline: { fontSize: fontSize.md },
  formCard: { padding: spacing.xl },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.md, marginBottom: spacing.xl },
  registerButton: { marginTop: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg },
  footerText: { fontSize: fontSize.sm },
});
