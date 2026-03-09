import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';
import { SwipeableRow } from '../components/shared/SwipeableRow';
import { ConfirmModal } from '../components/shared/ConfirmModal';
import {
  superadminIsSetup, superadminSetPassword, superadminVerifyPassword,
  dbGetAllUsers, dbAdminUpdateUsername, dbAdminUpdatePassword,
  dbAdminDeleteUser, dbGetUserStats, AdminUser,
} from '../api/db';
import { ADMIN_USERNAME } from '../constants/admin';

interface Props { onBack: () => void; }

async function hashPw(pw: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pw);
}

// ─── Entry gate ───────────────────────────────────────────────
export const SuperAdminScreen: React.FC<Props> = ({ onBack }) => {
  const [phase, setPhase] = useState<'loading' | 'setup' | 'login' | 'dashboard'>('loading');

  useEffect(() => {
    superadminIsSetup().then(yes => setPhase(yes ? 'login' : 'setup'));
  }, []);

  if (phase === 'loading') return (
    <SafeAreaView style={s.safe}>
      <ActivityIndicator color={Colors.accent} style={{ marginTop: 80 }} />
    </SafeAreaView>
  );
  if (phase === 'setup') return <SetupScreen  onBack={onBack} onDone={() => setPhase('dashboard')} />;
  if (phase === 'login') return <LoginScreen  onBack={onBack} onDone={() => setPhase('dashboard')} />;
  return <Dashboard onBack={onBack} />;
};

// ─── First-time setup ─────────────────────────────────────────
const SetupScreen: React.FC<{ onBack: () => void; onDone: () => void }> = ({ onBack, onDone }) => {
  const [pw, setPw]           = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const handleSetup = async () => {
    if (pw.length < 6)  { setError('Password must be at least 6 characters.'); return; }
    if (pw !== confirm) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      await superadminSetPassword(await hashPw(pw));
      onDone();
    } catch { setError('Failed to save password.'); }
    finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={onBack} style={s.backBtn}><Text style={s.backText}>← Settings</Text></Pressable>
        <View style={s.heroBox}>
          <Text style={s.heroIcon}>🔐</Text>
          <Text style={s.heroTitle}>Set Superadmin Password</Text>
          <Text style={s.heroSub}>Required every time you access Superadmin. Set it once and remember it.</Text>
        </View>
        {!!error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}
        <View style={s.formCard}>
          <Text style={s.label}>PASSWORD</Text>
          <TextInput style={s.input} value={pw} onChangeText={t => { setPw(t); setError(''); }}
            placeholder="At least 6 characters" placeholderTextColor={Colors.textMuted}
            secureTextEntry autoCapitalize="none" />
          <Text style={[s.label, { marginTop: Spacing.md }]}>CONFIRM PASSWORD</Text>
          <TextInput style={s.input} value={confirm} onChangeText={t => { setConfirm(t); setError(''); }}
            placeholder="Repeat password" placeholderTextColor={Colors.textMuted}
            secureTextEntry autoCapitalize="none" />
          <Pressable onPress={handleSetup}
            style={[s.primaryBtn, (!pw || !confirm) && { opacity: 0.4 }]}
            disabled={saving || !pw || !confirm}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.primaryBtnText}>Set Password & Enter</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Login ────────────────────────────────────────────────────
