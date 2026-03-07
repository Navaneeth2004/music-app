import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';
import { User } from '../types';
import { BackupScreen } from './BackupScreen';
import { useAuth } from '../context/AuthContext';

interface Props {
  user:     User;
  onLogout: () => void;
  isAdmin?: boolean;
}

export const SettingsScreen: React.FC<Props> = ({ user, onLogout, isAdmin }) => {
  const { unlockAdmin, lockAdmin } = useAuth();
  const [showBackup,    setShowBackup]    = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [password,      setPassword]      = useState('');
  const [unlocking,     setUnlocking]     = useState(false);
  const [unlockError,   setUnlockError]   = useState('');

  if (showBackup) return <BackupScreen onBack={() => setShowBackup(false)} />;

  const openAdminModal = () => {
    setPassword(''); setUnlockError(''); setShowAdminModal(true);
  };

  const handleUnlock = async () => {
    if (!password) return;
    setUnlocking(true); setUnlockError('');
    const ok = await unlockAdmin(password);
    setUnlocking(false);
    if (ok) {
      setShowAdminModal(false); setPassword('');
    } else {
      setUnlockError('Incorrect password. Try again.');
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Settings</Text>

        {/* Profile */}
        <View style={s.profileSection}>
          <View style={[s.avatar, isAdmin && s.avatarAdmin]}>
            <Text style={s.avatarText}>{user.username[0].toUpperCase()}</Text>
          </View>
          <View style={s.nameRow}>
            <Text style={s.profileName}>{user.username}</Text>
            {isAdmin && (
              <View style={s.adminBadge}>
                <Text style={s.adminBadgeText}>ADMIN</Text>
              </View>
            )}
          </View>
        </View>

        {/* Account */}
        <Text style={s.sectionLabel}>ACCOUNT</Text>
        <View style={s.card}>
          <Row icon="👤" label="Username" value={user.username} />
        </View>

        {/* App */}
        <Text style={s.sectionLabel}>APP</Text>
        <View style={s.card}>
          <Row icon="ℹ️" label="Version" value="1.0.0" />
          {isAdmin && <><Div /><Row icon="🛠️" label="Mode" value="Admin" /></>}
          <Div />
          <Pressable onPress={() => setShowBackup(true)} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
            <Text style={s.rowIcon}>💾</Text>
            <Text style={s.rowLabel}>Backup & Restore</Text>
            <Text style={s.chevron}>›</Text>
          </Pressable>
        </View>

        {/* Admin switch */}
        <Text style={s.sectionLabel}>ACCESS</Text>
        <View style={s.card}>
          {isAdmin ? (
            <Pressable onPress={lockAdmin} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
              <Text style={s.rowIcon}>🔓</Text>
              <Text style={s.rowLabel}>Switch to Student Mode</Text>
              <Text style={s.chevron}>›</Text>
            </Pressable>
          ) : (
            <Pressable onPress={openAdminModal} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
              <Text style={s.rowIcon}>🔐</Text>
              <Text style={s.rowLabel}>Switch to Admin Mode</Text>
              <Text style={s.chevron}>›</Text>
            </Pressable>
          )}
        </View>

        <Pressable onPress={onLogout} style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.7 }]}>
          <Text style={s.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>

      {/* Admin password modal */}
      <Modal visible={showAdminModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Admin Access</Text>
            <Text style={s.modalSub}>Enter your password to switch to admin mode.</Text>
            {unlockError ? <Text style={s.errText}>{unlockError}</Text> : null}
            <TextInput
              style={s.passInput}
              value={password}
              onChangeText={t => { setPassword(t); setUnlockError(''); }}
              placeholder="Your password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleUnlock}
            />
            <View style={s.modalActions}>
              <Pressable onPress={() => { setShowAdminModal(false); setPassword(''); setUnlockError(''); }} style={s.modalCancel}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleUnlock} disabled={!password || unlocking}
                style={[s.modalConfirm, (!password || unlocking) && { opacity: 0.4 }]}>
                {unlocking
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalConfirmText}>Unlock</Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const Row = ({ icon, label, value }: { icon: string; label: string; value?: string }) => (
  <View style={s.row}>
    <Text style={s.rowIcon}>{icon}</Text>
    <Text style={s.rowLabel}>{label}</Text>
    {value && <Text style={s.rowValue}>{value}</Text>}
  </View>
);
const Div = () => <View style={s.divider} />;

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: Colors.background },
  content:          { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  pageTitle:        { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: Spacing.xl },
  profileSection:   { alignItems: 'center', marginBottom: Spacing.xl },
  avatar:           { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  avatarAdmin:      { backgroundColor: '#E05C6A' },
  avatarText:       { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  nameRow:          { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  profileName:      { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  adminBadge:       { backgroundColor: '#E05C6A22', borderWidth: 1, borderColor: '#E05C6A55', borderRadius: 999, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  adminBadgeText:   { color: '#E05C6A', fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1 },
  sectionLabel:     { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1.5, fontWeight: '600', marginBottom: Spacing.sm, marginTop: Spacing.md },
  card:             { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg, overflow: 'hidden' },
  row:              { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  rowIcon:          { fontSize: 18 },
  rowLabel:         { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  rowValue:         { fontSize: FontSize.sm, color: Colors.textSecondary },
  divider:          { height: 1, backgroundColor: Colors.border, marginLeft: Spacing.lg },
  chevron:          { color: Colors.textMuted, fontSize: 20 },
  logoutBtn:        { marginTop: Spacing.md, backgroundColor: Colors.error + '18', borderWidth: 1, borderColor: Colors.error + '44', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  logoutText:       { color: Colors.error, fontSize: FontSize.md, fontWeight: '700' },
  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalBox:         { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, width: '100%', maxWidth: 360, gap: Spacing.sm },
  modalTitle:       { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  modalSub:         { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  errText:          { color: Colors.error, fontSize: FontSize.sm, fontWeight: '600' },
  passInput:        { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, padding: Spacing.md },
  modalActions:     { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  modalCancel:      { flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  modalCancelText:  { color: Colors.textSecondary, fontWeight: '600' },
  modalConfirm:     { flex: 1, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center' },
  modalConfirmText: { color: Colors.textPrimary, fontWeight: '700' },
});
