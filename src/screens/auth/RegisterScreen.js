import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button, Input, Card } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { searchAPI } from '../../lib/api';
import { spacing, fontSize, fontWeight } from '../../constants/styles';

// ── DOB helpers ────────────────────────────────────────────────────────────────
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function buildYears() {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current - 13; y >= current - 100; y--) years.push(y);
  return years;
}

function daysInMonth(month, year) {
  // month is 1-based
  return new Date(year, month, 0).getDate();
}

function formatDOB(day, month, year) {
  if (!day || !month || !year) return '';
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function displayDOB(day, month, year) {
  if (!day || !month || !year) return '';
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

// ── ScrollPicker ───────────────────────────────────────────────────────────────
function ScrollPicker({ items, selected, onSelect, colors }) {
  const ITEM_H = 44;
  const ref = React.useRef(null);

  const selectedIdx = items.indexOf(selected);

  useEffect(() => {
    if (ref.current && selectedIdx >= 0) {
      ref.current.scrollToIndex({ index: selectedIdx, animated: false, viewPosition: 0.5 });
    }
  }, []);

  return (
    <FlatList
      ref={ref}
      data={items}
      keyExtractor={String}
      showsVerticalScrollIndicator={false}
      style={{ height: ITEM_H * 5 }}
      getItemLayout={(_, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      onMomentumScrollEnd={(e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
        const clamped = Math.max(0, Math.min(idx, items.length - 1));
        onSelect(items[clamped]);
      }}
      renderItem={({ item }) => {
        const isSelected = item === selected;
        return (
          <TouchableOpacity
            style={[styles.pickerItem, { height: ITEM_H }]}
            onPress={() => onSelect(item)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.pickerItemText,
              { color: isSelected ? colors.primary : colors.textSecondary },
              isSelected && styles.pickerItemSelected,
            ]}>
              {item}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
    date_of_birth: '',
    interests: [],
  });

  // DOB state
  const [dobDay, setDobDay] = useState(1);
  const [dobMonth, setDobMonth] = useState(1);
  const [dobYear, setDobYear] = useState(new Date().getFullYear() - 18);
  const [showDobPicker, setShowDobPicker] = useState(false);

  // Interests
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
  const { colors, isDark } = useTheme();

  const years = buildYears();
  const days = Array.from({ length: daysInMonth(dobMonth, dobYear) }, (_, i) => i + 1);

  useEffect(() => {
    searchAPI.getCategories()
      .then((res) => {
        if (res.success) setCategories(res.data.categories || []);
      })
      .catch((e) => {
        console.log(e);
      })
      .finally(() => setLoadingCategories(false));
  }, []);

  const confirmDob = () => {
    // Clamp day if month changed
    const maxDay = daysInMonth(dobMonth, dobYear);
    const safeDay = Math.min(dobDay, maxDay);
    setDobDay(safeDay);
    const dob = formatDOB(safeDay, dobMonth, dobYear);
    setFormData((prev) => ({ ...prev, date_of_birth: dob }));
    setShowDobPicker(false);
  };

  const toggleInterest = (id) => {
    setFormData((prev) => {
      const already = prev.interests.includes(id);
      return {
        ...prev,
        interests: already
          ? prev.interests.filter((i) => i !== id)
          : [...prev.interests, id],
      };
    });
  };

  const handleRegister = async () => {
    setErrors({});
    setLoading(true);
    try {
      await register(formData);
    } catch (error) {
      console.log('e', error);
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

  const isFormValid = () =>
    formData.first_name &&
    formData.last_name &&
    formData.username &&
    formData.email &&
    formData.password &&
    formData.password_confirmation &&
    formData.password === formData.password_confirmation;

  const dobDisplay = formData.date_of_birth
    ? displayDOB(dobDay, dobMonth, dobYear)
    : '';
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Image
              source={require('../../../assets/logo_icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Card style={styles.formCard}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign up to get started</Text>

            <Input label="First Name" placeholder="Enter your first name" value={formData.first_name} onChangeText={(t) => updateField('first_name', t)} error={errors.first_name} autoCapitalize="words" />
            <Input label="Last Name" placeholder="Enter your last name" value={formData.last_name} onChangeText={(t) => updateField('last_name', t)} error={errors.last_name} autoCapitalize="words" />
            <Input label="Username" placeholder="Choose a username" value={formData.username} onChangeText={(t) => updateField('username', t)} error={errors.username} autoCapitalize="none" />
            <Input label="Email" placeholder="Enter your email" value={formData.email} onChangeText={(t) => updateField('email', t)} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <Input label="Password" placeholder="Choose a password" value={formData.password} onChangeText={(t) => updateField('password', t)} error={errors.password} secureTextEntry autoCapitalize="none" />
            <Input label="Confirm Password" placeholder="Confirm your password" value={formData.password_confirmation} onChangeText={(t) => updateField('password_confirmation', t)} error={errors.password_confirmation} secureTextEntry autoCapitalize="none" />

            {/* Date of Birth */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Date of Birth</Text>
              <TouchableOpacity
                style={[
                  styles.dobButton,
                  {
                    borderColor: showDobPicker ? colors.primary : colors.border,
                    backgroundColor: isDark ? colors.cardBackground : '#f9fafb',
                  },
                ]}
                onPress={() => setShowDobPicker(true)}
                activeOpacity={0.8}
              >
                <Icon name="calendar-outline" size={20} color={dobDisplay ? colors.primary : colors.textSecondary} />
                <Text style={[styles.dobText, { color: dobDisplay ? colors.textPrimary : colors.textSecondary }]}>
                  {dobDisplay || 'Select your date of birth'}
                </Text>
                <Icon name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              {errors.date_of_birth && (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.date_of_birth}</Text>
              )}
            </View>

            {/* Interests */}
            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                Your Interests
                <Text style={[styles.optionalTag, { color: colors.textSecondary }]}> (optional)</Text>
              </Text>
              <Text style={[styles.interestHint, { color: colors.textSecondary }]}>
                Select categories you enjoy to personalise your feed
              </Text>
              {loadingCategories ? (
                <Text style={[styles.interestHint, { color: colors.textSecondary }]}>Loading...</Text>
              ) : (
                <View style={styles.interestGrid}>
                  {categories.map((cat) => {
                    const selected = formData.interests.includes(cat.id);
                    const unselectedBg = isDark ? colors.cardBackground : '#f3f4f6';
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.interestChip,
                          {
                            backgroundColor: selected ? colors.primary : unselectedBg,
                            borderColor: selected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => toggleInterest(cat.id)}
                        activeOpacity={0.75}
                      >
                        <Text style={[
                          styles.interestChipText,
                          { color: selected ? '#ffffff' : colors.textSecondary },
                        ]}>
                          {cat.name}
                        </Text>
                        {selected && (
                          <Icon name="checkmark" size={13} color="#ffffff" style={{ marginLeft: 4 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

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

      {/* DOB Picker Modal */}
      <Modal visible={showDobPicker} transparent animationType="slide" onRequestClose={() => setShowDobPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowDobPicker(false)}>
                <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Date of Birth</Text>
              <TouchableOpacity onPress={confirmDob}>
                <Text style={[styles.modalDone, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickersRow}>
              {/* Month */}
              <View style={styles.pickerCol}>
                <Text style={[styles.pickerColLabel, { color: colors.textSecondary }]}>Month</Text>
                <ScrollPicker
                  items={MONTHS}
                  selected={MONTHS[dobMonth - 1]}
                  onSelect={(m) => setDobMonth(MONTHS.indexOf(m) + 1)}
                  colors={colors}
                />
              </View>
              {/* Day */}
              <View style={[styles.pickerCol, styles.pickerColSmall]}>
                <Text style={[styles.pickerColLabel, { color: colors.textSecondary }]}>Day</Text>
                <ScrollPicker
                  items={days}
                  selected={Math.min(dobDay, days.length)}
                  onSelect={setDobDay}
                  colors={colors}
                />
              </View>
              {/* Year */}
              <View style={[styles.pickerCol, styles.pickerColSmall]}>
                <Text style={[styles.pickerColLabel, { color: colors.textSecondary }]}>Year</Text>
                <ScrollPicker
                  items={years}
                  selected={dobYear}
                  onSelect={setDobYear}
                  colors={colors}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logoImage: { width: 140, height: 140 },
  formCard: { padding: spacing.xl },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.md, marginBottom: spacing.xl },
  registerButton: { marginTop: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg },
  footerText: { fontSize: fontSize.sm },

  /* DOB */
  fieldBlock: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  optionalTag: { fontSize: 12, fontWeight: '400' },
  dobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  dobText: { flex: 1, fontSize: 15, fontWeight: '500' },
  errorText: { fontSize: 12, marginTop: 4 },

  /* Interests */
  interestHint: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  interestChipText: { fontSize: 13, fontWeight: '600' },

  /* DOB Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalCancel: { fontSize: 15 },
  modalDone: { fontSize: 15, fontWeight: '700' },
  pickersRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  pickerCol: { flex: 2, alignItems: 'center' },
  pickerColSmall: { flex: 1 },
  pickerColLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerItem: { alignItems: 'center', justifyContent: 'center' },
  pickerItemText: { fontSize: 16 },
  pickerItemSelected: { fontWeight: '700', fontSize: 17 },
});
