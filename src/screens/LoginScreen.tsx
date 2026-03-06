import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Screen } from '../components/layout/Screen';
import { Button, Input, Card, Heading, BodyText } from '../components/ui';
import { Colors, FontSize, Spacing } from '../constants/theme';

interface LoginScreenProps {
  onLogin: (identity: string, password: string) => Promise<void>;
  onGoToRegister: () => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin, onGoToRegister, onBack, loading, error,
}) => {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (!identity.trim() || !password.trim()) return;
    onLogin(identity.trim(), password.trim());
  };

  return (
    <Screen scrollable>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.icon}>♪</Text>
          <Heading style={styles.title}>Welcome back</Heading>
          <BodyText style={styles.subtitle}>Sign in to continue your practice</BodyText>
        </View>

        <Card>
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Input
            label="Username or Email"
            value={identity}
            onChangeText={setIdentity}
            placeholder="Enter your username or email"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
          />

          <View style={styles.gap} />

          <Button
            label="Sign In"
            onPress={handleSubmit}
            loading={loading}
            disabled={!identity.trim() || !password.trim()}
          />
        </Card>

        <View style={styles.footer}>
          <BodyText>Don't have an account? </BodyText>
          <Pressable onPress={onGoToRegister}>
            <Text style={styles.link}>Create one</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  backBtn: { paddingTop: Spacing.lg, paddingBottom: Spacing.md, paddingHorizontal: Spacing.xs },
  backText: { color: Colors.accentLight, fontSize: FontSize.md },
  container: { flex: 1, justifyContent: 'center', gap: Spacing.lg },
  header: { alignItems: 'center', marginBottom: Spacing.sm },
  icon: { fontSize: 40, marginBottom: Spacing.sm },
  title: { marginBottom: Spacing.xs },
  subtitle: { textAlign: 'center' },
  errorBanner: { backgroundColor: `${Colors.error}22`, borderRadius: 8, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.error },
  errorText: { color: Colors.error, fontSize: FontSize.sm },
  gap: { height: Spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  link: { color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '600' },
});