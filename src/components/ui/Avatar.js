import React, { useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, fontSize, fontWeight } from '../../constants/styles';

const Avatar = ({ user, size = 'medium', style, isOnline }) => {
  const [imageError, setImageError] = useState(false);

  const getSize = () => {
    switch (size) {
      case 'small':
        return 32;
      case 'large':
        return 64;
      case 'xlarge':
        return 96;
      default:
        return 48;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return fontSize.sm;
      case 'large':
        return fontSize.xl;
      case 'xlarge':
        return fontSize.xxxl;
      default:
        return fontSize.md;
    }
  };

  const getInitials = () => {
    if (!user || !user.name) return '?';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  const avatarSize = getSize();
  const avatarUrl = user?.avatar_url || user?.avatar;
  const dotSize = Math.max(10, Math.round(avatarSize * 0.28));

  const imageContent = avatarUrl && !imageError ? (
    <Image
      source={{ uri: avatarUrl }}
      style={[
        styles.image,
        { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
      ]}
      onError={(e) => {
        console.log('Avatar load error:', avatarUrl, e.nativeEvent.error);
        setImageError(true);
      }}
      onLoad={() => {
        console.log('Avatar loaded successfully:', avatarUrl);
      }}
    />
  ) : (
    <View
      style={[
        styles.placeholder,
        { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
      ]}
    >
      <Text style={[styles.initials, { fontSize: getFontSize() }]}>
        {getInitials()}
      </Text>
    </View>
  );

  if (!isOnline) {
    return <View style={style}>{imageContent}</View>;
  }

  return (
    <View style={[{ width: avatarSize, height: avatarSize }, style]}>
      {imageContent}
      <View
        style={[
          styles.onlineDot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            bottom: 0,
            right: 0,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.gray200,
  },
  placeholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.background,
    fontWeight: fontWeight.semibold,
  },
  onlineDot: {
    position: 'absolute',
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default Avatar;
