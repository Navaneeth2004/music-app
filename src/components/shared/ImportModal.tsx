/**
 * ImportModal — unified import modal for books, chapters, and flashcards.
 *
 * mode='book'       — picks/pastes a book export JSON
 * mode='chapter'    — picks/pastes a chapter export JSON
 * mode='flashcards' — picks/pastes a flat [{front,back}] JSON array
 *                     also accepts a chapter_flashcards v2 export file
 *
 * CRASH FIX: file content is NEVER put into the TextInput. The TextInput
 * is paste-only and always stays small. Picked files are stored in a ref
 * and processed directly on Import — no render-blocking large string state.
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, Modal, Pressable, StyleSheet,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

// ─── Public types ──────────────────────────────────────────────

export interface ImportedCard {
  front: string;
  back:  string;
}

export type ImportMode = 'flashcards' | 'chapter' | 'book';

interface ImportModalProps {
  visible:  boolean;
  mode:     ImportMode;
  /** Called with parsed data. Throw to show an error. */
  onImport: (data: any) => Promise<void>;
  onCancel: () => void;
}

// ─── Labels per mode ───────────────────────────────────────────

const LABELS: Record<ImportMode, {
  title: string;
  subtitle: string;
  pasteHint: string;
  formatExample: string;
}> = {
  flashcards: {
    title:    'Import Flashcards',
    subtitle: 'Paste a JSON array or pick a flashcard export file',
    pasteHint:'Paste JSON array here…',
    formatExample: `[\n  { "front": "What is a major scale?", "back": "W W H W W W H" },\n  { "front": "What is a minor chord?", "back": "Root, minor 3rd, perfect 5th" }\n]`,
  },
  chapter: {
    title:    'Import Chapter',
    subtitle: 'Pick a chapter export file (.json)',
    pasteHint:'Or paste chapter JSON here…',
    formatExample: `{ "type": "chapter", "chapter": { "title": "...", ... } }`,
  },
  book: {
    title:    'Import Book',
    subtitle: 'Pick a book export file (.json)',
    pasteHint:'Or paste book JSON here…',
    formatExample: `{ "type": "book", "book": { "title": "...", "chapters": [...] } }`,
  },
};

// ─── Type mismatch messages ────────────────────────────────────

const MISMATCH: Record<ImportMode, Record<string, string>> = {
  book: {
    chapter:            'This is a chapter export, not a book.\n\nOpen the book you want to add it to, then use Import in the Chapters screen.',
    chapter_flashcards: 'This is a flashcard export, not a book.\n\nOpen the chapter and use Import in the flashcard list.',
    solo_deck:          'This is a solo deck export, not a book.\n\nGo to Solo Decks and use Import there.',
  },
  chapter: {
    book:               'This is a whole book export, not a single chapter.\n\nGo to Textbooks and use Import there.',
    chapter_flashcards: 'This is a flashcard export, not a chapter.\n\nOpen the chapter and use Import in the flashcard list.',
    solo_deck:          'This is a solo deck export, not a chapter.\n\nGo to Solo Decks and use Import there.',
  },
  flashcards: {
    book:               'This is a whole book export, not flashcards.\n\nGo to Textbooks and use Import there.',
    chapter:            'This is a chapter export, not flashcards.\n\nGo to the book\'s Chapters screen and use Import there.',
    solo_deck:          'This is a solo deck export.\n\nGo to Solo Decks and use Import there.',
  },
};

// ─── Component ────────────────────────────────────────────────

