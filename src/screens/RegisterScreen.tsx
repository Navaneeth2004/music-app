import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Screen } from '../components/layout/Screen';
import { Button, Input, Card, Heading, BodyText } from '../components/ui';
import { Colors, FontSize, Spacing } from '../constants/theme';

interface RegisterScreenProps {
  onRegister: (username: string, email: string, password: string) => Promise<void>;
  onGoToLogin: () => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onRegister,
  onGoToLogin,
  onBack,
  loading,
  error,
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = () => {
    setLocalError(null);
    if (!username.trim() || !email.trim() || !password || !confirmPassword) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    onRegister(username.trim(), email.trim(), password);
  };

  const displayError = localError || error;
  const isValid = username.trim() && email.trim() && password && confirmPassword;

  return (
    <Screen scrollable>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.icon}>♪</Text>
          <Heading style={styles.title}>Create account</Heading>
          <BodyText style={styles.subtitle}>Start your music theory journey</BodyText>
        </View>

        <Card>
          {displayError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}

          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Choose a username"
            autoCapitalize="none"
          />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 8 characters"
            secureTextEntry
          />

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat your password"
            secureTextEntry
          />

          <View style={styles.gap} />

          <Button
            label="Create Account"
            onPress={handleSubmit}
            loading={loading}
            disabled={!isValid}
          />
        </Card>

        <View style={styles.footer}>
          <BodyText>Already have an account? </BodyText>
          <Pressable onPress={onGoToLogin}>
            <Text style={styles.link}>Sign in</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  backBtn: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  backText: {
    color: Colors.accentLight,
    fontSize: FontSize.md,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  icon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: `${Colors.error}22`,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
  },
  gap: {
    height: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  link: {
    color: Colors.accentLight,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
