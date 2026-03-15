import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, borderRadius, shadows } from '../../constants/styles';

const Card = ({
  children,
  style,
  onPress,
  noPadding = false,
  shadow = 'md',
  ...props
}) => {
  const { colors } = useTheme();
  const Container = onPress ? TouchableOpacity : View;

  const cardStyle = [
    styles.base,
    { backgroundColor: colors.cardBackground, borderColor: colors.border },
    !noPadding && styles.padding,
    shadow === 'sm' && shadows.sm,
    shadow === 'md' && shadows.md,
    shadow === 'lg' && shadows.lg,
    style,
  ];

  return (
    <Container
      style={cardStyle}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      {...props}
    >
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  padding: {
    padding: spacing.md,
  },
});

export default Card;