export const ImportModal: React.FC<ImportModalProps> = ({
  visible, mode, onImport, onCancel,
}) => {
  const labels = LABELS[mode];

  // Paste tab
  const [pasteText, setPasteText] = useState('');

  // File tab — store content in ref, NEVER in state (avoids rendering huge strings)
  const [pickedName, setPickedName]   = useState<string | null>(null);
  const [pickStatus, setPickStatus]   = useState<'idle' | 'reading' | 'ready' | 'error'>('idle');
  const fileContentRef                = useRef<string | null>(null);

  const [tab, setTab]           = useState<'file' | 'paste'>('file');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [showFmt, setShowFmt]   = useState(false);

  const reset = () => {
    setPasteText('');
    setPickedName(null);
    setPickStatus('idle');
    fileContentRef.current = null;
    setTab('file');
    setError(null);
    setLoading(false);
    setShowFmt(false);
  };

  const handleCancel = () => { reset(); onCancel(); };

  // ── Pick file ───────────────────────────────────────────────
  const handlePickFile = async () => {
    setError(null);
    setPickStatus('reading');
    setPickedName(null);
    fileContentRef.current = null;
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: '*/*' });
      if (result.canceled) { setPickStatus('idle'); return; }
      const asset = result.assets[0];
      setPickedName(asset.name);
      // Read into ref — not into state — to avoid crashing TextInput render
      const f = new File(asset.uri);
      fileContentRef.current = await f.text();
      setPickStatus('ready');
    } catch {
      setPickStatus('error');
      setError('Could not read the file. Make sure it is a .json file.');
    }
  };

  // ── Parse & validate ────────────────────────────────────────
  const parseRaw = (raw: string): any | null => {
    let parsed: any;
    try { parsed = JSON.parse(raw.trim()); }
    catch { setError('Invalid JSON — check the format.'); return null; }
    return parsed;
  };

  const validate = (parsed: any): any | null => {
    // Detect named export type
    const t: string | undefined =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed.type
        : undefined;

    // ── flashcards mode ──
    if (mode === 'flashcards') {
      // Accept chapter_flashcards v2 export — extract cards
      if (t === 'chapter_flashcards' && Array.isArray(parsed.cards)) {
        const cards: ImportedCard[] = parsed.cards
          .filter((c: any) => c.front?.trim() && c.back?.trim())
          .map((c: any) => ({ front: c.front.trim(), back: c.back.trim() }));
        if (!cards.length) { setError('No flashcards found in file.'); return null; }
        return cards;
      }
      // Mismatch
      if (t && MISMATCH.flashcards[t]) { setError(MISMATCH.flashcards[t]); return null; }
      // Flat array
      if (!Array.isArray(parsed)) { setError('JSON must be an array [ ... ] of { front, back } objects.'); return null; }
      const cards: ImportedCard[] = [];
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        if (!item?.front?.trim()) { setError(`Item ${i + 1} is missing a "front" value.`); return null; }
        if (!item?.back?.trim())  { setError(`Item ${i + 1} is missing a "back" value.`);  return null; }
        cards.push({ front: item.front.trim(), back: item.back.trim() });
      }
      if (!cards.length) { setError('No cards found.'); return null; }
      return cards;
    }

    // ── book mode ──
    if (mode === 'book') {
      if (t && t !== 'book' && MISMATCH.book[t]) { setError(MISMATCH.book[t]); return null; }
      if (t === 'book' && parsed.book) return parsed;
      if (Array.isArray(parsed.books) && parsed.books.length) return parsed;
      if (parsed.title) return parsed; // legacy bare book
      setError('No book data found in this file.');
      return null;
    }

    // ── chapter mode ──
    if (mode === 'chapter') {
      if (t && t !== 'chapter' && MISMATCH.chapter[t]) { setError(MISMATCH.chapter[t]); return null; }
      if (parsed.chapter) return parsed;
      if (Array.isArray(parsed.books) && parsed.books.length) return parsed;
      if (Array.isArray(parsed.chapters) && parsed.chapters.length) return parsed;
      setError('No chapter data found in this file.');
      return null;
    }

    return null;
  };

  // ── Import ──────────────────────────────────────────────────
  const handleImport = async () => {
    setError(null);
    const raw = tab === 'file' ? fileContentRef.current : pasteText;
    if (!raw?.trim()) { setError('Nothing to import — pick a file or paste JSON.'); return; }

    const parsed = parseRaw(raw);
    if (!parsed) return;
    const data = validate(parsed);
    if (!data) return;

    setLoading(true);
    try {
      await onImport(data);
      reset();
    } catch (e: any) {
      setError(e?.message ?? 'Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canImport = tab === 'file'
    ? pickStatus === 'ready'
    : pasteText.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.box}>
          <Text style={s.title}>{labels.title}</Text>
          <Text style={s.subtitle}>{labels.subtitle}</Text>

          {/* Tab bar */}
          <View style={s.tabRow}>
            <Pressable onPress={() => { setTab('file'); setError(null); }}
              style={[s.tab, tab === 'file' && s.tabActive]}>
              <Text style={[s.tabText, tab === 'file' && s.tabTextActive]}>📂 Pick File</Text>
            </Pressable>
            <Pressable onPress={() => { setTab('paste'); setError(null); }}
              style={[s.tab, tab === 'paste' && s.tabActive]}>
              <Text style={[s.tabText, tab === 'paste' && s.tabTextActive]}>📋 Paste JSON</Text>
            </Pressable>
          </View>

          {/* File tab */}
          {tab === 'file' && (
            <View style={s.fileArea}>
              <Pressable onPress={handlePickFile} style={s.fileBtn} disabled={pickStatus === 'reading'}>
                {pickStatus === 'reading'
                  ? <ActivityIndicator size="small" color={Colors.accent} />
                  : <Text style={s.fileBtnIcon}>📂</Text>
                }
                <Text style={[s.fileBtnText, pickStatus === 'ready' && { color: Colors.textPrimary }]} numberOfLines={1}>
                  {pickStatus === 'reading' ? 'Reading…'
                   : pickStatus === 'ready' ? pickedName!
                   : 'Choose a .json file…'}
                </Text>
                {pickStatus === 'ready' && (
                  <Text style={s.readyBadge}>✓ Ready</Text>
                )}
              </Pressable>
            </View>
          )}

          {/* Paste tab */}
          {tab === 'paste' && (
            <View>
              <Pressable onPress={() => setShowFmt(f => !f)} style={s.fmtToggle}>
                <Text style={s.fmtToggleText}>{showFmt ? '▲ Hide format' : '▼ Show expected format'}</Text>
              </Pressable>
              {showFmt && (
                <View style={s.fmtBox}>
                  <Text style={s.fmtLabel}>EXPECTED FORMAT</Text>
                  <ScrollView style={s.fmtScroll} nestedScrollEnabled>
                    <Text style={s.fmtCode}>{labels.formatExample}</Text>
                  </ScrollView>
                </View>
              )}
              <TextInput
                style={s.input}
                value={pasteText}
                onChangeText={setPasteText}
                placeholder={labels.pasteHint}
                placeholderTextColor={Colors.textMuted}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* Actions */}
          <View style={s.actions}>
            <Pressable onPress={handleCancel} style={s.cancelBtn} disabled={loading}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleImport}
              style={[s.importBtn, (!canImport || loading) && { opacity: 0.4 }]}
              disabled={!canImport || loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.importText}>Import</Text>
              }
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  box:           { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, width: '100%', maxWidth: 420, gap: Spacing.sm },
  title:         { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  subtitle:      { fontSize: FontSize.sm, color: Colors.textSecondary },
  tabRow:        { flexDirection: 'row', gap: Spacing.sm },
  tab:           { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.surfaceAlt },
  tabActive:     { borderColor: Colors.accent, backgroundColor: Colors.accent + '22' },
  tabText:       { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.accentLight },
  fileArea:      { gap: Spacing.xs },
  fileBtn:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, minHeight: 52 },
  fileBtnIcon:   { fontSize: 20 },
  fileBtnText:   { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm },
  readyBadge:    { fontSize: FontSize.xs, color: Colors.success, fontWeight: '700' },
  fmtToggle:     { alignSelf: 'flex-start', marginBottom: Spacing.xs },
  fmtToggleText: { color: Colors.accentLight, fontSize: FontSize.sm, fontWeight: '600' },
  fmtBox:        { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.xs },
  fmtLabel:      { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  fmtScroll:     { maxHeight: 80 },
  fmtCode:       { fontFamily: 'monospace' as any, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  input:         { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.sm, padding: Spacing.md, minHeight: 110, textAlignVertical: 'top', fontFamily: 'monospace' as any },
  errorBox:      { backgroundColor: Colors.error + '22', borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.error, padding: Spacing.sm },
  errorText:     { color: Colors.error, fontSize: FontSize.sm, lineHeight: 20 },
  actions:       { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  cancelBtn:     { flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText:    { color: Colors.textSecondary, fontWeight: '600' },
  importBtn:     { flex: 1, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center' },
  importText:    { color: Colors.textPrimary, fontWeight: '700' },
});