const LoginScreen: React.FC<{ onBack: () => void; onDone: () => void }> = ({ onBack, onDone }) => {
  const [pw, setPw]           = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleLogin = async () => {
    if (!pw) return;
    setLoading(true);
    try {
      const ok = await superadminVerifyPassword(await hashPw(pw));
      if (ok) onDone();
      else setError('Incorrect password.');
    } catch { setError('Something went wrong.'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={onBack} style={s.backBtn}><Text style={s.backText}>← Settings</Text></Pressable>
        <View style={s.heroBox}>
          <Text style={s.heroIcon}>🛡️</Text>
          <Text style={s.heroTitle}>Superadmin</Text>
          <Text style={s.heroSub}>Enter your superadmin password to continue.</Text>
        </View>
        {!!error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}
        <View style={s.formCard}>
          <Text style={s.label}>PASSWORD</Text>
          <TextInput style={s.input} value={pw} onChangeText={t => { setPw(t); setError(''); }}
            placeholder="Superadmin password" placeholderTextColor={Colors.textMuted}
            secureTextEntry autoCapitalize="none" onSubmitEditing={handleLogin} />
          <Pressable onPress={handleLogin}
            style={[s.primaryBtn, !pw && { opacity: 0.4 }]}
            disabled={loading || !pw}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.primaryBtnText}>Enter</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Dashboard ────────────────────────────────────────────────
const Dashboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setUsers(await dbGetAllUsers());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await dbAdminDeleteUser(deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  const studentCount = users.filter(u => u.username.toLowerCase() !== ADMIN_USERNAME.toLowerCase()).length;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={onBack} style={s.backBtn}><Text style={s.backText}>← Settings</Text></Pressable>

        <View style={s.dashTitleRow}>
          <Text style={s.dashIcon}>🛡️</Text>
          <View>
            <Text style={s.dashTitle}>Superadmin</Text>
            <Text style={s.dashSub}>User Management</Text>
          </View>
        </View>

        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{users.length}</Text>
            <Text style={s.statLabel}>Total Users</Text>
          </View>
          <View style={[s.statBox, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}>
            <Text style={s.statNum}>{studentCount}</Text>
            <Text style={s.statLabel}>Students</Text>
          </View>
          <View style={[s.statBox, { borderLeftWidth: 1, borderLeftColor: Colors.border }]}>
            <Text style={s.statNum}>1</Text>
            <Text style={s.statLabel}>Admin</Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>ALL USERS</Text>
        <Text style={s.swipeTip}>Swipe right to edit · Swipe left to delete</Text>

        {loading
          ? <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />
          : users.map(u => {
              const isAdmin = u.username.toLowerCase() === ADMIN_USERNAME.toLowerCase();
              return (
                <SwipeableRow
                  key={u.id}
                  containerStyle={{ borderRadius: Radius.md, marginBottom: Spacing.sm }}
                  onRightAction={() => setEditTarget(u)}
                  rightLabel="Edit"
                  rightIcon="✏️"
                  rightColor={Colors.accent}
                  onDelete={() => setDeleteTarget(u)}
                  deleteDisabled={isAdmin}
                >
                  <UserCard user={u} />
                </SwipeableRow>
              );
            })
        }
      </ScrollView>

      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); load(); }}
        />
      )}
      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete User"
        message={`Delete "${deleteTarget?.username}"? This removes their account and all their content.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
};

// ─── User card (display only, no buttons) ────────────────────
const UserCard: React.FC<{ user: AdminUser }> = ({ user }) => {
  const [stats, setStats] = useState<{ books: number; decks: number } | null>(null);
  const isAdmin     = user.username.toLowerCase() === ADMIN_USERNAME.toLowerCase();
  const avatarColor = isAdmin ? '#E05C6A' : Colors.accent;
  const joined      = new Date(user.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  useEffect(() => { dbGetUserStats(user.id).then(setStats).catch(() => {}); }, [user.id]);

  return (
    <View style={s.userCard}>
      <View style={[s.avatar, { backgroundColor: avatarColor + '22', borderColor: avatarColor + '55' }]}>
        <Text style={[s.avatarText, { color: avatarColor }]}>{user.username.slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.userNameRow}>
          <Text style={s.userName}>{user.username}</Text>
          {isAdmin && <View style={s.adminPill}><Text style={s.adminPillText}>ADMIN</Text></View>}
        </View>
        <Text style={s.userMeta}>Joined {joined}</Text>
        {stats && (
          <Text style={s.userStats}>
            {stats.books} book{stats.books !== 1 ? 's' : ''} · {stats.decks} deck{stats.decks !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </View>
  );
};

// ─── Edit modal ───────────────────────────────────────────────
const EditUserModal: React.FC<{ user: AdminUser; onClose: () => void; onSaved: () => void }> = ({ user, onClose, onSaved }) => {
  const [tab, setTab]           = useState<'username' | 'password'>('username');
  const [username, setUsername] = useState(user.username);
  const [pw, setPw]             = useState('');
  const [pw2, setPw2]           = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const clear = () => { setError(''); setSuccess(''); };

  const saveUsername = async () => {
    if (!username.trim() || username.trim() === user.username) return;
    setSaving(true); clear();
    try {
      await dbAdminUpdateUsername(user.id, username.trim());
      setSuccess('Username updated.');
      setTimeout(onSaved, 700);
    } catch (e: any) {
      setError(e.message === 'USERNAME_TAKEN' ? 'Username already taken.' : 'Failed to update.');
    } finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (pw.length < 6) { setError('At least 6 characters required.'); return; }
    if (pw !== pw2)    { setError('Passwords do not match.'); return; }
    setSaving(true); clear();
    try {
      await dbAdminUpdatePassword(user.id, await hashPw(pw));
      setSuccess('Password updated.');
      setTimeout(onSaved, 700);
    } catch { setError('Failed to update.'); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalBox}>
          <View style={s.modalHandle} />
          <View style={s.modalHeaderRow}>
            <Text style={s.modalTitle}>Edit User</Text>
            <Pressable onPress={onClose} hitSlop={12}><Text style={s.modalClose}>✕</Text></Pressable>
          </View>
          <Text style={s.modalSubtitle}>{user.username}</Text>

          <View style={s.tabRow}>
            {(['username', 'password'] as const).map(t => (
              <Pressable key={t} onPress={() => { setTab(t); clear(); }} style={[s.tab, tab === t && s.tabActive]}>
                <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              </Pressable>
            ))}
          </View>

          {!!error   && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}
          {!!success && <View style={s.successBox}><Text style={s.successText}>{success}</Text></View>}

          {tab === 'username' && <>
            <Text style={s.label}>NEW USERNAME</Text>
            <TextInput style={s.input} value={username} onChangeText={t => { setUsername(t); clear(); }}
              autoCapitalize="none" placeholderTextColor={Colors.textMuted} />
            <Pressable onPress={saveUsername}
              style={[s.primaryBtn, (username.trim() === user.username || !username.trim()) && { opacity: 0.4 }]}
              disabled={saving || username.trim() === user.username || !username.trim()}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.primaryBtnText}>Save Username</Text>}
            </Pressable>
          </>}

          {tab === 'password' && <>
            <Text style={s.label}>NEW PASSWORD</Text>
            <TextInput style={s.input} value={pw} onChangeText={t => { setPw(t); clear(); }}
              secureTextEntry placeholder="At least 6 characters" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
            <Text style={[s.label, { marginTop: Spacing.sm }]}>CONFIRM</Text>
            <TextInput style={s.input} value={pw2} onChangeText={t => { setPw2(t); clear(); }}
              secureTextEntry placeholder="Repeat password" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
            <Pressable onPress={savePassword}
              style={[s.primaryBtn, (!pw || !pw2) && { opacity: 0.4 }]}
              disabled={saving || !pw || !pw2}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.primaryBtnText}>Save Password</Text>}
            </Pressable>
          </>}
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.background },
  content:       { padding: Spacing.lg, paddingBottom: 60 },
  backBtn:       { marginBottom: Spacing.lg },
  backText:      { color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '500' },
  heroBox:       { alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.md },
  heroIcon:      { fontSize: 48, marginBottom: Spacing.md },
  heroTitle:     { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs },
  heroSub:       { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.md },
  dashTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  dashIcon:      { fontSize: 32 },
  dashTitle:     { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  dashSub:       { fontSize: FontSize.sm, color: Colors.textSecondary },
  statsRow:      { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl },
  statBox:       { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statNum:       { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  statLabel:     { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  sectionLabel:  { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1.5, fontWeight: '600', marginBottom: 4 },
  swipeTip:      { fontSize: FontSize.xs, color: Colors.textMuted + 'AA', marginBottom: Spacing.md, fontStyle: 'italic' },
  userCard:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  avatar:        { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontSize: FontSize.md, fontWeight: '800' },
  userNameRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  userName:      { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  adminPill:     { backgroundColor: '#E05C6A22', borderWidth: 1, borderColor: '#E05C6A55', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  adminPillText: { color: '#E05C6A', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  userMeta:      { fontSize: FontSize.xs, color: Colors.textMuted },
  userStats:     { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  formCard:      { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm },
  label:         { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1.5, fontWeight: '600' },
  input:         { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, padding: Spacing.md },
  primaryBtn:    { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  primaryBtnText:{ color: Colors.textPrimary, fontWeight: '700', fontSize: FontSize.md },
  errorBox:      { backgroundColor: Colors.error + '18', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.error + '44', padding: Spacing.sm, marginBottom: Spacing.sm },
  errorText:     { color: Colors.error, fontSize: FontSize.sm },
  successBox:    { backgroundColor: Colors.accent + '18', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.accent + '44', padding: Spacing.sm, marginBottom: Spacing.sm },
  successText:   { color: Colors.accent, fontSize: FontSize.sm },
  modalOverlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalBox:      { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, borderColor: Colors.border, padding: Spacing.lg, paddingBottom: 40, gap: Spacing.sm },
  modalHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.sm },
  modalHeaderRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:    { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  modalClose:    { color: Colors.textMuted, fontSize: FontSize.lg },
  modalSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: -Spacing.xs },
  tabRow:        { flexDirection: 'row', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: 3, gap: 3, marginBottom: Spacing.sm },
  tab:           { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm - 2, alignItems: 'center' },
  tabActive:     { backgroundColor: Colors.surface },
  tabText:       { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: Colors.textPrimary },
});