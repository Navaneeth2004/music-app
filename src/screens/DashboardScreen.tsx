import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen } from '../components/layout/Screen';
import { Button, Card, Heading, BodyText, Caption } from '../components/ui';
import { Colors, FontSize, Spacing } from '../constants/theme';
import { User } from '../types';

interface DashboardScreenProps {
  user: User;
  onLogout: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ user, onLogout }) => {
  return (
    <Screen scrollable>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Caption>Welcome back,</Caption>
          <Heading>{user.username}</Heading>
        </View>
        <Button
          label="Logout"
          onPress={onLogout}
          variant="ghost"
          fullWidth={false}
          style={styles.logoutBtn}
        />
      </View>

      {/* Placeholder content */}
      <Card style={styles.card}>
        <Text style={styles.cardIcon}>🎵</Text>
        <Heading style={styles.cardTitle}>Ready to practice?</Heading>
        <BodyText>Your lessons and progress will appear here as you build them out.</BodyText>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardIcon}>📊</Text>
        <Heading style={styles.cardTitle}>Your Progress</Heading>
        <BodyText>Track your scores across intervals, chords, scales, and more.</BodyText>
      </Card>
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoutBtn: {
    paddingHorizontal: Spacing.sm,
    minHeight: 36,
  },
  card: {
    marginBottom: Spacing.md,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    marginBottom: Spacing.xs,
  },
});
