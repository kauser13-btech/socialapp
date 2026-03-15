import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  PanResponder,
  Dimensions,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { Avatar } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { userAPI } from '../../lib/api';
import { spacing, fontSize, fontWeight } from '../../constants/styles';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CROP_SIZE = SCREEN_WIDTH * 0.7;
const CONTAINER_SIZE = CROP_SIZE * 1.4;

// ─── Image Crop Modal (intentionally dark-themed as it's an overlay) ──────────
function ImageCropModal({ uri, onApply, onCancel }) {
  const naturalSize = useRef(null);
  const scaleRef = useRef(1);
  const posRef = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [, forceRender] = useState(0);
  const tick = () => forceRender(n => n + 1);

  const clamp = (x, y, s) => {
    if (!naturalSize.current) return { x, y };
    const iw = naturalSize.current.width * s;
    const ih = naturalSize.current.height * s;
    const pad = (CONTAINER_SIZE - CROP_SIZE) / 2;
    return {
      x: Math.min(pad, Math.max(pad + CROP_SIZE - iw, x)),
      y: Math.min(pad, Math.max(pad + CROP_SIZE - ih, y)),
    };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { dragStart.current = { ...posRef.current }; },
      onPanResponderMove: (_, g) => {
        posRef.current = clamp(dragStart.current.x + g.dx, dragStart.current.y + g.dy, scaleRef.current);
        tick();
      },
    }),
  ).current;

  const handleImageLoad = (e) => {
    const src = e.nativeEvent.source;
    if (!src.width || !src.height) return;
    naturalSize.current = { width: src.width, height: src.height };
    const s = Math.max(CONTAINER_SIZE / src.width, CONTAINER_SIZE / src.height);
    scaleRef.current = s;
    posRef.current = clamp((CONTAINER_SIZE - src.width * s) / 2, (CONTAINER_SIZE - src.height * s) / 2, s);
    setReady(true);
  };

  const changeScale = (delta) => {
    const next = Math.min(4, Math.max(0.5, scaleRef.current + delta));
    posRef.current = clamp(posRef.current.x, posRef.current.y, next);
    scaleRef.current = next;
    tick();
  };

  const s = scaleRef.current;
  const pos = posRef.current;
  const minScale = naturalSize.current
    ? Math.max(CONTAINER_SIZE / naturalSize.current.width, CONTAINER_SIZE / naturalSize.current.height) : 1;
  const zoomPct = `${Math.round(Math.min(100, Math.max(0, ((s - minScale) / (4 - minScale)) * 100)))}%`;

  return (
    <Modal visible animationType="fade" transparent>
      <View style={cropStyles.overlay}>
        <View style={cropStyles.sheet}>
          <Text style={cropStyles.title}>Adjust Profile Photo</Text>
          <View style={[cropStyles.cropContainer, { width: CONTAINER_SIZE, height: CONTAINER_SIZE }]} {...panResponder.panHandlers}>
            <Image
              source={{ uri }}
              onLoad={handleImageLoad}
              style={{ position: 'absolute', width: naturalSize.current ? naturalSize.current.width * s : CONTAINER_SIZE, height: naturalSize.current ? naturalSize.current.height * s : CONTAINER_SIZE, left: pos.x, top: pos.y, opacity: ready ? 1 : 0 }}
            />
            <View style={[cropStyles.overlayBand, { height: (CONTAINER_SIZE - CROP_SIZE) / 2 }]} />
            <View style={{ flexDirection: 'row', height: CROP_SIZE }}>
              <View style={[cropStyles.overlayBand, { width: (CONTAINER_SIZE - CROP_SIZE) / 2, height: CROP_SIZE }]} />
              <View style={cropStyles.cropCircle} pointerEvents="none" />
              <View style={[cropStyles.overlayBand, { width: (CONTAINER_SIZE - CROP_SIZE) / 2, height: CROP_SIZE }]} />
            </View>
            <View style={[cropStyles.overlayBand, { height: (CONTAINER_SIZE - CROP_SIZE) / 2 }]} />
          </View>
          <View style={cropStyles.zoomRow}>
            <TouchableOpacity onPress={() => changeScale(-0.2)} style={cropStyles.zoomBtn}><Text style={cropStyles.zoomBtnText}>−</Text></TouchableOpacity>
            <View style={cropStyles.sliderTrack}><View style={[cropStyles.sliderFill, { width: zoomPct }]} /></View>
            <TouchableOpacity onPress={() => changeScale(0.2)} style={cropStyles.zoomBtn}><Text style={cropStyles.zoomBtnText}>+</Text></TouchableOpacity>
          </View>
          <Text style={cropStyles.hint}>Drag to reposition • Tap −/+ to zoom</Text>
          <View style={cropStyles.btnRow}>
            <TouchableOpacity style={cropStyles.cancelBtn} onPress={onCancel}><Text style={cropStyles.cancelBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={cropStyles.applyBtn} onPress={() => onApply({ uri })}><Text style={cropStyles.applyBtnText}>Apply</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Photo Source Action Sheet ────────────────────────────────────────────────
function PhotoActionSheet({ onCamera, onLibrary, onRemove, hasAvatar, onClose, colors }) {
  const options = [
    { label: '📷  Take Photo', onPress: onCamera },
    { label: '🖼️  Choose from Library', onPress: onLibrary },
    ...(hasAvatar ? [{ label: '🗑️  Remove Photo', onPress: onRemove, danger: true }] : []),
  ];
  return (
    <Modal visible animationType="slide" transparent>
      <TouchableOpacity style={sheetStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[sheetStyles.sheet, { backgroundColor: colors.cardBackground }]}>
        <View style={[sheetStyles.handle, { backgroundColor: colors.border }]} />
        <Text style={[sheetStyles.title, { color: colors.textPrimary, borderBottomColor: colors.border }]}>Profile Photo</Text>
        {options.map((opt, i) => (
          <TouchableOpacity
            key={opt.label}
            style={[sheetStyles.option, i < options.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            onPress={() => { onClose(); setTimeout(opt.onPress, 300); }}
          >
            <Text style={[sheetStyles.optionText, { color: opt.danger ? colors.error : colors.textPrimary }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[sheetStyles.cancelOption, { backgroundColor: colors.gray100 }]} onPress={onClose}>
          <Text style={[sheetStyles.cancelOptionText, { color: colors.textPrimary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EditProfileScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { colors } = useTheme();
  const [form, setForm] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '', bio: user?.bio || '', location: user?.location || '' });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errors, setErrors] = useState({});
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [cropUri, setCropUri] = useState(null);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const pickFromLibrary = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.9, selectionLimit: 1 }, (res) => {
      if (res.didCancel || res.errorCode) return;
      const asset = res.assets?.[0];
      if (asset) setCropUri(asset.uri);
    });
  };

  const pickFromCamera = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, { title: 'Camera Permission', message: 'This app needs camera access to take a profile photo.', buttonPositive: 'Allow', buttonNegative: 'Deny' });
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) { Alert.alert('Permission Denied', 'Camera access is required.'); return; }
    }
    launchCamera({ mediaType: 'photo', quality: 0.9, saveToPhotos: false }, (res) => {
      if (res.didCancel || res.errorCode) return;
      const asset = res.assets?.[0];
      if (asset) setCropUri(asset.uri);
    });
  };

  const handleRemovePhoto = () => {
    Alert.alert('Remove Photo', 'Are you sure you want to remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        setUploadingAvatar(true);
        userAPI.updateProfile({ avatar_url: null })
          .then(() => refreshUser())
          .catch(e => Alert.alert('Error', e.message || 'Failed to remove photo.'))
          .finally(() => setUploadingAvatar(false));
      }},
    ]);
  };

  const handleCropApply = ({ uri }) => {
    setCropUri(null);
    setUploadingAvatar(true);
    userAPI.uploadAvatar({ uri, type: 'image/jpeg', fileName: 'avatar.jpg' })
      .then(() => refreshUser())
      .catch(error => { const prefix = error.status ? 'HTTP ' + error.status + ': ' : ''; Alert.alert('Upload Error', prefix + (error.message || 'Failed to upload photo.')); })
      .finally(() => setUploadingAvatar(false));
  };

  const handleSave = async () => {
    if (!form.first_name.trim()) { setErrors({ first_name: 'First name is required' }); return; }
    setSaving(true);
    try {
      const response = await userAPI.updateProfile({ first_name: form.first_name.trim(), last_name: form.last_name.trim(), bio: form.bio.trim() || null, location: form.location.trim() || null });
      if (response.success) {
        await refreshUser();
        Alert.alert('Success', 'Profile updated successfully.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (error) {
      if (error.errors) setErrors(error.errors);
      else Alert.alert('Error', error.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={() => setShowActionSheet(true)} disabled={uploadingAvatar}>
            <Avatar user={user} size="xlarge" />
            {uploadingAvatar ? (
              <View style={styles.avatarOverlay}><ActivityIndicator color="#fff" size="large" /></View>
            ) : (
              <View style={[styles.cameraIconBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                <Text style={styles.cameraIcon}>📷</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowActionSheet(true)} disabled={uploadingAvatar}>
            <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change Profile Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.form, { backgroundColor: colors.cardBackground, shadowColor: '#000' }]}>
          <Field label="First Name" value={form.first_name} onChangeText={(v) => handleChange('first_name', v)} error={errors.first_name} placeholder="First name" colors={colors} />
          <Field label="Last Name" value={form.last_name} onChangeText={(v) => handleChange('last_name', v)} error={errors.last_name} placeholder="Last name" colors={colors} />
          <Field label="Bio" value={form.bio} onChangeText={(v) => handleChange('bio', v)} error={errors.bio} placeholder="Tell people about yourself..." multiline numberOfLines={3} maxLength={500} colors={colors} />
          <Field label="Location" value={form.location} onChangeText={(v) => handleChange('location', v)} error={errors.location} placeholder="e.g. New York, NY" colors={colors} />
        </View>

        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={saving}>
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      {showActionSheet && (
        <PhotoActionSheet
          onCamera={pickFromCamera}
          onLibrary={pickFromLibrary}
          onRemove={handleRemovePhoto}
          hasAvatar={!!user?.avatar_url}
          onClose={() => setShowActionSheet(false)}
          colors={colors}
        />
      )}
      {cropUri && <ImageCropModal uri={cropUri} onApply={handleCropApply} onCancel={() => setCropUri(null)} />}
    </SafeAreaView>
  );
}

// ─── Field Component ──────────────────────────────────────────────────────────
function Field({ label, error, multiline, colors, ...inputProps }) {
  return (
    <View style={fieldStyles.container}>
      <Text style={[fieldStyles.label, { color: colors.textPrimary }]}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.inputBackground }, multiline && fieldStyles.multiline, error && { borderColor: colors.error }]}
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...inputProps}
      />
      {error && <Text style={[fieldStyles.errorText, { color: colors.error }]}>{error}</Text>}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.md },
  multiline: { minHeight: 80, paddingTop: spacing.sm },
  errorText: { marginTop: 4, fontSize: fontSize.xs },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.md },
  avatarSection: { alignItems: 'center', paddingVertical: spacing.lg },
  avatarWrapper: { position: 'relative' },
  avatarOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 48, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  cameraIconBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  cameraIcon: { fontSize: 14 },
  changePhotoText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginTop: spacing.sm },
  form: { borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  saveButton: { borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  cancelButton: { borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center' },
  cancelButtonText: { fontSize: fontSize.md },
});

const sheetStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34, paddingHorizontal: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 12 },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, textAlign: 'center', marginBottom: 8, paddingBottom: 12, borderBottomWidth: 1 },
  option: { paddingVertical: 16 },
  optionText: { fontSize: fontSize.md, textAlign: 'center' },
  cancelOption: { marginTop: 8, borderRadius: 12, paddingVertical: 14 },
  cancelOptionText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, textAlign: 'center' },
});

