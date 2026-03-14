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
import { userAPI } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight } from '../../constants/styles';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CROP_SIZE = SCREEN_WIDTH * 0.7;
const CONTAINER_SIZE = CROP_SIZE * 1.4;

// ─── Image Crop Modal ────────────────────────────────────────────────────────
function ImageCropModal({ uri, onApply, onCancel }) {
  // All mutable values in refs — PanResponder.create() is called once and
  // its callbacks would close over stale state if we used useState.
  const naturalSize = useRef(null);   // set after Image onLoad
  const scaleRef = useRef(1);
  const posRef = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [, forceRender] = useState(0);
  const tick = () => forceRender(n => n + 1);

  // Clamp so the scaled image always covers the crop circle.
  // position is the image's top-left corner inside the container.
  const clamp = (x, y, s) => {
    if (!naturalSize.current) return { x, y };
    const iw = naturalSize.current.width * s;
    const ih = naturalSize.current.height * s;
    const pad = (CONTAINER_SIZE - CROP_SIZE) / 2;
    // right edge of image must be >= right edge of crop circle
    const maxX = pad;
    const minX = pad + CROP_SIZE - iw;
    // bottom edge of image must be >= bottom edge of crop circle
    const maxY = pad;
    const minY = pad + CROP_SIZE - ih;
    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStart.current = { ...posRef.current };
      },
      onPanResponderMove: (_, g) => {
        posRef.current = clamp(
          dragStart.current.x + g.dx,
          dragStart.current.y + g.dy,
          scaleRef.current,
        );
        tick();
      },
    }),
  ).current;

  const handleImageLoad = (e) => {
    // RN Image onLoad: e.nativeEvent = { source: { width, height, ... } }
    const src = e.nativeEvent.source;
    const w = src.width;
    const h = src.height;
    if (!w || !h) return;
    naturalSize.current = { width: w, height: h };
    // Initial scale: fill the container so the image covers the crop circle
    const s = Math.max(CONTAINER_SIZE / w, CONTAINER_SIZE / h);
    scaleRef.current = s;
    // Center the image inside the container
    const iw = w * s;
    const ih = h * s;
    posRef.current = clamp(
      (CONTAINER_SIZE - iw) / 2,
      (CONTAINER_SIZE - ih) / 2,
      s,
    );
    setReady(true);
  };

  const changeScale = (delta) => {
    const next = Math.min(4, Math.max(0.5, scaleRef.current + delta));
    posRef.current = clamp(posRef.current.x, posRef.current.y, next);
    scaleRef.current = next;
    tick();
  };

  const handleApply = () => {
    onApply({ uri });
  };

  const s = scaleRef.current;
  const pos = posRef.current;
  const minScale = naturalSize.current
    ? Math.max(CONTAINER_SIZE / naturalSize.current.width, CONTAINER_SIZE / naturalSize.current.height)
    : 1;
  const maxScale = 4;
  const zoomPct = `${Math.round(Math.min(100, Math.max(0, ((s - minScale) / (maxScale - minScale)) * 100)))}%`;

  return (
    <Modal visible animationType="fade" transparent>
      <View style={cropStyles.overlay}>
        <View style={cropStyles.sheet}>
          <Text style={cropStyles.title}>Adjust Profile Photo</Text>

          {/* Container with pan handler */}
          <View
            style={[cropStyles.cropContainer, { width: CONTAINER_SIZE, height: CONTAINER_SIZE }]}
            {...panResponder.panHandlers}
          >
            {/* The actual image — hidden until onLoad fires */}
            <Image
              source={{ uri }}
              onLoad={handleImageLoad}
              style={{
                position: 'absolute',
                width: naturalSize.current ? naturalSize.current.width * s : CONTAINER_SIZE,
                height: naturalSize.current ? naturalSize.current.height * s : CONTAINER_SIZE,
                left: pos.x,
                top: pos.y,
                opacity: ready ? 1 : 0,
              }}
            />

            {/* Dark overlay — top */}
            <View style={[cropStyles.overlayBand, { height: (CONTAINER_SIZE - CROP_SIZE) / 2 }]} />
            {/* Middle row: side overlays + transparent crop circle */}
            <View style={{ flexDirection: 'row', height: CROP_SIZE }}>
              <View style={[cropStyles.overlayBand, { width: (CONTAINER_SIZE - CROP_SIZE) / 2, height: CROP_SIZE }]} />
              <View style={cropStyles.cropCircle} pointerEvents="none" />
              <View style={[cropStyles.overlayBand, { width: (CONTAINER_SIZE - CROP_SIZE) / 2, height: CROP_SIZE }]} />
            </View>
            {/* Dark overlay — bottom */}
            <View style={[cropStyles.overlayBand, { height: (CONTAINER_SIZE - CROP_SIZE) / 2 }]} />
          </View>

          {/* Zoom controls */}
          <View style={cropStyles.zoomRow}>
            <TouchableOpacity onPress={() => changeScale(-0.2)} style={cropStyles.zoomBtn}>
              <Text style={cropStyles.zoomBtnText}>−</Text>
            </TouchableOpacity>
            <View style={cropStyles.sliderTrack}>
              <View style={[cropStyles.sliderFill, { width: zoomPct }]} />
            </View>
            <TouchableOpacity onPress={() => changeScale(0.2)} style={cropStyles.zoomBtn}>
              <Text style={cropStyles.zoomBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={cropStyles.hint}>Drag to reposition • Tap −/+ to zoom</Text>

          <View style={cropStyles.btnRow}>
            <TouchableOpacity style={cropStyles.cancelBtn} onPress={onCancel}>
              <Text style={cropStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={cropStyles.applyBtn} onPress={handleApply}>
              <Text style={cropStyles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Photo Source Action Sheet ───────────────────────────────────────────────
function PhotoActionSheet({ onCamera, onLibrary, onRemove, hasAvatar, onClose }) {
  const options = [
    { label: '📷  Take Photo', onPress: onCamera },
    { label: '🖼️  Choose from Library', onPress: onLibrary },
    ...(hasAvatar ? [{ label: '🗑️  Remove Photo', onPress: onRemove, danger: true }] : []),
  ];

  return (
    <Modal visible animationType="slide" transparent>
      <TouchableOpacity style={sheetStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={sheetStyles.sheet}>
        <View style={sheetStyles.handle} />
        <Text style={sheetStyles.title}>Profile Photo</Text>
        {options.map((opt, i) => (
          <TouchableOpacity
            key={opt.label}
            style={[sheetStyles.option, i < options.length - 1 && sheetStyles.optionBorder]}
            onPress={() => { onClose(); setTimeout(opt.onPress, 300); }}
          >
            <Text style={[sheetStyles.optionText, opt.danger && sheetStyles.dangerText]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={sheetStyles.cancelOption} onPress={onClose}>
          <Text style={sheetStyles.cancelOptionText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function EditProfileScreen({ navigation }) {
  const { user, refreshUser } = useAuth();

  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    bio: user?.bio || '',
    location: user?.location || '',
  });
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
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.9, selectionLimit: 1 },
      (res) => {
        if (res.didCancel || res.errorCode) return;
        const asset = res.assets?.[0];
        if (asset) setCropUri(asset.uri);
      },
    );
  };

  const pickFromCamera = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'This app needs access to your camera to take a profile photo.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Denied', 'Camera access is required to take a photo.');
        return;
      }
    }
    launchCamera(
      { mediaType: 'photo', quality: 0.9, saveToPhotos: false },
      (res) => {
        if (res.didCancel || res.errorCode) return;
        const asset = res.assets?.[0];
        if (asset) setCropUri(asset.uri);
      },
    );
  };

  const handleRemovePhoto = async () => {
    Alert.alert('Remove Photo', 'Are you sure you want to remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          setUploadingAvatar(true);
          try {
            await userAPI.updateProfile({ avatar_url: null });
            await refreshUser();
          } catch (e) {
            Alert.alert('Error', e.message || 'Failed to remove photo.');
          } finally {
            setUploadingAvatar(false);
          }
        },
      },
    ]);
  };

  const handleCropApply = async ({ uri }) => {
    setCropUri(null);
    setUploadingAvatar(true);
    console.log('[Avatar] uploading uri:', uri);
    try {
      await userAPI.uploadAvatar({
        uri,
        type: 'image/jpeg',
        fileName: 'avatar.jpg',
      });
      await refreshUser();
    } catch (error) {
      console.log('[Avatar] upload error:', JSON.stringify(error));
      const prefix = error.status ? 'HTTP ' + error.status + ': ' : '';
      Alert.alert('Upload Error', prefix + (error.message || 'Failed to upload photo.'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!form.first_name.trim()) {
      setErrors({ first_name: 'First name is required' });
      return;
    }
    setSaving(true);
    try {
      const response = await userAPI.updateProfile({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        bio: form.bio.trim() || null,
        location: form.location.trim() || null,
      });
      if (response.success) {
        await refreshUser();
        Alert.alert('Success', 'Profile updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      if (error.errors) setErrors(error.errors);
      else Alert.alert('Error', error.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => setShowActionSheet(true)}
            disabled={uploadingAvatar}
          >
            <Avatar user={user} size="xlarge" />
            {uploadingAvatar ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" size="large" />
              </View>
            ) : (
              <View style={styles.cameraIconBadge}>
                <Text style={styles.cameraIcon}>📷</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowActionSheet(true)}
            disabled={uploadingAvatar}
          >
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Field
            label="First Name"
            value={form.first_name}
            onChangeText={(v) => handleChange('first_name', v)}
            error={errors.first_name}
            placeholder="First name"
          />
          <Field
            label="Last Name"
            value={form.last_name}
            onChangeText={(v) => handleChange('last_name', v)}
            error={errors.last_name}
            placeholder="Last name"
          />
          <Field
            label="Bio"
            value={form.bio}
            onChangeText={(v) => handleChange('bio', v)}
            error={errors.bio}
            placeholder="Tell people about yourself..."
            multiline
            numberOfLines={3}
            maxLength={500}
          />
          <Field
            label="Location"
            value={form.location}
            onChangeText={(v) => handleChange('location', v)}
            error={errors.location}
            placeholder="e.g. New York, NY"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveButtonText}>Save Changes</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={saving}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Action sheet */}
      {showActionSheet && (
        <PhotoActionSheet
          onCamera={pickFromCamera}
          onLibrary={pickFromLibrary}
          onRemove={handleRemovePhoto}
          hasAvatar={!!user?.avatar_url}
          onClose={() => setShowActionSheet(false)}
        />
      )}

      {/* Crop modal */}
      {cropUri && (
        <ImageCropModal
          uri={cropUri}
          onApply={handleCropApply}
          onCancel={() => setCropUri(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Field Component ─────────────────────────────────────────────────────────
function Field({ label, error, multiline, ...inputProps }) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[
          fieldStyles.input,
          multiline && fieldStyles.multiline,
          error && fieldStyles.inputError,
        ]}
        placeholderTextColor={colors.textSecondary || '#999'}
        autoCapitalize="none"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...inputProps}
      />
      {error && <Text style={fieldStyles.errorText}>{error}</Text>}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const fieldStyles = StyleSheet.create({
  container: { marginBottom: spacing.md || 16 },
  label: { fontSize: fontSize.sm || 14, fontWeight: fontWeight.medium || '500', color: colors.textPrimary || '#333', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border || '#e0e0e0', borderRadius: 10, paddingHorizontal: spacing.md || 16, paddingVertical: spacing.sm || 10, fontSize: fontSize.md || 16, color: colors.textPrimary || '#333', backgroundColor: '#fff' },
  multiline: { minHeight: 80, paddingTop: spacing.sm || 10 },
  inputError: { borderColor: '#ef4444' },
  errorText: { marginTop: 4, fontSize: fontSize.xs || 12, color: '#ef4444' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background || '#f5f5f5' },
  scroll: { padding: spacing.md || 16 },
  avatarSection: { alignItems: 'center', paddingVertical: spacing.lg || 24 },
  avatarWrapper: { position: 'relative' },
  avatarOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 48, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  cameraIconBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary || '#007AFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  cameraIcon: { fontSize: 14 },
  changePhotoText: { color: colors.primary || '#007AFF', fontSize: fontSize.md || 16, fontWeight: fontWeight.semibold || '600', marginTop: spacing.sm || 8 },
  form: { backgroundColor: '#fff', borderRadius: 12, padding: spacing.md || 16, marginBottom: spacing.md || 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  saveButton: { backgroundColor: colors.primary || '#007AFF', borderRadius: 12, paddingVertical: spacing.md || 14, alignItems: 'center', marginBottom: spacing.sm || 8 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: fontSize.md || 16, fontWeight: fontWeight.semibold || '600' },
  cancelButton: { borderRadius: 12, paddingVertical: spacing.md || 14, alignItems: 'center' },
  cancelButtonText: { color: colors.textSecondary || '#666', fontSize: fontSize.md || 16 },
});

const sheetStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 34, paddingHorizontal: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginTop: 10, marginBottom: 12 },
  title: { fontSize: fontSize.md || 16, fontWeight: fontWeight.semibold || '600', color: colors.textPrimary || '#333', textAlign: 'center', marginBottom: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  option: { paddingVertical: 16 },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  optionText: { fontSize: fontSize.md || 16, color: colors.textPrimary || '#333', textAlign: 'center' },
  dangerText: { color: '#ef4444' },
  cancelOption: { marginTop: 8, backgroundColor: '#f5f5f5', borderRadius: 12, paddingVertical: 14 },
  cancelOptionText: { fontSize: fontSize.md || 16, fontWeight: fontWeight.semibold || '600', color: colors.textPrimary || '#333', textAlign: 'center' },
});

const cropStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  sheet: { backgroundColor: '#1c1c1e', borderRadius: 20, paddingBottom: 24, paddingHorizontal: 20, paddingTop: 20, width: '100%', maxWidth: SCREEN_WIDTH - 32, alignItems: 'center' },
  title: { color: '#fff', fontSize: fontSize.md || 16, fontWeight: fontWeight.semibold || '600', marginBottom: 16 },
  cropContainer: { borderRadius: 8, overflow: 'hidden', backgroundColor: '#000', alignSelf: 'center' },
  overlayBand: { backgroundColor: 'rgba(0,0,0,0.6)' },
  cropCircle: { width: CROP_SIZE, height: CROP_SIZE, borderRadius: CROP_SIZE / 2, borderWidth: 2, borderColor: '#fff', overflow: 'hidden' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10, width: '100%' },
  sliderTrack: { flex: 1, height: 4, backgroundColor: '#444', borderRadius: 2, overflow: 'hidden' },
  sliderFill: { height: 4, backgroundColor: colors.primary || '#007AFF', borderRadius: 2 },
  zoomBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
  zoomBtnText: { color: '#fff', fontSize: 20, lineHeight: 26 },
  hint: { color: '#888', fontSize: fontSize.xs || 12, marginTop: 8 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  cancelBtn: { flex: 1, backgroundColor: '#333', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: '#fff', fontSize: fontSize.md || 16, fontWeight: fontWeight.medium || '500' },
  applyBtn: { flex: 1, backgroundColor: colors.primary || '#007AFF', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: fontSize.md || 16, fontWeight: fontWeight.semibold || '600' },
});
