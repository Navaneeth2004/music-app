import React, { useState } from 'react';
import {
  View, Text, Modal, Pressable, StyleSheet,
  TextInput, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export interface ImportedCard {
  front: string;
  back: string;
}

interface FlashcardImportModalProps {
  visible: boolean;
  onImport: (cards: ImportedCard[]) => Promise<void>;
  onCancel: () => void;
}

const FORMAT_EXAMPLE = `[
  { "front": "What is a major scale?", "back": "W W H W W W H" },
  { "front": "What is a minor chord?", "back": "Root, minor 3rd, perfect 5th" }
]`;

type Mode = 'paste' | 'file';

export const FlashcardImportModal: React.FC<FlashcardImportModalProps> = ({
  visible, onImport, onCancel,
}) => {
  const [mode, setMode] = useState<Mode>('paste');
  const [json, setJson] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFormat, setShowFormat] = useState(false);

  const reset = () => {
    setJson(''); setFileName(null); setError(null);
    setLoading(false); setShowFormat(false); setMode('paste');
  };

  const handleCancel = () => { reset(); onCancel(); };

  const handlePickFile = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: '*/*',
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setFileName(asset.name);
      let text: string;
      if (Platform.OS === 'web') {
        const resp = await fetch(asset.uri);
        text = await resp.text();
      } else {
        text = await FileSystem.readAsStringAsync(asset.uri);
      }
      setJson(text);
    } catch {
      setError('Could not read file. Make sure it is a .json file.');
    }
  };

  const parseAndValidate = (raw: string): ImportedCard[] | null => {
    let parsed: any;
    try { parsed = JSON.parse(raw.trim()); }
    catch { setError('Invalid JSON. Check the format example for guidance.'); return null; }
    if (!Array.isArray(parsed)) {
      setError('JSON must be an array [ ... ] of flashcard objects.'); return null;
    }
    const cards: ImportedCard[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (typeof item !== 'object' || item === null) {
        setError(`Item ${i + 1} is not an object.`); return null;
      }
      if (typeof item.front !== 'string' || !item.front.trim()) {
        setError(`Item ${i + 1} is missing a "front" string.`); return null;
      }
      if (typeof item.back !== 'string' || !item.back.trim()) {
        setError(`Item ${i + 1} is missing a "back" string.`); return null;
      }
      cards.push({ front: item.front.trim(), back: item.back.trim() });
    }
    if (cards.length === 0) { setError('No cards found in JSON.'); return null; }
    return cards;
  };

  const handleImport = async () => {
    setError(null);
    const cards = parseAndValidate(json);
    if (!cards) return;
    setLoading(true);
    try { await onImport(cards); reset(); }
    catch { setError('Import failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.box}>
          <Text style={s.title}>Import Flashcards</Text>
          <Text style={s.subtitle}>Load from a JSON file or paste JSON directly</Text>

          <View style={s.modeRow}>
            <Pressable onPress={() => { setMode('paste'); setFileName(null); }}
              style={[s.modeBtn, mode === 'paste' && s.modeBtnActive]}>
              <Text style={[s.modeBtnText, mode === 'paste' && s.modeBtnTextActive]}>📋 Paste JSON</Text>
            </Pressable>
            <Pressable onPress={() => setMode('file')}
              style={[s.modeBtn, mode === 'file' && s.modeBtnActive]}>
              <Text style={[s.modeBtnText, mode === 'file' && s.modeBtnTextActive]}>📂 Pick File</Text>
            </Pressable>
          </View>

          {mode === 'file' && (
            <Pressable onPress={handlePickFile} style={s.fileBtn}>
              <Text style={s.fileBtnIcon}>📂</Text>
              <Text style={s.fileBtnText} numberOfLines={1}>
                {fileName ?? 'Choose a JSON file…'}
              </Text>
            </Pressable>
          )}

          <Pressable onPress={() => setShowFormat(f => !f)} style={s.formatToggle}>
            <Text style={s.formatToggleText}>{showFormat ? '▲ Hide format' : '▼ Show expected format'}</Text>
          </Pressable>

          {showFormat && (
            <View style={s.formatBox}>
              <Text style={s.formatLabel}>EXPECTED JSON FORMAT</Text>
              <ScrollView style={s.formatScroll} nestedScrollEnabled>
                <Text style={s.formatCode}>{FORMAT_EXAMPLE}</Text>
              </ScrollView>
              <Text style={s.formatNote}>
                {'💡 Ask an AI: "Give me flashcards for [topic] as JSON: [{ "front": "...", "back": "..." }]"'}
              </Text>
            </View>
          )}

          <TextInput
            style={s.input}
            value={json}
            onChangeText={v => { setJson(v); if (mode === 'file') setFileName(null); }}
            placeholder={mode === 'file' ? 'File content will appear here…' : 'Paste JSON here…'}
            placeholderTextColor={Colors.textMuted}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
          />

          {error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <View style={s.actions}>
            <Pressable onPress={handleCancel} style={s.cancelBtn} disabled={loading}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleImport}
              style={[s.importBtn, (!json.trim() || loading) && { opacity: 0.4 }]}
              disabled={!json.trim() || loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.importText}>Import</Text>
              }
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  box: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, width: '100%', maxWidth: 420, gap: Spacing.sm },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary },
  modeRow: { flexDirection: 'row', gap: Spacing.sm },
  modeBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.surfaceAlt },
  modeBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '22' },
  modeBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  modeBtnTextActive: { color: Colors.accentLight },
  fileBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  fileBtnIcon: { fontSize: 20 },
  fileBtnText: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm },
  formatToggle: { alignSelf: 'flex-start' },
  formatToggleText: { color: Colors.accentLight, fontSize: FontSize.sm, fontWeight: '600' },
  formatBox: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.sm },
  formatLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600', letterSpacing: 1 },
  formatScroll: { maxHeight: 100 },
  formatCode: { fontFamily: 'monospace' as any, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  formatNote: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16 },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.sm, padding: Spacing.md, minHeight: 110, textAlignVertical: 'top', fontFamily: 'monospace' as any },
  errorBox: { backgroundColor: Colors.error + '22', borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.error, padding: Spacing.sm },
  errorText: { color: Colors.error, fontSize: FontSize.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  cancelBtn: { flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  importBtn: { flex: 1, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center' },
  importText: { color: Colors.textPrimary, fontWeight: '700' },
});