import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { storiesAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

export default function CreateStoryScreen({ navigation, route }) {
  const { onCreated } = route.params || {};
  const { colors, isDark } = useTheme();

  const [image, setImage]     = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.85,
      maxWidth: 1080,
    });

    if (!result.didCancel && result.assets?.[0]) {
      setImage(result.assets[0]);
    }
  };

  const handlePost = async () => {
    if (!image) { Alert.alert('No image', 'Pick an image first.'); return; }

    setUploading(true);
    try {
      const res = await storiesAPI.create(image, caption.trim() || null);
      if (res.success) {
        // Build a group object matching the StoriesRow format so the
        // caller can prepend it immediately without a full reload.
        const story = res.data.story;
        const newGroup = {
          user:       story.user,
          is_own:     true,
          all_viewed: false,
          stories:    [story],
        };
        onCreated?.(newGroup);
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to post story.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>New Story</Text>
          <TouchableOpacity
            style={[styles.postBtn, { backgroundColor: image ? colors.primary : colors.border, opacity: uploading ? 0.6 : 1 }]}
            onPress={handlePost}
            disabled={!image || uploading}
          >
            {uploading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.postBtnText}>Post</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Image preview / picker */}
          <TouchableOpacity
            style={[styles.imagePicker, { backgroundColor: isDark ? colors.cardBackground : '#f1f5f9', borderColor: colors.border }]}
            onPress={pickImage}
            activeOpacity={0.8}
          >
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="cover" />
            ) : (
              <View style={styles.placeholder}>
                <Icon name="image-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>Tap to choose photo</Text>
              </View>
            )}
            {image && (
              <View style={styles.changeOverlay}>
                <Icon name="camera-outline" size={20} color="#fff" />
                <Text style={styles.changeText}>Change</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Caption */}
          <View style={[styles.captionBox, { backgroundColor: isDark ? colors.cardBackground : '#f8fafc', borderColor: colors.border }]}>
            <TextInput
              style={[styles.captionInput, { color: colors.textPrimary }]}
              placeholder="Add a caption… (optional)"
              placeholderTextColor={colors.textTertiary}
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={300}
            />
            <Text style={[styles.charCount, { color: colors.textTertiary }]}>{caption.length}/300</Text>
          </View>

          {/* Info note */}
          <View style={styles.note}>
            <Icon name="time-outline" size={14} color={colors.textTertiary} />
            <Text style={[styles.noteText, { color: colors.textTertiary }]}>
              Stories disappear after 24 hours
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 17, fontWeight: '700' },
  postBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  postBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  body: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40, gap: 16 },

  imagePicker: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  preview: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  placeholderText: { fontSize: 15 },
  changeOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  changeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  captionBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  captionInput: { fontSize: 15, lineHeight: 22, minHeight: 60 },
  charCount: { fontSize: 11, textAlign: 'right' },

  note: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  noteText: { fontSize: 12 },
});
