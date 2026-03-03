import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { Colors, FontSize } from '../../constants/theme';

interface TypographyProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export const Heading = ({ children, style }: TypographyProps) => (
  <Text style={[styles.heading, style]}>{children}</Text>
);

export const Subheading = ({ children, style }: TypographyProps) => (
  <Text style={[styles.subheading, style]}>{children}</Text>
);

export const BodyText = ({ children, style }: TypographyProps) => (
  <Text style={[styles.body, style]}>{children}</Text>
);

export const Caption = ({ children, style }: TypographyProps) => (
  <Text style={[styles.caption, style]}>{children}</Text>
);

const styles = StyleSheet.create({
  heading: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  body: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  caption: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
});
