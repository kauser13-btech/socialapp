import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const { login } = useAuth();
  const { colors } = useTheme();

  const handleLogin = async () => {
    setErrors({});
    setLoading(true);
    try {
      await login({ email, password });
    } catch (error) {
      if (error.errors) {
        setErrors(error.errors);
      } else {
        Alert.alert('Login Failed', error.message || 'Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = !email.trim() || !password || loading;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <Image
              source={require('../../../assets/logo_icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Sign in</Text>

            {/* Email field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'email' && styles.inputFocused,
                  errors.email && styles.inputError,
                ]}
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrors((e) => ({ ...e, email: null }));
                }}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            {/* Password field */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity>
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'password' && styles.inputFocused,
                  errors.password && styles.inputError,
                ]}
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors((e) => ({ ...e, password: null }));
                }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry
                autoCapitalize="none"
              />
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {/* Sign In button */}
            <TouchableOpacity
              style={[styles.signInButton, isDisabled && styles.signInButtonDisabled]}
              onPress={handleLogin}
              disabled={isDisabled}
              activeOpacity={0.85}
            >
              <Text style={styles.signInButtonText}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>New to Unomi?</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register CTA */}
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.75}
          >
            <Text style={styles.registerButtonText}>Create an account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY = '#1877F2';
const BORDER = '#e5e7eb';
const TEXT_MAIN = '#111827';
const TEXT_SECONDARY = '#6b7280';
const BG = '#ffffff';
const ERROR = '#ef4444';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },

  /* ── Brand ── */
  brand: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoImage: {
    width: 140,
    height: 140,
  },

  /* ── Form ── */
  form: {
    marginBottom: 28,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: TEXT_MAIN,
    marginBottom: 24,
    letterSpacing: -0.2,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT_MAIN,
    marginBottom: 6,
  },
  forgotLink: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    color: TEXT_MAIN,
    backgroundColor: '#f9fafb',
  },
  inputFocused: {
    borderColor: PRIMARY,
    backgroundColor: BG,
  },
  inputError: {
    borderColor: ERROR,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: ERROR,
  },

  /* ── Sign In button ── */
  signInButton: {
    height: 48,
    backgroundColor: PRIMARY,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  signInButtonDisabled: {
    opacity: 0.45,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  /* ── Divider ── */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: TEXT_SECONDARY,
  },

  /* ── Register button ── */
  registerButton: {
    height: 46,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: TEXT_MAIN,
  },
});