// Crop modal stays dark by design (it's a camera/photo overlay)
const cropStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  sheet: { backgroundColor: '#1c1c1e', borderRadius: 20, paddingBottom: 24, paddingHorizontal: 20, paddingTop: 20, width: '100%', maxWidth: SCREEN_WIDTH - 32, alignItems: 'center' },
  title: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginBottom: 16 },
  cropContainer: { borderRadius: 8, overflow: 'hidden', backgroundColor: '#000', alignSelf: 'center' },
  overlayBand: { backgroundColor: 'rgba(0,0,0,0.6)' },
  cropCircle: { width: CROP_SIZE, height: CROP_SIZE, borderRadius: CROP_SIZE / 2, borderWidth: 2, borderColor: '#fff', overflow: 'hidden' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10, width: '100%' },
  sliderTrack: { flex: 1, height: 4, backgroundColor: '#444', borderRadius: 2, overflow: 'hidden' },
  sliderFill: { height: 4, backgroundColor: '#1877F2', borderRadius: 2 },
  zoomBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
  zoomBtnText: { color: '#fff', fontSize: 20, lineHeight: 26 },
  hint: { color: '#888', fontSize: fontSize.xs, marginTop: 8 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  cancelBtn: { flex: 1, backgroundColor: '#333', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.medium },
  applyBtn: { flex: 1, backgroundColor: '#1877F2', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
