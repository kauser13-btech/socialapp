import { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Textarea } from '../../components/ui';
import VoiceInput from '../../components/voice/VoiceInput';
import { preferencesAPI, searchAPI } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';

export default function PreferenceCreateScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    location: '',
    latitude: null,
    longitude: null,
    rating: 0, // Default 0 to encourage user to set it
    price_range: '',
    tags: ''
  });
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // UI State
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPriceRangePicker, setShowPriceRangePicker] = useState(false);

  const priceRangeOptions = [
    { value: '$', label: '$ — Budget-friendly' },
    { value: '$$', label: '$$ — Moderate' },
    { value: '$$$', label: '$$$ — Splurge' },
    { value: '$$$$', label: '$$$$ — Luxury' },
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
      title:       data.title       || prev.title,
      description: data.description || prev.description,
      category_id: data.category_id || prev.category_id,
      rating:      data.rating      || prev.rating,
      location:    data.location    || prev.location,
      tags: data.tags && Array.isArray(data.tags) ? data.tags.join(', ') : prev.tags,
    }));
    setShowVoice(false);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId || c.id === Number.parseInt(categoryId, 10));
    return category ? category.name : 'Choose a category';
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
    setImages(prev => [...prev, { 
      id: `${Date.now()}_${Math.random()}`, 
      uri: asset.uri, 
      type: asset.type || 'image/jpeg', 
      fileName: asset.fileName || `photo_${Date.now()}.jpg`, 
      fileSize: asset.fileSize 
    }]);
  };

  const removeImage = (imageId) => setImages(prev => prev.filter(img => img.id !== imageId));

  const resolveLocationLabel = async (coords) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const json = await res.json();
      const addr = json.address || {};
      const label = addr.city || addr.town || addr.village || addr.county || addr.state || 'Unknown location';
      const country = addr.country_code ? addr.country_code.toUpperCase() : '';
      return country ? `${label}, ${country}` : label;
    } catch {
      return `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
    }
  };

  const detectLocation = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Denied', 'Location permission is required to detect your location.');
        return;
      }
    }
    setFormData(prev => ({ ...prev, location: 'Detecting…' }));
    const onSuccess = async ({ coords }) => {
      const label = await resolveLocationLabel(coords);
      setFormData(prev => ({
        ...prev,
        location: label,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }));
    };
    const onError = () => {
      setFormData(prev => ({ ...prev, location: '' }));
      Alert.alert('Location Error', 'Could not detect your location. Please enter it manually.');
    };
    const options = { enableHighAccuracy: false, timeout: 10000 };
    Geolocation.getCurrentPosition(onSuccess, onError, options);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.category_id) {
      Alert.alert('Missing Info', 'Please provide at least a title and category.');
      return;
    }

    setLoading(true);
    setUploadingImages(images.length > 0);
    try {
      const response = await preferencesAPI.create({
        ...formData,
        rating: formData.rating === 0 ? 5 : formData.rating // fallback if left 0
      });
      
      const preferenceId = response?.data?.preference?.id || response?.data?.id || response?.id;
      if (!preferenceId) throw new Error('Failed to get preference ID from response');
      
      if (images.length > 0) {
        for (const image of images) {
          try { await preferencesAPI.uploadImage(preferenceId, image); }
          catch (imageError) { console.error('Error uploading image:', imageError); }
        }
      }
      setUploadingImages(false);
      Alert.alert('Success!', 'Your preference has been shared.');
      navigation.goBack();
    } catch (error) {
      setUploadingImages(false);
      Alert.alert('Error', error.message || 'Failed to create preference');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView 
          style={styles.scroll} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Actions: Voice Input */}
          <View style={styles.topActions}>
            <TouchableOpacity 
              style={[
                styles.voiceToggle, 
                showVoice ? { backgroundColor: colors.primary + '15', borderColor: colors.primary } : { borderColor: colors.border }
              ]}
              onPress={() => setShowVoice(!showVoice)}
              activeOpacity={0.7}
            >
              <Icon 
                name={showVoice ? "mic" : "mic-outline"} 
                size={20} 
                color={showVoice ? colors.primary : colors.textPrimary} 
              />
              <Text style={[
                styles.voiceToggleText, 
                { color: showVoice ? colors.primary : colors.textPrimary }
              ]}>
                {showVoice ? 'Close Voice Input' : 'Dictate with AI'}
              </Text>
            </TouchableOpacity>
          </View>

          {showVoice && (
            <View style={styles.voiceContainer}>
              <VoiceInput onProcessed={handleVoiceProcessed} />
            </View>
          )}

          {/* Section: Basic Info */}
          <View style={styles.section}>
            <Input 
              label="What did you discover?" 
              placeholder="e.g., Best iced latte in Brooklyn" 
              value={formData.title} 
              onChangeText={(t) => setFormData({ ...formData, title: t })} 
            />
            <Textarea 
              label="Details" 
              placeholder="Why is it great? What should others know?" 
              value={formData.description} 
              onChangeText={(t) => setFormData({ ...formData, description: t })} 
            />
          </View>

          {/* Section: Categorization */}
          <View style={[styles.section, styles.groupedSection, { backgroundColor: isDark ? colors.cardBackground : '#f9fafb', borderColor: colors.border }]}>
            
            {/* Category */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
                Category <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TouchableOpacity 
                style={[styles.pickerButton, { borderColor: showCategoryPicker ? colors.primary : colors.border, backgroundColor: colors.background }]} 
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.pickerText, 
                  { color: formData.category_id ? colors.textPrimary : colors.textTertiary }
                ]}>
                  {getCategoryName(formData.category_id)}
                </Text>
                <Icon name={showCategoryPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              
              {showCategoryPicker && (
                <View style={[styles.pickerOptions, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  {categories.map((category, index) => {
                    const isSelected = formData.category_id === category.id;
                    const isLast = index === categories.length - 1;
                    return (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.pickerOption, 
                          !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                          isSelected && { backgroundColor: colors.primary + '10' }
                        ]}
                        onPress={() => { setFormData({ ...formData, category_id: category.id }); setShowCategoryPicker(false); }}
                      >
                        <Text style={[
                          styles.pickerOptionText, 
                          { color: isSelected ? colors.primary : colors.textPrimary },
                          isSelected && { fontWeight: '600' }
                        ]}>
                          {category.name}
                        </Text>
                        {isSelected && <Icon name="checkmark" size={18} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Price Range */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Price Range</Text>
              <TouchableOpacity 
                style={[styles.pickerButton, { borderColor: showPriceRangePicker ? colors.primary : colors.border, backgroundColor: colors.background }]} 
                onPress={() => setShowPriceRangePicker(!showPriceRangePicker)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.pickerText, 
                  { color: formData.price_range ? colors.textPrimary : colors.textTertiary }
                ]}>
                  {getPriceRangeLabel(formData.price_range)}
                </Text>
                <Icon name={showPriceRangePicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              
              {showPriceRangePicker && (
                <View style={[styles.pickerOptions, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  {priceRangeOptions.map((option, index) => {
                    const isSelected = formData.price_range === option.value;
                    const isLast = index === priceRangeOptions.length - 1;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.pickerOption, 
                          !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                          isSelected && { backgroundColor: colors.primary + '10' }
                        ]}
                        onPress={() => { setFormData({ ...formData, price_range: option.value }); setShowPriceRangePicker(false); }}
                      >
                        <Text style={[
                          styles.pickerOptionText, 
                          { color: isSelected ? colors.primary : colors.textPrimary },
                          isSelected && { fontWeight: '600' }
                        ]}>
                          {option.label}
                        </Text>
                        {isSelected && <Icon name="checkmark" size={18} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Location */}
            <View style={styles.locationRow}>
              <View style={styles.locationInput}>
                <Input
                  label="Location"
                  placeholder="e.g., Downtown, NYC"
                  value={formData.location}
                  onChangeText={(t) => setFormData({ ...formData, location: t })}
                />
              </View>
              <TouchableOpacity
                style={[styles.locateBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                onPress={detectLocation}
                activeOpacity={0.7}
              >
                <Icon name="navigate" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Input 
              label="Tags" 
              placeholder="cozy, wifi, outdoor (comma separated)" 
              value={formData.tags} 
              onChangeText={(t) => setFormData({ ...formData, tags: t })} 
            />
          </View>

          {/* Section: Rating */}
          <View style={styles.ratingSection}>
            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Your Rating</Text>
            <View style={styles.ratingStarsWrap}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = star <= formData.rating;
                return (
                  <TouchableOpacity 
                    key={star} 
                    onPress={() => setFormData(prev => ({ ...prev, rating: star }))} 
                    style={styles.starButton}
                    activeOpacity={0.7}
                  >
                    <Icon 
                      name={isActive ? 'star' : 'star-outline'} 
                      size={40} 
                      color={isActive ? '#FBBF24' : colors.textTertiary} 
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.ratingCaption, { color: colors.textSecondary }]}>
              {formData.rating === 0 ? 'Tap to rate' : `${formData.rating} out of 5 stars`}
            </Text>
          </View>

          {/* Section: Photos */}
          <View style={styles.imageSection}>
            <View style={styles.imageSectionHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary, marginBottom: 0 }]}>Photos</Text>
              <Text style={[styles.photoCount, { color: colors.textSecondary }]}>{images.length} / 5</Text>
            </View>
            
            <View style={styles.imageGrid}>
              {images.map((image) => (
                <View key={image.id} style={styles.imagePreviewContainer}>
                  <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(image.id)}>
                    <Icon name="close" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {images.length < 5 && (
                <TouchableOpacity 
                  style={[styles.addImageButton, { borderColor: colors.border, backgroundColor: isDark ? colors.cardBackground : '#f9fafb' }]} 
                  onPress={handleImagePicker}
                  activeOpacity={0.7}
                >
                  <Icon name="camera-outline" size={28} color={colors.textSecondary} style={{ marginBottom: 4 }} />
                  <Text style={[styles.addImageText, { color: colors.textSecondary }]}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {uploadingImages && (
              <View style={[styles.uploadingContainer, { backgroundColor: colors.primary + '10' }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.uploadingText, { color: colors.primary }]}>Uploading your photos...</Text>
              </View>
            )}
          </View>

        </ScrollView>
        
        {/* Sticky Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <Button 
            onPress={handleSubmit} 
            loading={loading} 
            disabled={!formData.title || !formData.category_id || loading}
            style={styles.submitButton}
          >
            Share Preference
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  scroll: { 
    flex: 1 
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  
  /* Top Actions */
  topActions: {
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  voiceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  voiceToggleText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  voiceContainer: {
    marginBottom: 24,
  },

  /* Sections */
  section: {
    marginBottom: 32,
  },
  groupedSection: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  sectionLabel: { 
    fontSize: 15, 
    fontWeight: '600', 
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  
  /* Location row */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  locationInput: {
    flex: 1,
  },
  locateBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  /* Fields & Pickers */
  fieldContainer: {
    marginBottom: 20
  },
  pickerButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    height: 52,
    borderWidth: 1, 
    borderRadius: 12,
  },
  pickerText: { 
    fontSize: 15,
    fontWeight: '500', 
  },
  pickerOptions: { 
    marginTop: 8, 
    borderWidth: 1, 
    borderRadius: 12, 
    overflow: 'hidden',
  },
  pickerOption: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16, 
    paddingVertical: 14, 
  },
  pickerOptionText: { 
    fontSize: 15 
  },

  /* Rating */
  ratingSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  ratingStarsWrap: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  starButton: { 
    marginHorizontal: 8,
  },
  ratingCaption: {
    fontSize: 14,
    fontWeight: '500',
  },

  /* Media */
  imageSection: { 
    marginBottom: 16,
  },
  imageSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  photoCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  imageGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12, 
  },
  imagePreviewContainer: { 
    width: '30%', 
    aspectRatio: 1, 
    borderRadius: 12, 
    overflow: 'hidden',
    position: 'relative'
  },
  imagePreview: { 
    width: '100%', 
    height: '100%' 
  },
  removeImageButton: { 
    position: 'absolute', 
    top: 6, 
    right: 6, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    borderRadius: 12, 
    width: 24, 
    height: 24, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  addImageButton: { 
    width: '30%', 
    aspectRatio: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderStyle: 'dashed', 
    borderRadius: 12, 
  },
  addImageText: { 
    fontSize: 13, 
    fontWeight: '500',
    marginTop: 4,
  },
  
  /* Uploading */
  uploadingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 16, 
    padding: 16, 
    borderRadius: 12,
  },
  uploadingText: { 
    marginLeft: 10, 
    fontSize: 14, 
    fontWeight: '600' 
  },

  /* Footer */
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitButton: {
    height: 52,
    borderRadius: 12,
  }
});
