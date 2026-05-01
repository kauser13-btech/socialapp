import { useState } from 'react';
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
  const { colors, isDark } = useTheme();

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
  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.keyboardView}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={s.brand}>
            <Image
              source={require('../../../assets/logo_full.png')}
              style={s.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Form */}
          <View style={s.form}>
            <Text style={s.formTitle}>Sign in</Text>

            {/* Email field */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Email address</Text>
              <TextInput
                style={[
                  s.input,
                  focusedField === 'email' && s.inputFocused,
                  errors.email && s.inputError,
                ]}
                placeholder="you@example.com"
                placeholderTextColor={colors.textTertiary}
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
                keyboardAppearance={isDark ? 'dark' : 'light'}
              />
              {errors.email ? <Text style={s.errorText}>{errors.email}</Text> : null}
            </View>

            {/* Password field */}
            <View style={s.fieldGroup}>
              <View style={s.labelRow}>
                <Text style={s.label}>Password</Text>
                <TouchableOpacity>
                  <Text style={s.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[
                  s.input,
                  focusedField === 'password' && s.inputFocused,
                  errors.password && s.inputError,
                ]}
                placeholder="••••••••"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors((e) => ({ ...e, password: null }));
                }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry
                autoCapitalize="none"
                keyboardAppearance={isDark ? 'dark' : 'light'}
              />
              {errors.password ? <Text style={s.errorText}>{errors.password}</Text> : null}
            </View>
          </View>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>New to Unomi?</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Register CTA */}
          <TouchableOpacity
            style={s.registerButton}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.75}
          >
            <Text style={s.registerButtonText}>Create an account</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Sign In button — anchored above keyboard */}
        <View style={s.signInButtonContainer}>
          <TouchableOpacity
            style={[s.signInButton, isDisabled && s.signInButtonDisabled]}
            onPress={handleLogin}
            disabled={isDisabled}
            activeOpacity={0.85}
          >
            <Text style={s.signInButtonText}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.textPrimary,
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
      color: colors.textPrimary,
      marginBottom: 6,
    },
    forgotLink: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '500',
      marginBottom: 6,
    },
    input: {
      height: 46,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.inputBackground,
    },
    inputFocused: {
      borderColor: colors.primary,
      backgroundColor: colors.surface,
    },
    inputError: {
      borderColor: colors.error,
    },
    errorText: {
      marginTop: 4,
      fontSize: 12,
      color: colors.error,
    },

    /* ── Sign In button ── */
    signInButtonContainer: {
      paddingHorizontal: 24,
      paddingBottom: 16,
      paddingTop: 8,
      backgroundColor: colors.background,
    },
    signInButton: {
      height: 48,
      backgroundColor: colors.primary,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signInButtonDisabled: {
      opacity: 0.45,
    },
    signInButtonText: {
      color: colors.white,
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
      backgroundColor: colors.border,
    },
    dividerText: {
      marginHorizontal: 12,
      fontSize: 13,
      color: colors.textSecondary,
    },

    /* ── Register button ── */
    registerButton: {
      height: 46,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    registerButtonText: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
    },
  });
}
