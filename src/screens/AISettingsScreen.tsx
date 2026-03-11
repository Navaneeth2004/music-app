import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, ActivityIndicator, Linking, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';
import { BackButton } from '../components/shared/Backbutton';
import {
  getApiKey, setApiKey, clearApiKey, getModel,
  getActiveProvider, setActiveProvider, AI_PROVIDERS,
  GEMINI_MODELS, CLAUDE_MODELS, CHATGPT_MODELS, GROQ_MODELS,
  GeminiModel, ClaudeModel, ChatGPTModel, GroqModel,
} from '../services/aiService';
import { setGeminiModel } from '../services/Geminiservice';
import { setClaudeModel } from '../services/Claudeservice';
import { setChatGPTModel } from '../services/Chatgptservice';
import { setGroqModel } from '../services/Groqservice';
import { useAuth } from '../context/AuthContext';

interface Props { onBack: () => void; }

type AIModel = GeminiModel | ClaudeModel | ChatGPTModel | GroqModel;

export const AISettingsScreen: React.FC<Props> = ({ onBack }) => {
  const { unlockAdmin } = useAuth();

  const [activeProvider, setActiveProviderState] = useState('gemini');
  const [hasKey,       setHasKey]       = useState(false);
  const [revealed,     setRevealed]     = useState(false);
  const [keyValue,     setKeyValue]     = useState('');
  const [inputKey,     setInputKey]     = useState('');
  const [selectedModel,setSelectedModel]= useState<AIModel>('gemini-2.0-flash');
  const [saving,       setSaving]       = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  // Password modal
  const [showPwModal,  setShowPwModal]  = useState(false);
  const [password,     setPassword]     = useState('');
  const [pwError,      setPwError]      = useState('');
  const [verifying,    setVerifying]    = useState(false);
  // Delete confirm modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Success toast
  const [toast,        setToast]        = useState('');

  const reload = useCallback(async () => {
    const p = await getActiveProvider();
    const k = await getApiKey();
    const m = await getModel();
    setActiveProviderState(p);
    setHasKey(!!k);
    setKeyValue(k ?? '');
    setSelectedModel((m || 'gemini-2.0-flash') as AIModel);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const getModelsForProvider = (provider: string) => {
    switch (provider) {
      case 'claude':  return CLAUDE_MODELS;
      case 'chatgpt': return CHATGPT_MODELS;
      case 'groq':    return GROQ_MODELS;
      default:        return GEMINI_MODELS;
    }
  };

  const currentModels = getModelsForProvider(activeProvider);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // ── Verify password then reveal ──────────────────────────────
  const handleReveal = async () => {
    if (!password) return;
    setVerifying(true); setPwError('');
    const ok = await unlockAdmin(password);
    setVerifying(false);
    if (ok) {
      setRevealed(true); setShowPwModal(false); setPassword('');
    } else {
      setPwError('Incorrect password.');
    }
  };

  // ── Save key ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!inputKey.trim()) return;
    setSaving(true);
    await setApiKey(inputKey.trim());
    setInputKey(''); setShowSaveForm(false); setRevealed(false);
    await reload(); setSaving(false);
    showToast('API key saved.');
  };

  // ── Delete key ────────────────────────────────────────────────
  const handleDelete = () => { setShowDeleteConfirm(true); };
  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    await clearApiKey(); setRevealed(false); await reload(); showToast('API key removed.');
  };

  // ── Model change ─────────────────────────────────────────────
  const handleProviderChange = async (providerId: string) => {
    setActiveProviderState(providerId);
    await setActiveProvider(providerId as any);
    const m = await getModel();
    setSelectedModel((m || 'gemini-2.0-flash') as AIModel);
    await reload();
  };

  const handleModelChange = async (m: AIModel) => {
    setSelectedModel(m);
    if (activeProvider === 'claude')      await setClaudeModel(m as ClaudeModel);
    else if (activeProvider === 'chatgpt') await setChatGPTModel(m as ChatGPTModel);
    else if (activeProvider === 'groq')    await setGroqModel(m as GroqModel);
    else                                    await setGeminiModel(m as GeminiModel);
  };

  const maskedKey = keyValue
    ? keyValue.slice(0, 8) + '••••••••••••' + keyValue.slice(-4)
    : '';

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <BackButton onPress={onBack} label="Back" />
        <Text style={s.headerTitle}>AI Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Toast */}
      {!!toast && (
        <View style={s.toast}><Text style={s.toastText}>{toast}</Text></View>
      )}

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Provider selector */}
        <Text style={s.sectionLabel}>AI SERVICE PROVIDER</Text>
        <View style={s.card}>
          {AI_PROVIDERS.map((provider, i) => (
            <Pressable key={provider.id} onPress={() => handleProviderChange(provider.id)}
              style={[s.providerRow, i < AI_PROVIDERS.length - 1 && s.stepBorder]}>
              <View style={[s.radio, activeProvider === provider.id && s.radioSelected]}>
                {activeProvider === provider.id && <View style={s.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modelLabel}>{provider.label}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* How to get key */}
        <Text style={s.sectionLabel}>HOW TO GET YOUR API KEY</Text>
        <View style={s.card}>
          {getStepsForProvider(activeProvider).map((step, i) => (
            <View key={i} style={[s.step, i < getStepsForProvider(activeProvider).length - 1 && s.stepBorder]}>
              <View style={s.stepNum}><Text style={s.stepNumText}>{i + 1}</Text></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.stepTitle}>{step.title}</Text>
                {step.sub && <Text style={s.stepSub}>{step.sub}</Text>}
                {step.link && (
                  <Pressable onPress={() => Linking.openURL(step.link!)}>
                    <Text style={s.link}>{step.link}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Model selector */}
        <Text style={s.sectionLabel}>MODEL</Text>
        <View style={s.card}>
          {currentModels.map((m, i) => (
            <Pressable key={m.id} onPress={() => handleModelChange(m.id as AIModel)}
              style={[s.modelRow, i < currentModels.length - 1 && s.stepBorder]}>
              <View style={[s.radio, selectedModel === m.id && s.radioSelected]}>
                {selectedModel === m.id && <View style={s.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modelLabel}>{m.label}</Text>
                <Text style={s.modelNote}>{m.note}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Key status */}
        <Text style={s.sectionLabel}>YOUR API KEY</Text>
        <View style={s.card}>
          {hasKey ? (
            <>
              <View style={s.keyRow}>
                <View style={s.keyDot} />
                <Text style={s.keyStatus}>API key saved</Text>
                <View style={s.keyBadge}><Text style={s.keyBadgeText}>ACTIVE</Text></View>
              </View>
              <View style={s.divider} />
              <View style={s.revealBox}>
                <Text style={s.revealLabel}>YOUR KEY</Text>
                {revealed
                  ? <Text style={s.revealValue} selectable>{keyValue}</Text>
                  : <Text style={s.maskedKey}>{maskedKey}</Text>
                }
                {revealed
                  ? <Pressable onPress={() => setRevealed(false)} style={s.revealBtn}>
                      <Text style={s.revealBtnText}>Hide</Text>
                    </Pressable>
                  : <Pressable onPress={() => { setShowPwModal(true); setPassword(''); setPwError(''); }} style={s.revealBtn}>
                      <Text style={s.revealBtnText}>👁  Reveal</Text>
                    </Pressable>
                }
              </View>
              <View style={s.divider} />
              <View style={s.keyActions}>
                <Pressable onPress={() => { setShowSaveForm(true); setInputKey(''); }} style={s.replaceBtn}>
                  <Text style={s.replaceBtnText}>Replace</Text>
                </Pressable>
                <Pressable onPress={handleDelete} style={s.deleteBtn}>
                  <Text style={s.deleteBtnText}>Remove</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={s.noKeyBox}>
              <Text style={s.noKeyIcon}>🔑</Text>
              <Text style={s.noKeyText}>No API key saved</Text>
              <Text style={s.noKeySub}>Follow the steps above, then paste your key below.</Text>
            </View>
          )}
        </View>

        {/* Add/Replace key form */}
        {(!hasKey || showSaveForm) && (
          <>
            <Text style={s.sectionLabel}>{hasKey ? 'REPLACE KEY' : 'ADD YOUR KEY'}</Text>
            <View style={s.card}>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.keyInput}
                  value={inputKey}
                  onChangeText={setInputKey}
                  placeholder="AIza..."
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
              </View>
              <View style={s.saveRow}>
                {showSaveForm && (
                  <Pressable onPress={() => setShowSaveForm(false)} style={s.cancelSaveBtn}>
                    <Text style={s.cancelSaveBtnText}>Cancel</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={handleSave}
                  disabled={!inputKey.trim() || saving}
                  style={[s.saveBtn, (!inputKey.trim() || saving) && { opacity: 0.4 }]}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.saveBtnText}>Save Key</Text>
                  }
                </Pressable>
              </View>
            </View>
          </>
        )}

        <View style={s.privacyNote}>
          <Text style={s.privacyText}>
            🔒  Your API key is stored only in this app's local storage and sent directly to the provider's API. It is never stored on any third-party server.
          </Text>
        </View>

      </ScrollView>

      {/* Delete confirm modal */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Remove API Key</Text>
            <Text style={s.modalSub}>Are you sure you want to remove your saved API key? You will need to re-enter it to use AI features.</Text>
            <View style={s.modalActions}>
              <Pressable onPress={() => setShowDeleteConfirm(false)} style={s.modalCancel}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirmDelete} style={[s.modalConfirm, { backgroundColor: Colors.error }]}>
                <Text style={s.modalConfirmText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password modal */}
      <Modal visible={showPwModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Enter Password</Text>
            <Text style={s.modalSub}>Enter your login password to reveal the key.</Text>
            {!!pwError && <Text style={s.pwError}>{pwError}</Text>}
            <TextInput
              style={s.pwInput}
              value={password}
              onChangeText={t => { setPassword(t); setPwError(''); }}
              placeholder="Your password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry autoFocus
              returnKeyType="done"
              onSubmitEditing={handleReveal}
            />
            <View style={s.modalActions}>
              <Pressable onPress={() => { setShowPwModal(false); setPassword(''); setPwError(''); }} style={s.modalCancel}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleReveal} disabled={!password || verifying}
                style={[s.modalConfirm, (!password || verifying) && { opacity: 0.4 }]}>
                {verifying
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalConfirmText}>Reveal</Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const STEPS_GEMINI: { title: string; sub: string; link?: string }[] = [
  {
    title: 'Go to Google AI Studio',
    sub: 'Open aistudio.google.com in your browser.',
    link: 'https://aistudio.google.com',
  },
  {
    title: 'Sign in with Google',
    sub: 'Use any Google account. It is free.',
  },
  {
    title: 'Get API key',
    sub: 'Click Get API key then Create API key. Copy the key.',
  },
  {
    title: 'Paste the key below',
    sub: 'Keys start with AIza and are about 39 characters.',
  },
];

const STEPS_CLAUDE: { title: string; sub: string; link?: string }[] = [
  {
    title: 'Go to Anthropic Console',
    sub: 'Open console.anthropic.com in your browser.',
    link: 'https://console.anthropic.com',
  },
  {
    title: 'Sign in or create account',
    sub: 'Use your email or Google account.',
  },
  {
    title: 'Create API key',
    sub: 'Go to the API key section and create a new API key. Copy it.',
  },
  {
    title: 'Paste the key below',
    sub: 'Keys start with sk-ant and are encrypted.',
  },
];

const STEPS_CHATGPT: { title: string; sub: string; link?: string }[] = [
  {
    title: 'Go to OpenAI Platform',
    sub: 'Open platform.openai.com in your browser.',
    link: 'https://platform.openai.com',
  },
  {
    title: 'Sign in or create account',
    sub: 'Use your email or existing OpenAI account.',
  },
  {
    title: 'Create API key',
    sub: 'Go to API keys section, create a new secret key, and copy it.',
  },
  {
    title: 'Paste the key below',
    sub: 'Keys start with sk-proj and are about 48 characters.',
  },
];

const STEPS_GROQ: { title: string; sub: string; link?: string }[] = [
  {
    title: 'Go to Groq Console',
    sub: 'Open console.groq.com in your browser.',
    link: 'https://console.groq.com',
  },
  {
    title: 'Sign in or create account',
    sub: 'Use your Google or email account.',
  },
  {
    title: 'Create API key',
    sub: 'Go to the API keys section and create a new API key. Copy it.',
  },
  {
    title: 'Paste the key below',
    sub: 'Keys are unique to your account.',
  },
];

function getStepsForProvider(provider: string) {
  switch (provider) {
    case 'claude':  return STEPS_CLAUDE;
    case 'chatgpt': return STEPS_CHATGPT;
    case 'groq':    return STEPS_GROQ;
    default:        return STEPS_GEMINI;
  }
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: Colors.background },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:          { paddingVertical: Spacing.sm, minWidth: 60 },
  backText:         { color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '500' },
  headerTitle:      { flex: 1, fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  content:          { padding: Spacing.lg, paddingBottom: 60, gap: Spacing.sm },

  toast:            { backgroundColor: Colors.success, marginHorizontal: Spacing.lg, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', marginTop: Spacing.sm },
  toastText:        { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },

  sectionLabel:     { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1.5, fontWeight: '600', marginTop: Spacing.md, marginBottom: Spacing.xs },
  card:             { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },

  step:             { flexDirection: 'row', gap: Spacing.md, padding: Spacing.md, alignItems: 'flex-start' },
  stepBorder:       { borderBottomWidth: 1, borderBottomColor: Colors.border },
  stepNum:          { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.accent + '22', borderWidth: 1, borderColor: Colors.accent + '55', alignItems: 'center', justifyContent: 'center' },
  stepNumText:      { color: Colors.accentLight, fontSize: FontSize.sm, fontWeight: '700' },
  stepTitle:        { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  stepSub:          { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  link:             { fontSize: FontSize.xs, color: Colors.accentLight, textDecorationLine: 'underline', marginTop: 2 },

  providerRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  modelRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  radio:            { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected:    { borderColor: Colors.accent },
  radioDot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent },
  modelLabel:       { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  modelNote:        { fontSize: FontSize.xs, color: Colors.textSecondary },

  keyRow:           { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  keyDot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  keyStatus:        { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  keyBadge:         { backgroundColor: Colors.success + '22', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: Colors.success + '55' },
  keyBadgeText:     { color: Colors.success, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1 },
  divider:          { height: 1, backgroundColor: Colors.border },

  revealBox:        { padding: Spacing.md, gap: Spacing.xs },
  revealLabel:      { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1, fontWeight: '600' },
  revealValue:      { fontSize: FontSize.sm, color: Colors.accentLight, lineHeight: 20 },
  maskedKey:        { fontSize: FontSize.sm, color: Colors.textMuted, letterSpacing: 1 },
  revealBtn:        { alignSelf: 'flex-start', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: 6, marginTop: 4 },
  revealBtnText:    { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },

  keyActions:       { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md },
  replaceBtn:       { flex: 1, padding: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  replaceBtnText:   { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  deleteBtn:        { flex: 1, padding: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.error + '44', backgroundColor: Colors.error + '10', alignItems: 'center' },
  deleteBtnText:    { color: Colors.error, fontSize: FontSize.sm, fontWeight: '600' },

  noKeyBox:         { padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  noKeyIcon:        { fontSize: 32 },
  noKeyText:        { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  noKeySub:         { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },

  inputWrap:        { padding: Spacing.md },
  keyInput:         { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.sm, padding: Spacing.md },
  saveRow:          { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, paddingTop: 0 },
  cancelSaveBtn:    { flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelSaveBtnText:{ color: Colors.textSecondary, fontWeight: '600' },
  saveBtn:          { flex: 1, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center' },
  saveBtnText:      { color: Colors.textPrimary, fontWeight: '700' },

  privacyNote:      { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.sm },
  privacyText:      { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },

  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalBox:         { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, width: '100%', maxWidth: 360, gap: Spacing.sm },
  modalTitle:       { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  modalSub:         { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  pwError:          { color: Colors.error, fontSize: FontSize.sm, fontWeight: '600' },
  pwInput:          { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, padding: Spacing.md },
  modalActions:     { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  modalCancel:      { flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  modalCancelText:  { color: Colors.textSecondary, fontWeight: '600' },
  modalConfirm:     { flex: 1, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center' },
  modalConfirmText: { color: Colors.textPrimary, fontWeight: '700' },
});