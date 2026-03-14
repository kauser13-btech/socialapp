import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../constants/styles';

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
  const getButtonStyle = () => {
    const styles = [buttonStyles.base];

    // Size
    if (size === 'small') styles.push(buttonStyles.small);
    else if (size === 'large') styles.push(buttonStyles.large);
    else styles.push(buttonStyles.medium);

    // Variant
    if (variant === 'primary') styles.push(buttonStyles.primary);
    else if (variant === 'secondary') styles.push(buttonStyles.secondary);
    else if (variant === 'outline') styles.push(buttonStyles.outline);
    else if (variant === 'ghost') styles.push(buttonStyles.ghost);
    else if (variant === 'danger') styles.push(buttonStyles.danger);

    // State
    if (disabled) styles.push(buttonStyles.disabled);

    return styles;
  };

  const getTextStyle = () => {
    const styles = [buttonStyles.text];

    if (size === 'small') styles.push(buttonStyles.textSmall);
    else if (size === 'large') styles.push(buttonStyles.textLarge);

    if (variant === 'primary') styles.push(buttonStyles.textPrimary);
    else if (variant === 'secondary') styles.push(buttonStyles.textSecondary);
    else if (variant === 'outline') styles.push(buttonStyles.textOutline);
    else if (variant === 'ghost') styles.push(buttonStyles.textGhost);
    else if (variant === 'danger') styles.push(buttonStyles.textDanger);

    if (disabled) styles.push(buttonStyles.textDisabled);

    return styles;
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
              : colors.background
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

  // Sizes
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

  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.gray200,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.error,
  },

  // States
  disabled: {
    opacity: 0.5,
  },

  // Text
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
  textPrimary: {
    color: colors.background,
  },
  textSecondary: {
    color: colors.textPrimary,
  },
  textOutline: {
    color: colors.primary,
  },
  textGhost: {
    color: colors.primary,
  },
  textDanger: {
    color: colors.background,
  },
  textDisabled: {
    color: colors.gray500,
  },
});

export default Button;
