import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';

interface Props {
  onLogin:        (username: string, password: string) => Promise<void>;
  onGoToRegister: () => void;
  loading:        boolean;
  error:          string | null;
}

export const LoginScreen: React.FC<Props> = ({ onLogin, onGoToRegister, loading, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = username.trim().length > 0 && password.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit || loading) return;
    onLogin(username.trim(), password.trim());
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}>
        <Text style={s.icon}>♪</Text>
        <Text style={s.title}>Study Practice</Text>
        <Text style={s.subtitle}>Sign in to continue</Text>

        <View style={s.card}>
          {error ? (
            <View style={s.errBox}>
              <Text style={s.errText}>{error}</Text>
            </View>
          ) : null}

          <Text style={s.label}>Username</Text>
          <TextInput
            style={s.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
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
              : <Text style={s.btnText}>Sign In</Text>
            }
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Don't have an account? </Text>
          <Pressable onPress={onGoToRegister}>
            <Text style={s.link}>Create one</Text>
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
