import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { colors, fontSize } from '../../constants/styles';

const ImageWithLoader = ({ uri, style, id }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const loadTimeoutRef = React.useRef(null);

  // Reset loading and error states when URI changes
  useEffect(() => {
    console.log('Called');
    setLoading(true);
    setError(false);

    // Set a fallback timeout in case onLoadEnd never fires (cached images)
    loadTimeoutRef.current = setTimeout(() => {
      console.log('Load timeout reached, setting loading to false for:', uri);
      setLoading(false);
    }, 3000);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [uri]);

  console.log("id", id, uri, 'error', error, 'loading', loading);

  const handleLoadEnd = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    setLoading(false);
    console.log('Image loaded successfully:', uri);
  };

  const handleError = (e) => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    setLoading(false);
    setError(true);
    console.log("REEOR", e, uri);
    console.log('Image load error:', uri, e.nativeEvent.error);
  };

  return (
    <View style={style}>
      {error ? (
        <View style={[style, styles.imageError]}>
          <Text style={styles.imageErrorText}>❌</Text>
        </View>
      ) : (
        <>
          <Image
            source={{ uri }}
            style={style}
            resizeMode="cover"
            onLoadStart={() => setLoading(true)}
            onLoadEnd={handleLoadEnd}
            onLoad={handleLoadEnd}
            onError={handleError}
          />
          {/* {loading && (
            <View style={[StyleSheet.absoluteFill, styles.imageLoader]}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )} */}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  imageLoader: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray100,
  },
  imageError: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray200,
  },
  imageErrorText: {
    fontSize: fontSize.xl,
  },
});

export default ImageWithLoader;
