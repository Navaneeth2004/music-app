import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, Modal, TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';
import {
  getBooks, getChapters, getChapterFlashcards,
  getSoloDecks, getSoloFlashcards,
  createBook, createChapter, updateChapter,
  createSoloDeck, createSoloFlashcard,
  createChapterFlashcard,
} from '../api/content';

// ─── Backup format ─────────────────────────────────────────────
// {
//   "version": 1,
//   "exportedAt": "2025-01-01T00:00:00Z",
//   "books": [
//     {
//       "title": "...", "author": "...", "icon": "📚", "color": "#7C6FF7",
//       "chapters": [
//         {
//           "number": 1, "title": "...", "subtitle": "...",
//           "content": "[...]",   ← raw content JSON string
//           "flashcards": [
//             { "front": "...", "back": "..." }
//           ]
//         }
//       ]
//     }
//   ],
//   "soloDecks": [
//     {
//       "title": "...", "icon": "💡", "color": "#4A9EE0",
//       "cards": [
//         { "front": "...", "back": "..." }
//       ]
//     }
//   ]
// }

interface Props {
  onBack: () => void;
}

type Phase = 'idle' | 'exporting' | 'importing' | 'done';

export const BackupScreen: React.FC<Props> = ({ onBack }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importJson, setImportJson] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  // ── EXPORT ────────────────────────────────────────────────────
  const handleExport = async () => {
    setPhase('exporting');
    setLog([]);
    setError(null);
    try {
      addLog('Fetching books…');
      const books = await getBooks();
      const exportBooks = [];

      for (const book of books) {
        addLog(`  Book: ${book.title}`);
        const chapters = await getChapters(book.id);
        const exportChapters = [];
        for (const ch of chapters) {
          addLog(`    Chapter ${ch.number}: ${ch.title}`);
          const cards = await getChapterFlashcards(ch.id);
          exportChapters.push({
            number: ch.number,
            title: ch.title,
            subtitle: ch.subtitle,
            content: ch.content ?? null,
            flashcards: cards.map(c => ({ front: c.front, back: c.back })),
          });
        }
        exportBooks.push({
          title: book.title,
          author: book.author,
          icon: book.icon,
          color: book.color,
          order: book.order,
          chapters: exportChapters,
        });
      }

      addLog('Fetching solo decks…');
      const decks = await getSoloDecks();
      const exportDecks = [];
      for (const deck of decks) {
        addLog(`  Deck: ${deck.title}`);
        const cards = await getSoloFlashcards(deck.id);
        exportDecks.push({
          title: deck.title,
          icon: deck.icon,
          color: deck.color,
          cards: cards.map(c => ({ front: c.front, back: c.back })),
        });
      }

      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        books: exportBooks,
        soloDecks: exportDecks,
      };

      const json = JSON.stringify(backup, null, 2);
      const filename = `study-backup-${new Date().toISOString().slice(0, 10)}.json`;

      if (Platform.OS === 'web') {
        // Web: trigger download
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      } else {
        // Native: write to cache then share
        const file = new File(Paths.cache, filename);
        await file.write(json);
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save Backup' });
      }

      addLog(`✓ Done — ${exportBooks.length} book(s), ${exportDecks.length} solo deck(s)`);
      setPhase('done');
    } catch (e: any) {
      setError(e?.message ?? 'Export failed.');
      setPhase('idle');
    }
  };

  // ── IMPORT from file (native) ─────────────────────────────────
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = new File(result.assets[0].uri);
      const content = await file.text();
      setImportJson(content);
      setShowImportModal(true);
    } catch (e: any) {
      setError('Could not read file: ' + (e?.message ?? ''));
    }
  };

  // ── IMPORT (paste JSON or from file) ─────────────────────────
  const handleImport = async () => {
    setShowImportModal(false);
    setPhase('importing');
    setLog([]);
    setError(null);
    try {
      let data: any;
      try { data = JSON.parse(importJson); }
      catch { throw new Error('Invalid JSON. Check the file format.'); }

      if (!data.version || data.version !== 1) throw new Error('Unrecognised backup format. Expected version 1.');

      // ── Per-chapter export ──────────────────────────────────────
      if (data.type === 'chapter') {
        const b = data.book;
        const ch = data.chapter;
        addLog(`Importing chapter: ${ch.title}`);
        // Find or create a book with matching title
        const existingBooks = await getBooks();
        let book = existingBooks.find((bk: any) => bk.title === b.title);
        if (!book) {
          addLog(`  Creating book: ${b.title}`);
          book = await createBook({ title: b.title, author: '', icon: b.icon ?? '📚', color: b.color ?? '#7C6FF7', order: 0 });
        }
        const existingChapters = await getChapters(book.id);
        const chapterNum = existingChapters.length + 1;
        const chapter = await createChapter({
          book: book.id, number: chapterNum,
          title: ch.title, subtitle: ch.subtitle ?? '',
        });
        if (ch.content) await updateChapter(chapter.id, { content: ch.content } as any);
        for (const card of (ch.flashcards ?? [])) {
          await createChapterFlashcard({ chapter: chapter.id, front: card.front, back: card.back, order: 0 });
        }
        addLog(`✓ Chapter imported with ${(ch.flashcards ?? []).length} flashcard(s)`);
        setImportJson('');
        setPhase('done');
        return;
      }

      // ── Per-deck export ─────────────────────────────────────────
      if (data.type === 'solo_deck') {
        const d = data.deck;
        addLog(`Importing deck: ${d.title}`);
        const deck = await createSoloDeck({ title: d.title, icon: d.icon ?? '💡', color: d.color ?? '#4A9EE0' });
        for (const card of (data.cards ?? [])) {
          await createSoloFlashcard({ deck: deck.id, front: card.front, back: card.back, order: 0 });
        }
        addLog(`✓ Deck imported with ${(data.cards ?? []).length} card(s)`);
        setImportJson('');
        setPhase('done');
        return;
      }

      // ── Per-chapter flashcards-only export ──────────────────────
      if (data.type === 'chapter_flashcards') {
        addLog(`Importing flashcards for: ${data.chapter?.title ?? 'unknown chapter'}`);
        addLog('Note: these cards cannot be auto-assigned to a chapter — use the Import button inside a chapter instead.');
        throw new Error('To import chapter flashcards, open the chapter in the admin panel and use the ⬇ Import button there.');
      }

      // Import books + chapters + chapter flashcards
      if (Array.isArray(data.books)) {
        for (const b of data.books) {
          addLog(`Importing book: ${b.title}`);
          const book = await createBook({ title: b.title, author: b.author ?? '', icon: b.icon ?? '📚', color: b.color ?? '#7C6FF7', order: b.order ?? 0 });
          for (const ch of (b.chapters ?? [])) {
            addLog(`  Chapter ${ch.number}: ${ch.title}`);
            const chapter = await createChapter({
              book: book.id, number: ch.number,
              title: ch.title, subtitle: ch.subtitle ?? '',
            });
            if (ch.content) {
              await updateChapter(chapter.id, { content: ch.content } as any);
            }
            for (const card of (ch.flashcards ?? [])) {
              await createChapterFlashcard({ chapter: chapter.id, front: card.front, back: card.back, order: 0 });
            }
          }
        }
      }

      // Import solo decks + cards
      if (Array.isArray(data.soloDecks)) {
        for (const d of data.soloDecks) {
          addLog(`Importing deck: ${d.title}`);
          const deck = await createSoloDeck({ title: d.title, icon: d.icon ?? '💡', color: d.color ?? '#4A9EE0' });
          for (const card of (d.cards ?? [])) {
            await createSoloFlashcard({ deck: deck.id, front: card.front, back: card.back, order: 0 });
          }
        }
      }

      addLog('✓ Import complete!');
      setImportJson('');
      setPhase('done');
    } catch (e: any) {
      setError(e?.message ?? 'Import failed.');
      setPhase('idle');
    }
  };

  const isRunning = phase === 'exporting' || phase === 'importing';

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={onBack} style={s.back}>
          <Text style={s.backText}>← Settings</Text>
        </Pressable>
        <Text style={s.title}>Backup & Restore</Text>
        <Text style={s.subtitle}>Export all your content to a JSON file, or import a previous backup.</Text>

        {/* Format info */}
        <View style={s.infoBox}>
          <Text style={s.infoTitle}>📄 Backup includes</Text>
          <Text style={s.infoItem}>• All books, chapters, and chapter content (blocks)</Text>
          <Text style={s.infoItem}>• All chapter flashcards (text only — images not included)</Text>
          <Text style={s.infoItem}>• All solo decks and their flashcards</Text>
          <Text style={s.infoNote}>Note: images in chapter blocks and flashcards are stored on PocketBase and are not included in the JSON backup. Text content is fully backed up.</Text>
        </View>

        {/* Export */}
        <Text style={s.sectionLabel}>EXPORT</Text>
        <Pressable
          onPress={handleExport}
          disabled={isRunning}
          style={[s.actionBtn, s.exportBtn, isRunning && { opacity: 0.5 }]}
        >
          <Text style={s.actionIcon}>⬆️</Text>
          <View style={s.actionMeta}>
            <Text style={s.actionTitle}>Export Backup</Text>
            <Text style={s.actionDesc}>Download all content as a JSON file</Text>
          </View>
        </Pressable>

        {/* Import */}
        <Text style={s.sectionLabel}>IMPORT</Text>
        {Platform.OS !== 'web' && (
          <Pressable
            onPress={handlePickFile}
            disabled={isRunning}
            style={[s.actionBtn, s.importFileBtn, isRunning && { opacity: 0.5 }]}
          >
            <Text style={s.actionIcon}>📂</Text>
            <View style={s.actionMeta}>
              <Text style={s.actionTitle}>Import from File</Text>
              <Text style={s.actionDesc}>Pick a .json backup file from your device</Text>
            </View>
          </Pressable>
        )}
        <Pressable
          onPress={() => setShowImportModal(true)}
          disabled={isRunning}
          style={[s.actionBtn, s.importPasteBtn, isRunning && { opacity: 0.5 }]}
        >
          <Text style={s.actionIcon}>📋</Text>
          <View style={s.actionMeta}>
            <Text style={s.actionTitle}>Paste JSON</Text>
            <Text style={s.actionDesc}>Manually paste a backup JSON string</Text>
          </View>
        </Pressable>

        {/* Log */}
        {log.length > 0 && (
          <View style={s.logBox}>
            {isRunning && <ActivityIndicator color={Colors.accent} style={{ marginBottom: Spacing.sm }} />}
            {log.map((line, i) => (
              <Text key={i} style={[s.logLine, line.startsWith('✓') && s.logSuccess]}>{line}</Text>
            ))}
          </View>
        )}

        {error && (
          <View style={s.errBox}>
            <Text style={s.errText}>⚠️ {error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Import paste modal */}
      <Modal visible={showImportModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Import Backup</Text>
            <Text style={s.modalSub}>Paste your backup JSON below. This will ADD content to your existing data (merge, no deletion).</Text>
            <TextInput
              style={s.jsonInput}
              value={importJson}
              onChangeText={setImportJson}
              placeholder={'Paste JSON here…'}
              placeholderTextColor={Colors.textMuted}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={s.modalActions}>
              <Pressable onPress={() => { setShowImportModal(false); setImportJson(''); }} style={s.modalCancel}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleImport}
                style={[s.modalImport, !importJson.trim() && { opacity: 0.4 }]}
                disabled={!importJson.trim()}
              >
                <Text style={s.modalImportText}>Import</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  back: { marginBottom: Spacing.lg },
  backText: { color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '500' },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: Spacing.xs },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xl },
  infoBox: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.lg, gap: 4 },
  infoTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xs },
  infoItem: { fontSize: FontSize.sm, color: Colors.textSecondary },
  infoNote: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.sm, lineHeight: 16 },
  sectionLabel: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1.5, fontWeight: '600', marginBottom: Spacing.sm, marginTop: Spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm },
  exportBtn: { backgroundColor: Colors.accent + '18', borderColor: Colors.accent + '55' },
  importFileBtn: { backgroundColor: Colors.success + '18', borderColor: Colors.success + '55' },
  importPasteBtn: { backgroundColor: Colors.surfaceAlt, borderColor: Colors.border },
  actionIcon: { fontSize: 24 },
  actionMeta: { flex: 1 },
  actionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  actionDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  logBox: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginTop: Spacing.lg },
  logLine: { fontSize: FontSize.xs, color: Colors.textSecondary, fontFamily: 'monospace' as any, lineHeight: 18 },
  logSuccess: { color: Colors.success },
  errBox: { backgroundColor: Colors.error + '22', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.error, padding: Spacing.md, marginTop: Spacing.md },
  errText: { color: Colors.error, fontSize: FontSize.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalBox: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, width: '100%', maxWidth: 440, gap: Spacing.sm },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  modalSub: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  jsonInput: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.xs, padding: Spacing.md, minHeight: 140, textAlignVertical: 'top', fontFamily: 'monospace' as any },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  modalCancel: { flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  modalCancelText: { color: Colors.textSecondary, fontWeight: '600' },
  modalImport: { flex: 1, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center' },
  modalImportText: { color: Colors.textPrimary, fontWeight: '700' },
});