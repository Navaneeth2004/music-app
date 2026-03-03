import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Screen } from '../components/layout/Screen';
import { Button } from '../components/ui';
import { Colors, FontSize, Spacing } from '../constants/theme';

interface HomeScreenProps {
  onLogin: () => void;
  onRegister: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onLogin, onRegister }) => {
  return (
    <Screen>
      <View style={styles.container}>

        {/* Logo / Branding */}
        <View style={styles.heroSection}>
          <View style={styles.logoMark}>
            <Text style={styles.logoIcon}>♪</Text>
          </View>
          <Text style={styles.appName}>Notewise</Text>
          <Text style={styles.tagline}>Master music theory,{'\n'}one note at a time.</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresRow}>
          {['Intervals', 'Chords', 'Scales', 'Rhythm'].map(f => (
            <View key={f} style={styles.featurePill}>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Auth Buttons */}
        <View style={styles.authSection}>
          <Button label="Get Started" onPress={onRegister} variant="primary" />
          <View style={styles.gap} />
          <Button label="I have an account" onPress={onLogin} variant="ghost" />
        </View>

      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoMark: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    // Use boxShadow for web, shadow* for native
    ...Platform.select({
      web: {
        boxShadow: `0px 8px 20px ${Colors.accent}88`,
      },
      default: {
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  logoIcon: {
    fontSize: 44,
    color: Colors.textPrimary,
  },
  appName: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -1,
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  featurePill: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  featureText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  authSection: {
    paddingBottom: Spacing.md,
  },
  gap: {
    height: Spacing.sm,
  },
});
