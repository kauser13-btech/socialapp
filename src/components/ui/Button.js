import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight } from '../../constants/styles';

const Button = ({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  ...props
}) => {
  const { colors } = useTheme();

  const getButtonStyle = () => {
    const s = [buttonStyles.base];

    if (size === 'small') s.push(buttonStyles.small);
    else if (size === 'large') s.push(buttonStyles.large);
    else s.push(buttonStyles.medium);

    if (variant === 'primary') s.push({ backgroundColor: colors.primary });
    else if (variant === 'secondary') s.push({ backgroundColor: colors.gray200 });
    else if (variant === 'outline') s.push({ backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary });
    else if (variant === 'ghost') s.push({ backgroundColor: 'transparent' });
    else if (variant === 'danger') s.push({ backgroundColor: colors.error });

    if (disabled) s.push(buttonStyles.disabled);

    return s;
  };

  const getTextStyle = () => {
    const s = [buttonStyles.text];

    if (size === 'small') s.push(buttonStyles.textSmall);
    else if (size === 'large') s.push(buttonStyles.textLarge);

    if (variant === 'primary') s.push({ color: '#ffffff' });
    else if (variant === 'secondary') s.push({ color: colors.textPrimary });
    else if (variant === 'outline') s.push({ color: colors.primary });
    else if (variant === 'ghost') s.push({ color: colors.primary });
    else if (variant === 'danger') s.push({ color: '#ffffff' });

    if (disabled) s.push({ color: colors.gray500 });

    return s;
  };

  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'outline' || variant === 'ghost'
              ? colors.primary
              : '#ffffff'
          }
        />
      ) : (
        <Text style={[...getTextStyle(), textStyle]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
};

const buttonStyles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  small: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  medium: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  large: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  textSmall: {
    fontSize: fontSize.sm,
  },
  textLarge: {
    fontSize: fontSize.lg,
  },
});

export default Button;
