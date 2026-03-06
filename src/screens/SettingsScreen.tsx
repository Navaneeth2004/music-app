import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';
import { User } from '../types';
import { BackupScreen } from './BackupScreen';

interface SettingsScreenProps {
  user: User;
  onLogout: () => void;
  isAdmin?: boolean;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: Spacing.xl },
  profileSection: { alignItems: 'center', marginBottom: Spacing.xl },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  avatarAdmin: { backgroundColor: '#E05C6A' },
  avatarText: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  profileName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  adminBadge: { backgroundColor: '#E05C6A22', borderWidth: 1, borderColor: '#E05C6A55', borderRadius: 999, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  adminBadgeText: { color: '#E05C6A', fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1 },
  profileEmail: { fontSize: FontSize.sm, color: Colors.textSecondary },
  sectionLabel: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1.5, fontWeight: '600', marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  rowIcon: { fontSize: 18 },
  rowLabel: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  rowValue: { fontSize: FontSize.sm, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: Spacing.lg },
  logoutBtn: { marginTop: Spacing.md, backgroundColor: Colors.error + '18', borderWidth: 1, borderColor: Colors.error + '44', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  logoutText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '700' },
  chevron: { color: Colors.textMuted, fontSize: 20 },
});

const Row = ({ icon, label, value }: { icon: string; label: string; value?: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowIcon}>{icon}</Text>
    <Text style={styles.rowLabel}>{label}</Text>
    {value && <Text style={styles.rowValue}>{value}</Text>}
  </View>
);

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, onLogout, isAdmin }) => {
  const [showBackup, setShowBackup] = useState(false);

  if (showBackup) return <BackupScreen onBack={() => setShowBackup(false)} />;

  return (
  <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Settings</Text>

      <View style={styles.profileSection}>
        <View style={[styles.avatar, isAdmin && styles.avatarAdmin]}>
          <Text style={styles.avatarText}>{user.username[0].toUpperCase()}</Text>
        </View>
        <View style={styles.nameRow}>
          <Text style={styles.profileName}>{user.username}</Text>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          )}
        </View>
        <Text style={styles.profileEmail}>{user.email}</Text>
      </View>

      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <View style={styles.card}>
        <Row icon="👤" label="Username" value={user.username} />
        <View style={styles.divider} />
        <Row icon="✉️" label="Email" value={user.email} />
      </View>

      <Text style={styles.sectionLabel}>APP</Text>
      <View style={styles.card}>
        <Row icon="ℹ️" label="Version" value="1.0.0" />
        {isAdmin && <>
          <View style={styles.divider} />
          <Row icon="🛠️" label="Mode" value="Admin" />
        </>}
        <View style={styles.divider} />
        <Pressable onPress={() => setShowBackup(true)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
          <Text style={styles.rowIcon}>💾</Text>
          <Text style={styles.rowLabel}>Backup & Restore</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      <Pressable onPress={onLogout} style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}>
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </ScrollView>
  </SafeAreaView>
);
};