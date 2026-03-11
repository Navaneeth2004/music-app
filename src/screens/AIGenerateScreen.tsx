import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, ActivityIndicator, Image, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ExpoImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';
import { useNavigation } from '../context/Navigationcontext';
import {
  getApiKey,
  getModel,
  extractTextFromImage,
  generateParagraph,
  generateBullets,
  generateTableCell,
  generateFlashcard,
} from '../services/aiService';

export type AITarget =
  | { type: 'paragraph' }
  | { type: 'bullets' }
  | { type: 'tableCell'; header: string }
  | { type: 'flashcard'; side: 'front' | 'back'; otherSide?: string };

interface Props {
  target: AITarget;
  onInsert: (result: string | string[]) => void;
  onBack: () => void;
}

async function hasInternet(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    await fetch('https://api.anthropic.com', { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

export const AIGenerateScreen: React.FC<Props> = ({ target, onInsert, onBack }) => {
  const { navigate } = useNavigation();
  const [apiKey,     setApiKeyState] = useState<string | null | 'loading'>('loading');
  const [prompt,     setPrompt]      = useState('');
  const [imageUri,   setImageUri]    = useState<string | null>(null);
  const [imageMime,  setImageMime]   = useState('image/jpeg');
  const [ocrText,    setOcrText]     = useState<string | null>(null);
  const [phase,      setPhase]       = useState<'idle' | 'checking' | 'ocr' | 'generating'>('idle');
  const [imageMode,  setImageMode]   = useState<'none' | 'image' | 'manual'>('none');
  const [manualText, setManualText]  = useState('');
  const [result,     setResult]      = useState<string | null>(null);
  const [resultList, setResultList]  = useState<string[] | null>(null);
  const [error,      setError]       = useState('');

  const [model, setModel] = useState<any>('gemini-2.0-flash');
  useEffect(() => {
    getApiKey().then(k => setApiKeyState(k));
    getModel().then(m => setModel(m));
  }, []);

  const noKey = apiKey !== 'loading' && !apiKey;

  const targetLabel = () => {
    switch (target.type) {
      case 'paragraph':  return 'Paragraph';
      case 'bullets':    return 'Bullet List';
      case 'tableCell':  return `Cell — "${target.header}"`;
      case 'flashcard':  return `Flashcard ${target.side === 'front' ? 'Front' : 'Back'}`;
    }
  };

  const pickImage = async (camera: boolean) => {
    const res = camera
      ? await ExpoImagePicker.launchCameraAsync({ quality: 0.9, base64: false })
      : await ExpoImagePicker.launchImageLibraryAsync({
          quality: 0.9, base64: false,
          mediaTypes: ExpoImagePicker.MediaTypeOptions.Images,
        });
    if (res.canceled) return;
    const asset = res.assets[0];
    setImageUri(asset.uri);
    setImageMime(asset.mimeType ?? 'image/jpeg');
    setOcrText(null); setResult(null); setResultList(null);
  };

  const handleGenerate = async () => {
    if (!apiKey || apiKey === 'loading') return;
    if (!prompt.trim() && !imageUri) { setError('Enter a prompt or upload an image.'); return; }
    setError(''); setResult(null); setResultList(null);

    setPhase('checking');
    const online = await hasInternet();
    if (!online) {
      setPhase('idle');
      setError('No internet connection. Please connect to the internet and try again.');
      return;
    }

    try {
      let context: string | undefined;

      if (imageUri) {
        setPhase('ocr');
        const b64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
        const extracted = await extractTextFromImage(apiKey, model, b64, imageMime);
        setOcrText(extracted);
        context = extracted;
      } else if (imageMode === 'manual' && manualText.trim()) {
        context = manualText.trim();
      }

      setPhase('generating');
      const p = prompt.trim();

      if (target.type === 'paragraph') {
        setResult(await generateParagraph(apiKey, model, p || 'Summarize the content', context));
      } else if (target.type === 'bullets') {
        setResultList(await generateBullets(apiKey, model, p || 'Extract key points', context));
      } else if (target.type === 'tableCell') {
        setResult(await generateTableCell(apiKey, model, p || 'Fill this cell', target.header, context));
      } else if (target.type === 'flashcard') {
        setResult(await generateFlashcard(apiKey, model, p || 'Generate content', target.side, target.otherSide, context));
      }
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      if (msg.includes('401') || msg.toLowerCase().includes('auth')) {
        setError('Invalid API key. Go to Settings → AI Settings to update it.');
      } else if (msg.includes('429')) {
        setError('Rate limit reached. Wait a moment and try again.');
      } else {
        setError(msg || 'Something went wrong. Check your connection and API key.');
      }
    } finally { setPhase('idle'); }
  };

  const isLoading = phase !== 'idle';

  const phaseLabel = () => {
    if (phase === 'checking')   return 'Checking connection…';
    if (phase === 'ocr')        return 'Reading image…';
    if (phase === 'generating') return 'Generating…';
    return '';
  };

  // ── No API key modal ──────────────────────────────────────────
  const NoKeyModal = () => (
    <Modal visible transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.modalBox}>
          <Text style={s.modalIcon}>🔑</Text>
          <Text style={s.modalTitle}>API Key Required</Text>
          <Text style={s.modalBody}>
            To use AI generation you need to add your Gemini API key in Settings → AI Settings.
          </Text>
          <Pressable onPress={() => { onBack(); navigate('ai-settings'); }} style={s.modalPrimary}>
            <Text style={s.modalPrimaryText}>Go to AI Settings</Text>
          </Pressable>
          <Pressable onPress={onBack} style={s.modalCancel}>
            <Text style={s.modalCancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>‹ Cancel</Text>
        </Pressable>
        <Text style={s.headerTitle}>Generate with AI</Text>
        <View style={{ width: 70 }} />
      </View>

      {noKey && <NoKeyModal />}

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={s.targetRow}>
          <View style={s.targetBadge}>
            <Text style={s.targetBadgeText}>✦  {targetLabel()}</Text>
          </View>
        </View>

        <Text style={s.label}>PROMPT</Text>
        <TextInput
          style={s.promptInput}
          value={prompt}
          onChangeText={t => { setPrompt(t); setError(''); }}
          placeholder={placeholderFor(target)}
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
          editable={!isLoading}
        />
        <Text style={s.charCount}>{prompt.length}/500</Text>

        <Text style={s.label}>SOURCE TEXT (OPTIONAL)</Text>
        <Text style={s.sublabel}>Add context from a textbook or notes to guide generation.</Text>
        <View style={s.modeTabs}>
          <Pressable onPress={() => { setImageMode('none'); setImageUri(null); setManualText(''); setOcrText(null); }} style={[s.modeTab, imageMode === 'none' && s.modeTabActive]}>
            <Text style={[s.modeTabText, imageMode === 'none' && s.modeTabTextActive]}>None</Text>
          </Pressable>
          <Pressable onPress={() => setImageMode('image')} style={[s.modeTab, imageMode === 'image' && s.modeTabActive]}>
            <Text style={[s.modeTabText, imageMode === 'image' && s.modeTabTextActive]}>📷 Photo</Text>
          </Pressable>
          <Pressable onPress={() => setImageMode('manual')} style={[s.modeTab, imageMode === 'manual' && s.modeTabActive]}>
            <Text style={[s.modeTabText, imageMode === 'manual' && s.modeTabTextActive]}>✏️ Type</Text>
          </Pressable>
        </View>

        {imageMode === 'image' && (
          imageUri ? (
            <View style={s.imageBox}>
              <Image source={{ uri: imageUri }} style={s.imagePreview} resizeMode="contain" />
              {ocrText && (
                <View style={s.ocrBox}>
                  <Text style={s.ocrLabel}>EXTRACTED TEXT</Text>
                  <Text style={s.ocrText}>{ocrText}</Text>
                </View>
              )}
              <Pressable onPress={() => { setImageUri(null); setOcrText(null); }} style={s.removeImg}>
                <Text style={s.removeImgText}>Remove image</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.imgButtons}>
              <Pressable onPress={() => pickImage(false)} style={s.imgBtn} disabled={isLoading}>
                <Text style={s.imgBtnIcon}>🖼</Text>
                <Text style={s.imgBtnText}>Photo Library</Text>
              </Pressable>
              <Pressable onPress={() => pickImage(true)} style={s.imgBtn} disabled={isLoading}>
                <Text style={s.imgBtnIcon}>📷</Text>
                <Text style={s.imgBtnText}>Camera</Text>
              </Pressable>
            </View>
          )
        )}

        {imageMode === 'manual' && (
          <TextInput
            style={[s.promptInput, { minHeight: 120 }]}
            value={manualText}
            onChangeText={setManualText}
            placeholder="Paste or type your source text here…"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={3000}
          />
        )}

        {!!error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <Pressable onPress={handleGenerate} disabled={isLoading} style={[s.generateBtn, isLoading && { opacity: 0.5 }]}>
          {isLoading ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={s.generateBtnText}>{phaseLabel()}</Text>
            </View>
          ) : (
            <Text style={s.generateBtnText}>✦  Generate</Text>
          )}
        </Pressable>

        {resultList && (
          <View style={s.resultCard}>
            <Text style={s.resultLabel}>RESULT</Text>
            {resultList.map((item, i) => (
              <View key={i} style={s.bulletRow}>
                <View style={s.bulletDot} />
                <Text style={s.bulletText}>{item}</Text>
              </View>
            ))}
            <Pressable onPress={() => { onInsert(resultList); onBack(); }} style={s.insertBtn}>
              <Text style={s.insertBtnText}>Insert</Text>
            </Pressable>
          </View>
        )}

        {result && (
          <View style={s.resultCard}>
            <Text style={s.resultLabel}>RESULT</Text>
            <Text style={s.resultText}>{result}</Text>
            <Pressable onPress={() => { onInsert(result); onBack(); }} style={s.insertBtn}>
              <Text style={s.insertBtnText}>Insert</Text>
            </Pressable>
          </View>
        )}

        {(result || resultList) && (
          <Text style={s.regenHint}>Not satisfied? Adjust your prompt and generate again.</Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

function placeholderFor(target: AITarget): string {
  switch (target.type) {
    case 'paragraph':  return 'e.g. "Explain photosynthesis for a high school student"';
    case 'bullets':    return 'e.g. "Key steps of the water cycle"';
    case 'tableCell':  return 'e.g. "Fill with the main advantage"';
    case 'flashcard':
      return (target as any).side === 'front'
        ? 'e.g. "Create a question about mitosis"'
        : 'e.g. "Write a concise answer"';
  }
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: Colors.background },
  header:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:           { paddingVertical: Spacing.sm, minWidth: 70 },
  backText:          { color: Colors.error, fontSize: FontSize.md, fontWeight: '500' },
  headerTitle:       { flex: 1, fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  content:           { padding: Spacing.lg, paddingBottom: 60, gap: Spacing.md },

  targetRow:         { alignItems: 'center' },
  targetBadge:       { backgroundColor: Colors.accent + '22', borderWidth: 1, borderColor: Colors.accent + '55', borderRadius: 999, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  targetBadgeText:   { color: Colors.accentLight, fontSize: FontSize.sm, fontWeight: '700', letterSpacing: 0.5 },

  label:             { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1.5, fontWeight: '600' },
  sublabel:          { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18, marginTop: -8 },
  charCount:         { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right', marginTop: -8 },
  promptInput:       { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, padding: Spacing.md, minHeight: 90, textAlignVertical: 'top' },

  imageBox:          { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  imagePreview:      { width: '100%', height: 200 },
  ocrBox:            { padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, gap: Spacing.xs },
  ocrLabel:          { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1, fontWeight: '600' },
  ocrText:           { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  removeImg:         { alignSelf: 'center', padding: Spacing.sm },
  removeImgText:     { color: Colors.error, fontSize: FontSize.sm },
  imgButtons:        { flexDirection: 'row', gap: Spacing.sm },
  imgBtn:            { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', padding: Spacing.lg, alignItems: 'center', gap: Spacing.xs },
  imgBtnIcon:        { fontSize: 28 },
  imgBtnText:        { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },

  errorBox:          { backgroundColor: Colors.error + '18', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.error + '44', padding: Spacing.md },
  errorText:         { color: Colors.error, fontSize: FontSize.sm, lineHeight: 18 },

  generateBtn:       { backgroundColor: Colors.accent, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  generateBtnText:   { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700', letterSpacing: 0.5 },

  resultCard:        { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.accent + '44', padding: Spacing.lg, gap: Spacing.md },
  resultLabel:       { fontSize: FontSize.xs, color: Colors.accentLight, letterSpacing: 1.5, fontWeight: '600' },
  resultText:        { fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 22 },
  bulletRow:         { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  bulletDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent, marginTop: 8 },
  bulletText:        { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, lineHeight: 22 },
  insertBtn:         { backgroundColor: Colors.accent, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.xs },
  insertBtnText:     { color: Colors.textPrimary, fontWeight: '700', fontSize: FontSize.md },
  regenHint:         { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textMuted },
  modeTabs:          { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 3, borderWidth: 1, borderColor: Colors.border },
  modeTab:           { flex: 1, paddingVertical: 8, borderRadius: Radius.sm - 2, alignItems: 'center' },
  modeTabActive:     { backgroundColor: Colors.accent },
  modeTabText:       { fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600' },
  modeTabTextActive: { color: Colors.textPrimary },

  overlay:           { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalBox:          { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.xl, width: '100%', maxWidth: 340, alignItems: 'center', gap: Spacing.md },
  modalIcon:         { fontSize: 40 },
  modalTitle:        { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  modalBody:         { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  modalPrimary:      { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, alignItems: 'center', width: '100%' },
  modalPrimaryText:  { color: Colors.textPrimary, fontWeight: '700', fontSize: FontSize.md },
  modalCancel:       { paddingVertical: Spacing.sm },
  modalCancelText:   { color: Colors.textMuted, fontSize: FontSize.sm },
});