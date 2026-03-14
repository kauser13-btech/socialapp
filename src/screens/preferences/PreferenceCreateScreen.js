import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Textarea, Card } from '../../components/ui';
import VoiceInput from '../../components/voice/VoiceInput';
import { preferencesAPI, searchAPI } from '../../lib/api';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/styles';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';

export default function PreferenceCreateScreen({ navigation }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    location: '',
    rating: 5,
    price_range: '',
    tags: '',
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showPriceRangePicker, setShowPriceRangePicker] = useState(false);

  const priceRangeOptions = [
    { value: '', label: 'Select price range' },
    { value: '$', label: '$ - Budget' },
    { value: '$$', label: '$$ - Moderate' },
    { value: '$$$', label: '$$$ - Expensive' },
    { value: '$$$$', label: '$$$$ - Luxury' },
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await searchAPI.getCategories();
      if (response.success) {
        setCategories(response.data.categories || []);
      }
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
    }));
    // Convert tags array to comma-separated string if present
    if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
      setFormData(prev => ({
        ...prev,
        tags: data.tags.join(', '),
      }));
    }
    setShowVoice(false);
  };

  const handleRatingPress = (star) => {
    setFormData(prev => ({ ...prev, rating: star }));
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
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: handleTakePhoto,
        },
        {
          text: 'Choose from Library',
          onPress: handleChooseFromLibrary,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleTakePhoto = () => {
    try {
      launchCamera(
        {
          mediaType: 'photo',
          cameraType: 'back',
          quality: 0.8,
          maxWidth: 1200,
          maxHeight: 1200,
          includeBase64: false,
          saveToPhotos: false,
        },
        (response) => {
          console.log('Camera response:', response);

          if (response.didCancel) {
            console.log('User cancelled camera');
          } else if (response.errorCode) {
            console.error('Camera error:', response.errorCode, response.errorMessage);

            let errorMessage = 'Failed to take photo';
            if (response.errorCode === 'camera_unavailable') {
              errorMessage = 'Camera is not available on this device';
            } else if (response.errorCode === 'permission') {
              errorMessage = 'Camera permission denied. Please enable camera access in settings.';
            }

            Alert.alert('Error', errorMessage);
          } else if (response.assets && response.assets[0]) {
            console.log('Photo captured successfully');
            addImage(response.assets[0]);
          }
        }
      );
    } catch (error) {
      console.error('Error launching camera:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  const handleChooseFromLibrary = () => {
    try {
      launchImageLibrary(
        {
          mediaType: 'photo',
          quality: 0.8,
          maxWidth: 1200,
          maxHeight: 1200,
          selectionLimit: 5 - images.length, // Allow up to 5 images total
          includeBase64: false,
        },
        (response) => {
          console.log('Image library response:', response);

          if (response.didCancel) {
            console.log('User cancelled image picker');
          } else if (response.errorCode) {
            console.error('Image picker error:', response.errorCode, response.errorMessage);

            let errorMessage = 'Failed to pick image';
            if (response.errorCode === 'permission') {
              errorMessage = 'Photo library permission denied. Please enable photo access in settings.';
            }

            Alert.alert('Error', errorMessage);
          } else if (response.assets) {
            console.log(`Selected ${response.assets.length} image(s)`);
            response.assets.forEach((asset) => addImage(asset));
          }
        }
      );
    } catch (error) {
      console.error('Error launching image library:', error);
      Alert.alert('Error', 'Failed to open photo library. Please try again.');
    }
  };

  const addImage = (asset) => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can add up to 5 images only');
      return;
    }

    const newImage = {
      id: `${Date.now()}_${Math.random()}`, // Unique ID for key
      uri: asset.uri,
      type: asset.type || 'image/jpeg',
      fileName: asset.fileName || `photo_${Date.now()}.jpg`,
      fileSize: asset.fileSize,
    };

    setImages((prev) => [...prev, newImage]);
  };

  const removeImage = (imageId) => {
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setUploadingImages(images.length > 0);

    try {
      // First, create the preference without images
      const response = await preferencesAPI.create(formData);
      console.log('Create preference response:', response);

      // Backend returns: { success: true, data: { preference: {...} } }
      const preferenceId = response?.data?.preference?.id || response?.data?.id || response?.id;

      if (!preferenceId) {
        console.error('No preference ID in response:', response);
        throw new Error('Failed to get preference ID from response');
      }

      console.log('Preference created with ID:', preferenceId);

      // Then upload images if any
      if (images.length > 0) {
        let successCount = 0;
        let failCount = 0;

        for (const image of images) {
          try {
            console.log('Uploading image to preference:', preferenceId);
            await preferencesAPI.uploadImage(preferenceId, image);
            successCount++;
          } catch (imageError) {
            console.error('Error uploading image:', imageError);
            failCount++;
            // Continue with other images even if one fails
          }
        }

        console.log(`Images uploaded: ${successCount} succeeded, ${failCount} failed`);
      }

      setUploadingImages(false);
      Alert.alert('Success', 'Preference created successfully!');
      navigation.goBack();
    } catch (error) {
      setUploadingImages(false);
      console.error('Submit error:', error);
      Alert.alert('Error', error.message || 'Failed to create preference');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll}>
        <Card style={styles.card}>
          <Button onPress={() => setShowVoice(!showVoice)} variant="outline">
            {showVoice ? 'Hide Voice Input' : 'Use Voice Input'}
          </Button>

          {showVoice && <VoiceInput onProcessed={handleVoiceProcessed} />}

          <Input
            label="Title"
            placeholder="What's your preference?"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
          />

          <Textarea
            label="Description"
            placeholder="Tell us more about it..."
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
          />

          <Input
            label="Location"
            placeholder="Where is it? (e.g., Downtown, NYC)"
            value={formData.location}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
          />

          {/* Category Selector */}
          <View style={styles.fieldContainer}>
            <Text style={styles.sectionLabel}>Category <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text style={formData.category_id ? styles.pickerText : styles.pickerPlaceholder}>
                {getCategoryName(formData.category_id)}
              </Text>
              <Icon name={showCategoryPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {showCategoryPicker && (
              <View style={styles.pickerOptions}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.pickerOption,
                      formData.category_id === category.id && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, category_id: category.id });
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.category_id === category.id && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Rating Selector */}
          <View style={styles.fieldContainer}>
            <Text style={styles.sectionLabel}>Rating</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleRatingPress(star)}
                  style={styles.starButton}
                >
                  <Icon
                    name={star <= formData.rating ? 'star' : 'star-outline'}
                    size={32}
                    color={star <= formData.rating ? '#FBBF24' : colors.gray300}
                  />
                </TouchableOpacity>
              ))}
              <Text style={styles.ratingText}>{formData.rating}/5</Text>
            </View>
          </View>

          {/* Price Range Selector */}
          <View style={styles.fieldContainer}>
            <Text style={styles.sectionLabel}>Price Range</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowPriceRangePicker(!showPriceRangePicker)}
            >
              <Text style={formData.price_range ? styles.pickerText : styles.pickerPlaceholder}>
                {getPriceRangeLabel(formData.price_range)}
              </Text>
              <Icon name={showPriceRangePicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {showPriceRangePicker && (
              <View style={styles.pickerOptions}>
                {priceRangeOptions.slice(1).map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.pickerOption,
                      formData.price_range === option.value && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, price_range: option.value });
                      setShowPriceRangePicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.price_range === option.value && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Tags Input */}
          <Input
            label="Tags"
            placeholder="e.g., cozy, wifi, outdoor seating (comma separated)"
            value={formData.tags}
            onChangeText={(text) => setFormData({ ...formData, tags: text })}
          />

          {/* Image Section */}
          <View style={styles.imageSection}>
            <Text style={styles.sectionLabel}>Photos ({images.length}/5)</Text>

            {/* Image Preview Grid */}
            {images.length > 0 && (
              <View style={styles.imageGrid}>
                {images.map((image) => (
                  <View key={image.id} style={styles.imagePreviewContainer}>
                    <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(image.id)}
                    >
                      <Text style={styles.removeImageText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add Image Button */}
            {images.length < 5 && (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={handleImagePicker}
              >
                <Text style={styles.addImageIcon}>📷</Text>
                <Text style={styles.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            )}

            {uploadingImages && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.uploadingText}>Uploading images...</Text>
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
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  card: { margin: spacing.md },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.error || '#EF4444',
  },
  // Picker styles
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
  },
  pickerText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  pickerPlaceholder: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  pickerOptions: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    maxHeight: 200,
  },
  pickerOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerOptionSelected: {
    backgroundColor: colors.primaryLight || '#EBF5FF',
  },
  pickerOptionText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  pickerOptionTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  // Rating styles
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    marginRight: spacing.xs,
  },
  ratingText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  // Image styles
  imageSection: {
    marginVertical: spacing.md,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: borderRadius.full,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray50,
  },
  addImageIcon: {
    fontSize: fontSize.xl,
    marginRight: spacing.sm,
  },
  addImageText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
  },
  uploadingText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
});
