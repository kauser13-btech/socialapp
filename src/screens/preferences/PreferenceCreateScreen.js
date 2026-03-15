import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Textarea, Card } from '../../components/ui';
import VoiceInput from '../../components/voice/VoiceInput';
import { preferencesAPI, searchAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../../constants/styles';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';

export default function PreferenceCreateScreen({ navigation }) {
  const { colors } = useTheme();
  const [formData, setFormData] = useState({ title: '', description: '', category_id: '', location: '', rating: 5, price_range: '', tags: '' });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPriceRangePicker, setShowPriceRangePicker] = useState(false);

  const priceRangeOptions = [
    { value: '$', label: '$ - Budget' },
    { value: '$$', label: '$$ - Moderate' },
    { value: '$$$', label: '$$$ - Expensive' },
    { value: '$$$$', label: '$$$$ - Luxury' },
  ];

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      const response = await searchAPI.getCategories();
      if (response.success) setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleVoiceProcessed = (data) => {
    setFormData(prev => ({
      ...prev,
      title: data.title || prev.title,
      description: data.description || prev.description,
      category_id: data.category_id || prev.category_id,
      rating: data.rating || prev.rating,
      tags: data.tags && Array.isArray(data.tags) ? data.tags.join(', ') : prev.tags,
    }));
    setShowVoice(false);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId || c.id === Number.parseInt(categoryId, 10));
    return category ? category.name : 'Select a category';
  };

  const getPriceRangeLabel = (value) => {
    const option = priceRangeOptions.find(o => o.value === value);
    return option ? option.label : 'Select price range';
  };

  const handleImagePicker = () => {
    Alert.alert('Add Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Library', onPress: handleChooseFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleTakePhoto = () => {
    launchCamera({ mediaType: 'photo', cameraType: 'back', quality: 0.8, maxWidth: 1200, maxHeight: 1200 }, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) { Alert.alert('Error', response.errorCode === 'permission' ? 'Camera permission denied.' : 'Failed to take photo'); return; }
      if (response.assets?.[0]) addImage(response.assets[0]);
    });
  };

  const handleChooseFromLibrary = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8, maxWidth: 1200, maxHeight: 1200, selectionLimit: 5 - images.length }, (response) => {
      if (response.didCancel) return;
      if (response.errorCode) { Alert.alert('Error', response.errorCode === 'permission' ? 'Photo library permission denied.' : 'Failed to pick image'); return; }
      if (response.assets) response.assets.forEach(addImage);
    });
  };

  const addImage = (asset) => {
    if (images.length >= 5) { Alert.alert('Limit Reached', 'You can add up to 5 images only'); return; }
    setImages(prev => [...prev, { id: `${Date.now()}_${Math.random()}`, uri: asset.uri, type: asset.type || 'image/jpeg', fileName: asset.fileName || `photo_${Date.now()}.jpg`, fileSize: asset.fileSize }]);
  };

  const removeImage = (imageId) => setImages(prev => prev.filter(img => img.id !== imageId));

  const handleSubmit = async () => {
    setLoading(true);
    setUploadingImages(images.length > 0);
    try {
      const response = await preferencesAPI.create(formData);
      const preferenceId = response?.data?.preference?.id || response?.data?.id || response?.id;
      if (!preferenceId) throw new Error('Failed to get preference ID from response');
      if (images.length > 0) {
        for (const image of images) {
          try { await preferencesAPI.uploadImage(preferenceId, image); }
          catch (imageError) { console.error('Error uploading image:', imageError); }
        }
      }
      setUploadingImages(false);
      Alert.alert('Success', 'Preference created successfully!');
      navigation.goBack();
    } catch (error) {
      setUploadingImages(false);
      Alert.alert('Error', error.message || 'Failed to create preference');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scroll}>
        <Card style={styles.card}>
          <Button onPress={() => setShowVoice(!showVoice)} variant="outline">
            {showVoice ? 'Hide Voice Input' : 'Use Voice Input'}
          </Button>

          {showVoice && <VoiceInput onProcessed={handleVoiceProcessed} />}

          <Input label="Title" placeholder="What's your preference?" value={formData.title} onChangeText={(t) => setFormData({ ...formData, title: t })} />
          <Textarea label="Description" placeholder="Tell us more about it..." value={formData.description} onChangeText={(t) => setFormData({ ...formData, description: t })} />
          <Input label="Location" placeholder="Where is it? (e.g., Downtown, NYC)" value={formData.location} onChangeText={(t) => setFormData({ ...formData, location: t })} />

          {/* Category Selector */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Category <Text style={{ color: colors.error }}>*</Text></Text>
            <TouchableOpacity style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: colors.inputBackground }]} onPress={() => setShowCategoryPicker(!showCategoryPicker)}>
              <Text style={[formData.category_id ? styles.pickerText : styles.pickerPlaceholder, { color: formData.category_id ? colors.textPrimary : colors.textSecondary }]}>
                {getCategoryName(formData.category_id)}
              </Text>
              <Icon name={showCategoryPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {showCategoryPicker && (
              <View style={[styles.pickerOptions, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.pickerOption, { borderBottomColor: colors.border }, formData.category_id === category.id && { backgroundColor: colors.primary + '20' }]}
                    onPress={() => { setFormData({ ...formData, category_id: category.id }); setShowCategoryPicker(false); }}
                  >
                    <Text style={[styles.pickerOptionText, { color: formData.category_id === category.id ? colors.primary : colors.textPrimary }, formData.category_id === category.id && { fontWeight: fontWeight.semibold }]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Rating Selector */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Rating</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setFormData(prev => ({ ...prev, rating: star }))} style={styles.starButton}>
                  <Icon name={star <= formData.rating ? 'star' : 'star-outline'} size={32} color={star <= formData.rating ? '#FBBF24' : colors.gray300} />
                </TouchableOpacity>
              ))}
              <Text style={[styles.ratingText, { color: colors.textSecondary }]}>{formData.rating}/5</Text>
            </View>
          </View>

          {/* Price Range Selector */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Price Range</Text>
            <TouchableOpacity style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: colors.inputBackground }]} onPress={() => setShowPriceRangePicker(!showPriceRangePicker)}>
              <Text style={[formData.price_range ? styles.pickerText : styles.pickerPlaceholder, { color: formData.price_range ? colors.textPrimary : colors.textSecondary }]}>
                {getPriceRangeLabel(formData.price_range)}
              </Text>
              <Icon name={showPriceRangePicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {showPriceRangePicker && (
              <View style={[styles.pickerOptions, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
                {priceRangeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.pickerOption, { borderBottomColor: colors.border }, formData.price_range === option.value && { backgroundColor: colors.primary + '20' }]}
                    onPress={() => { setFormData({ ...formData, price_range: option.value }); setShowPriceRangePicker(false); }}
                  >
                    <Text style={[styles.pickerOptionText, { color: formData.price_range === option.value ? colors.primary : colors.textPrimary }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Input label="Tags" placeholder="e.g., cozy, wifi, outdoor seating (comma separated)" value={formData.tags} onChangeText={(t) => setFormData({ ...formData, tags: t })} />

          {/* Image Section */}
          <View style={styles.imageSection}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Photos ({images.length}/5)</Text>
            {images.length > 0 && (
              <View style={styles.imageGrid}>
                {images.map((image) => (
                  <View key={image.id} style={styles.imagePreviewContainer}>
                    <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(image.id)}>
                      <Text style={styles.removeImageText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            {images.length < 5 && (
              <TouchableOpacity style={[styles.addImageButton, { borderColor: colors.border, backgroundColor: colors.gray50 }]} onPress={handleImagePicker}>
                <Text style={styles.addImageIcon}>📷</Text>
                <Text style={[styles.addImageText, { color: colors.textSecondary }]}>Add Photo</Text>
              </TouchableOpacity>
            )}
            {uploadingImages && (
              <View style={[styles.uploadingContainer, { backgroundColor: colors.primary + '20' }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.uploadingText, { color: colors.primary }]}>Uploading images...</Text>
              </View>
            )}
          </View>

          <Button onPress={handleSubmit} loading={loading} disabled={!formData.title}>
            Share Preference
          </Button>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  card: { margin: spacing.md },
  fieldContainer: { marginBottom: spacing.md },
  sectionLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginBottom: spacing.sm },
  pickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderWidth: 1, borderRadius: borderRadius.md },
  pickerText: { fontSize: fontSize.md },
  pickerPlaceholder: { fontSize: fontSize.md },
  pickerOptions: { marginTop: spacing.xs, borderWidth: 1, borderRadius: borderRadius.md, maxHeight: 200 },
  pickerOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  pickerOptionText: { fontSize: fontSize.md },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  starButton: { marginRight: spacing.xs },
  ratingText: { marginLeft: spacing.sm, fontSize: fontSize.md },
  imageSection: { marginVertical: spacing.md },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md, gap: spacing.sm },
  imagePreviewContainer: { position: 'relative', width: 100, height: 100, borderRadius: borderRadius.md, overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%', borderRadius: borderRadius.md },
  removeImageButton: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: borderRadius.full, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  removeImageText: { color: '#ffffff', fontSize: fontSize.md, fontWeight: fontWeight.bold },
  addImageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderRadius: borderRadius.md, paddingVertical: spacing.lg, paddingHorizontal: spacing.md },
  addImageIcon: { fontSize: fontSize.xl, marginRight: spacing.sm },
  addImageText: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
  uploadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, padding: spacing.md, borderRadius: borderRadius.md },
  uploadingText: { marginLeft: spacing.sm, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
});
