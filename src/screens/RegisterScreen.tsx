import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';

interface Props {
  onRegister: (username: string, password: string) => Promise<void>;
  onGoToLogin: () => void;
  loading: boolean;
  error: string | null;
}

export const RegisterScreen: React.FC<Props> = ({ onRegister, onGoToLogin, loading, error }) => {
  const [username, setUsername]               = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError]           = useState<string | null>(null);

  const displayError = localError || error;
  const canSubmit    = username.trim() && password.trim() && confirmPassword.trim();

  const handleSubmit = () => {
    setLocalError(null);
    if (!username.trim() || !password.trim()) return;
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    onRegister(username.trim(), password.trim());
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}>
        <Text style={s.icon}>♪</Text>
        <Text style={s.title}>Create Account</Text>
        <Text style={s.subtitle}>Choose a username and password</Text>

        <View style={s.card}>
          {displayError ? (
            <View style={s.errBox}>
              <Text style={s.errText}>{displayError}</Text>
            </View>
          ) : null}

          <Text style={s.label}>Username</Text>
          <TextInput
            style={s.input}
            value={username}
            onChangeText={t => { setUsername(t); setLocalError(null); }}
            placeholder="Choose a username"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={t => { setPassword(t); setLocalError(null); }}
            placeholder="Min. 8 characters"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            returnKeyType="next"
          />

          <Text style={s.label}>Confirm Password</Text>
          <TextInput
            style={s.input}
            value={confirmPassword}
            onChangeText={t => { setConfirmPassword(t); setLocalError(null); }}
            placeholder="Repeat your password"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            style={({ pressed }) => [s.btn, (!canSubmit || loading) && s.btnDisabled, pressed && { opacity: 0.8 }]}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.btnText}>Create Account</Text>
            }
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Already have an account? </Text>
          <Pressable onPress={onGoToLogin}>
            <Text style={s.link}>Sign in</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  center:      { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, gap: Spacing.xs },
  icon:        { fontSize: 48, textAlign: 'center', marginBottom: Spacing.xs },
  title:       { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', letterSpacing: -0.5 },
  subtitle:    { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
  card:        { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm },
  errBox:      { backgroundColor: Colors.error + '22', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.error, padding: Spacing.md },
  errText:     { color: Colors.error, fontSize: FontSize.sm },
  label:       { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 2 },
  input:       { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, padding: Spacing.md },
  btn:         { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xs },
  btnDisabled: { opacity: 0.45 },
  btnText:     { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  footer:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md },
  footerText:  { color: Colors.textSecondary, fontSize: FontSize.md },
  link:        { color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '600' },
});
