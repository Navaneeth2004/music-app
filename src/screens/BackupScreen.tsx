/**
 * BackupScreen.tsx
 *
 * Full backup/restore for the study app.
 *
 * Export format (v2):
 * {
 *   version: 2,
 *   exportedAt: string,
 *   favourites: { books: string[], decks: string[] },
 *   books: [...],
 *   soloDecks: [...],
 *   media: { "images/foo.jpg": "<base64>", "audio/bar.m4a": "<base64>" }
 * }
 *
 * Media is embedded as base64 inside the JSON.
 * v1 backups (text-only, no media) are still importable.
 *
 * Per-item exports (book / chapter / deck) also use v2 format with media
 * embedded — see BookBuilderScreen, ChapterBuilderScreen, SoloDeckBuilderScreen.
 *
 * Uses expo-file-system "next" API: { File, Paths, Directory }
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
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
import { getFavorites, clearFavorites } from '../utils/favorites';
import { embedMedia, restoreMediaMap, remapUri } from '../utils/mediaExport';
import { ExportNameModal, ExportPrompt } from '../components/shared/Exportnamemodal';

interface Props { onBack: () => void }
type Phase = 'idle' | 'exporting' | 'importing' | 'done';

export const BackupScreen: React.FC<Props> = ({ onBack }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [log, setLog]     = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exportPrompt, setExportPrompt] = useState<ExportPrompt | null>(null);
  const addLog = (msg: string) => setLog(prev => [...prev, msg]);
  const isRunning = phase === 'exporting' || phase === 'importing';

  // ── EXPORT ────────────────────────────────────────────────────
  const handleExport = async () => {
    setPhase('exporting'); setLog([]); setError(null);
    try {
      const media: Record<string, string> = {};

      // Favourites
      const favBooks = [...(await getFavorites('book'))];
      const favDecks = [...(await getFavorites('deck'))];
      addLog(`⭐ ${favBooks.length} pinned book(s), ${favDecks.length} pinned deck(s)`);

      // Books → chapters → flashcards
      addLog('Exporting books…');
      const books = await getBooks();
      const exportBooks = [];
      for (const book of books) {
        addLog(`  📚 ${book.title}`);
        const chapters = await getChapters(book.id);
        const exportChapters = [];
        for (const ch of chapters) {
          addLog(`     Ch ${ch.number}: ${ch.title}`);
          const cards = await getChapterFlashcards(ch.id);

          // Remap block media
          let blocks: any[] = [];
          try { blocks = ch.content ? JSON.parse(ch.content) : []; } catch {}
          const exportBlocks = await Promise.all(blocks.map(async (bl: any) => ({
            ...bl,
            imageFile: await embedMedia(bl.imageFile, 'images', media),
            audioFile: await embedMedia(bl.audioFile, 'audio',  media),
          })));

          const exportCards = await Promise.all(cards.map(async c => ({
            front: c.front, back: c.back,
            front_image: await embedMedia(c.front_image, 'images', media),
            back_image:  await embedMedia(c.back_image,  'images', media),
            front_audio: await embedMedia(c.front_audio, 'audio',  media),
            back_audio:  await embedMedia(c.back_audio,  'audio',  media),
          })));

          exportChapters.push({
            number: ch.number, title: ch.title, subtitle: ch.subtitle,
            content: exportBlocks.length ? JSON.stringify(exportBlocks) : null,
            flashcards: exportCards,
          });
        }
        exportBooks.push({
          title: book.title, author: book.author, icon: book.icon,
          color: book.color, order: book.order, chapters: exportChapters,
        });
      }

      // Solo decks
      addLog('Exporting solo decks…');
      const decks = await getSoloDecks();
      const exportDecks = [];
      for (const deck of decks) {
        addLog(`  💡 ${deck.title}`);
        const cards = await getSoloFlashcards(deck.id);
        const exportCards = await Promise.all(cards.map(async c => ({
          front: c.front, back: c.back,
          front_image: await embedMedia(c.front_image, 'images', media),
          back_image:  await embedMedia(c.back_image,  'images', media),
          front_audio: await embedMedia(c.front_audio, 'audio',  media),
          back_audio:  await embedMedia(c.back_audio,  'audio',  media),
        })));
        exportDecks.push({ title: deck.title, icon: deck.icon, color: deck.color, cards: exportCards });
      }

      const backup = {
        version: 2,
        exportedAt: new Date().toISOString(),
        favourites: { books: favBooks, decks: favDecks },
        books: exportBooks,
        soloDecks: exportDecks,
        media,
      };

      addLog(`✓ Done — ${books.length} book(s), ${decks.length} deck(s), ${Object.keys(media).length} media file(s)`);

      const ts = new Date().toISOString().slice(0, 10);
      const json = JSON.stringify(backup, null, 2);

      // Prompt for filename then share
      await new Promise<void>((resolve) => {
        setExportPrompt({
          suggested: `studyapp-backup-${ts}`,
          onConfirm: async (filename) => {
            const file = new File(Paths.cache, filename);
            await file.write(json);
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save Backup' });
            }
            resolve();
          },
        });
      });

      setPhase('done');
    } catch (e: any) { setError(e?.message ?? 'Export failed.'); setPhase('idle'); }
  };

  // ── IMPORT ────────────────────────────────────────────────────
  const handleImport = async () => {
    setPhase('importing'); setLog([]); setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) { setPhase('idle'); return; }

      addLog('Reading file…');
      const file = new File(result.assets[0].uri);
      const raw  = await file.text();
      let data: any;
      try { data = JSON.parse(raw); } catch { throw new Error('File is not valid JSON.'); }
      if (!data.version) throw new Error('Unrecognised backup format.');

      if (data.version === 1) {
        addLog('v1 backup (text only)…');
        await importV1(data);
        setPhase('done'); return;
      }
      if (data.version !== 2) throw new Error(`Unknown backup version: ${data.version}`);

      addLog('v2 backup (with media)…');

      // Restore media files and get URI map
      const mediaKeys = Object.keys(data.media ?? {});
      if (mediaKeys.length) addLog(`Restoring ${mediaKeys.length} media file(s)…`);
      const uriMap = await restoreMediaMap(data.media);

      // Clear existing favourites (IDs change on import — user re-pins manually)
      if (data.favourites) {
        await clearFavorites('book');
        await clearFavorites('deck');
        addLog('⭐ Favourites cleared — re-pin after import.');
      }

      // ── Route by backup type ──────────────────────────────────
      // Per-item exports (book / chapter / solo_deck / chapter_flashcards)
      // are handled first. Full backups fall through to the books/soloDecks arrays.

      if (data.type === 'book' && data.book) {
        addLog(`📚 Importing book: ${data.book.title}`);
        const book = await createBook({ title: data.book.title, author: data.book.author ?? '', icon: data.book.icon ?? '📚', color: data.book.color ?? '#7C6FF7', order: data.book.order ?? 0 });
        for (const ch of (data.book.chapters ?? [])) {
          addLog(`   Ch ${ch.number}: ${ch.title}`);
          const chapter = await createChapter({ book: book.id, number: ch.number, title: ch.title, subtitle: ch.subtitle ?? '' });
          if (ch.content) {
            let blocks: any[] = [];
            try { blocks = JSON.parse(ch.content); } catch {}
            const remapped = blocks.map((bl: any) => ({
              ...bl,
              imageFile: remapUri(bl.imageFile, 'images', uriMap),
              audioFile: remapUri(bl.audioFile, 'audio',  uriMap),
            }));
            await updateChapter(chapter.id, { content: JSON.stringify(remapped) } as any);
          }
          for (const card of (ch.flashcards ?? [])) {
            await createChapterFlashcard({
              chapter: chapter.id, front: card.front, back: card.back, order: 0,
              front_image: remapUri(card.front_image, 'images', uriMap),
              back_image:  remapUri(card.back_image,  'images', uriMap),
              front_audio: remapUri(card.front_audio, 'audio',  uriMap),
              back_audio:  remapUri(card.back_audio,  'audio',  uriMap),
            });
          }
        }
        addLog('✓ Book imported!');
        setPhase('done'); return;
      }

      if (data.type === 'chapter' && data.chapter) {
        addLog(`📖 Importing chapter: ${data.chapter.title}`);
        // Find or create the parent book by title match
        const existingBooks = await getBooks();
        let book = existingBooks.find((bk: any) => bk.title === data.book?.title);
        if (!book) {
          addLog(`   Book "${data.book?.title ?? 'Imported'}" not found — creating it`);
          book = await createBook({ title: data.book?.title ?? 'Imported', author: '', icon: data.book?.icon ?? '📚', color: data.book?.color ?? '#7C6FF7', order: 0 });
        } else {
          addLog(`   Adding to existing book: "${book.title}"`);
        }
        const existingChapters = await getChapters(book.id);
        const chapter = await createChapter({ book: book.id, number: existingChapters.length + 1, title: data.chapter.title, subtitle: data.chapter.subtitle ?? '' });
        if (data.chapter.content) {
          let blocks: any[] = [];
          try { blocks = JSON.parse(data.chapter.content); } catch {}
          const remapped = blocks.map((bl: any) => ({
            ...bl,
            imageFile: remapUri(bl.imageFile, 'images', uriMap),
            audioFile: remapUri(bl.audioFile, 'audio',  uriMap),
          }));
          await updateChapter(chapter.id, { content: JSON.stringify(remapped) } as any);
        }
        for (const card of (data.chapter.flashcards ?? [])) {
          await createChapterFlashcard({
            chapter: chapter.id, front: card.front, back: card.back, order: 0,
            front_image: remapUri(card.front_image, 'images', uriMap),
            back_image:  remapUri(card.back_image,  'images', uriMap),
            front_audio: remapUri(card.front_audio, 'audio',  uriMap),
            back_audio:  remapUri(card.back_audio,  'audio',  uriMap),
          });
        }
        addLog(`✓ Chapter imported with ${(data.chapter.flashcards ?? []).length} flashcard(s)!`);
        setPhase('done'); return;
      }

      if (data.type === 'solo_deck' && data.deck) {
        addLog(`💡 Importing deck: ${data.deck.title}`);
        const deck = await createSoloDeck({ title: data.deck.title, icon: data.deck.icon ?? '💡', color: data.deck.color ?? '#4A9EE0' });
        for (const card of (data.cards ?? [])) {
          await createSoloFlashcard({
            deck: deck.id, front: card.front, back: card.back, order: 0,
            front_image: remapUri(card.front_image, 'images', uriMap),
            back_image:  remapUri(card.back_image,  'images', uriMap),
            front_audio: remapUri(card.front_audio, 'audio',  uriMap),
            back_audio:  remapUri(card.back_audio,  'audio',  uriMap),
          });
        }
        addLog(`✓ Deck imported with ${(data.cards ?? []).length} card(s)!`);
        setPhase('done'); return;
      }

      if (data.type === 'chapter_flashcards') {
        throw new Error('Chapter flashcard files must be imported from inside the chapter editor, not here.');
      }

      // ── Full backup — books[] + soloDecks[] ──────────────────
      if (Array.isArray(data.books)) {
        for (const b of data.books) {
          addLog(`📚 ${b.title}`);
          const book = await createBook({ title: b.title, author: b.author ?? '', icon: b.icon ?? '📚', color: b.color ?? '#7C6FF7', order: b.order ?? 0 });
          for (const ch of (b.chapters ?? [])) {
            addLog(`   Ch ${ch.number}: ${ch.title}`);
            const chapter = await createChapter({ book: book.id, number: ch.number, title: ch.title, subtitle: ch.subtitle ?? '' });
            if (ch.content) {
              let blocks: any[] = [];
              try { blocks = JSON.parse(ch.content); } catch {}
              const remapped = blocks.map((bl: any) => ({
                ...bl,
                imageFile: remapUri(bl.imageFile, 'images', uriMap),
                audioFile: remapUri(bl.audioFile, 'audio',  uriMap),
              }));
              await updateChapter(chapter.id, { content: JSON.stringify(remapped) } as any);
            }
            for (const card of (ch.flashcards ?? [])) {
              await createChapterFlashcard({
                chapter: chapter.id, front: card.front, back: card.back, order: 0,
                front_image: remapUri(card.front_image, 'images', uriMap),
                back_image:  remapUri(card.back_image,  'images', uriMap),
                front_audio: remapUri(card.front_audio, 'audio',  uriMap),
                back_audio:  remapUri(card.back_audio,  'audio',  uriMap),
              });
            }
          }
        }
      }

      if (Array.isArray(data.soloDecks)) {
        for (const d of data.soloDecks) {
          addLog(`💡 ${d.title}`);
          const deck = await createSoloDeck({ title: d.title, icon: d.icon ?? '💡', color: d.color ?? '#4A9EE0' });
          for (const card of (d.cards ?? [])) {
            await createSoloFlashcard({
              deck: deck.id, front: card.front, back: card.back, order: 0,
              front_image: remapUri(card.front_image, 'images', uriMap),
              back_image:  remapUri(card.back_image,  'images', uriMap),
              front_audio: remapUri(card.front_audio, 'audio',  uriMap),
              back_audio:  remapUri(card.back_audio,  'audio',  uriMap),
            });
          }
        }
      }

      addLog('✓ Import complete! Re-pin your favourites if needed.');
      setPhase('done');
    } catch (e: any) { setError(e?.message ?? 'Import failed.'); setPhase('idle'); }
  };

  // ── v1 import (text-only legacy) ─────────────────────────────
  const importV1 = async (data: any) => {
    if (data.type === 'chapter' && data.chapter) {
      const existingBooks = await getBooks();
      let book = existingBooks.find((bk: any) => bk.title === data.book?.title);
      if (!book) book = await createBook({ title: data.book?.title ?? 'Imported', author: '', icon: data.book?.icon ?? '📚', color: data.book?.color ?? '#7C6FF7', order: 0 });
      const existingChapters = await getChapters(book.id);
      const chapter = await createChapter({ book: book.id, number: existingChapters.length + 1, title: data.chapter.title, subtitle: data.chapter.subtitle ?? '' });
      if (data.chapter.content) await updateChapter(chapter.id, { content: data.chapter.content } as any);
      for (const card of (data.chapter.flashcards ?? [])) {
        await createChapterFlashcard({ chapter: chapter.id, front: card.front, back: card.back, order: 0 });
      }
      return;
    }
    if (data.type === 'solo_deck' && data.deck) {
      const deck = await createSoloDeck({ title: data.deck.title, icon: data.deck.icon ?? '💡', color: data.deck.color ?? '#4A9EE0' });
      for (const card of (data.cards ?? [])) {
        await createSoloFlashcard({ deck: deck.id, front: card.front, back: card.back, order: 0 });
      }
      return;
    }
    if (Array.isArray(data.books)) {
      for (const b of data.books) {
        addLog(`📚 ${b.title}`);
        const book = await createBook({ title: b.title, author: b.author ?? '', icon: b.icon ?? '📚', color: b.color ?? '#7C6FF7', order: b.order ?? 0 });
        for (const ch of (b.chapters ?? [])) {
          const chapter = await createChapter({ book: book.id, number: ch.number, title: ch.title, subtitle: ch.subtitle ?? '' });
          if (ch.content) await updateChapter(chapter.id, { content: ch.content } as any);
          for (const card of (ch.flashcards ?? [])) {
            await createChapterFlashcard({ chapter: chapter.id, front: card.front, back: card.back, order: 0 });
          }
        }
      }
    }
    if (Array.isArray(data.soloDecks)) {
      for (const d of data.soloDecks) {
        const deck = await createSoloDeck({ title: d.title, icon: d.icon ?? '💡', color: d.color ?? '#4A9EE0' });
        for (const card of (d.cards ?? [])) {
          await createSoloFlashcard({ deck: deck.id, front: card.front, back: card.back, order: 0 });
        }
      }
    }
  };

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={onBack} style={st.back}>
          <Text style={st.backText}>← Settings</Text>
        </Pressable>
        <Text style={st.title}>Backup & Restore</Text>
        <Text style={st.subtitle}>Export all content and media, or restore a previous backup.</Text>

        <View style={st.infoBox}>
          <Text style={st.infoTitle}>📦 Export includes</Text>
          <Text style={st.infoItem}>• All books, chapters, and block content</Text>
          <Text style={st.infoItem}>• All flashcards with images and audio</Text>
          <Text style={st.infoItem}>• All solo decks with images and audio</Text>
          <Text style={st.infoItem}>• ⭐ Your pinned (favourited) books and decks</Text>
          <Text style={st.infoNote}>Media is embedded in the file. Large collections may produce big files. Re-pin favourites after importing — IDs change on import.</Text>
        </View>

        <Text style={st.sectionLabel}>EXPORT</Text>
        <Pressable onPress={handleExport} disabled={isRunning}
          style={[st.actionBtn, st.exportBtn, isRunning && { opacity: 0.5 }]}>
          <Text style={st.actionIcon}>⬆️</Text>
          <View style={st.actionMeta}>
            <Text style={st.actionTitle}>Export Full Backup</Text>
            <Text style={st.actionDesc}>Everything including images and audio</Text>
          </View>
        </Pressable>

        <Text style={st.sectionLabel}>IMPORT</Text>
        <Pressable onPress={handleImport} disabled={isRunning}
          style={[st.actionBtn, st.importBtn, isRunning && { opacity: 0.5 }]}>
          <Text style={st.actionIcon}>⬇️</Text>
          <View style={st.actionMeta}>
            <Text style={st.actionTitle}>Import from File</Text>
            <Text style={st.actionDesc}>Pick a .json backup (v1 or v2)</Text>
          </View>
        </Pressable>

        {log.length > 0 && (
          <View style={st.logBox}>
            {isRunning && <ActivityIndicator color={Colors.accent} style={{ marginBottom: Spacing.sm }} />}
            {log.map((line, i) => (
              <Text key={i} style={[st.logLine, line.startsWith('✓') && st.logSuccess]}>{line}</Text>
            ))}
          </View>
        )}
        {error && <View style={st.errBox}><Text style={st.errText}>⚠️ {error}</Text></View>}
      </ScrollView>
      <ExportNameModal prompt={exportPrompt} onClose={() => setExportPrompt(null)} />
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  content:     { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  back:        { marginBottom: Spacing.lg },
  backText:    { color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '500' },
  title:       { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: Spacing.xs },
  subtitle:    { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xl },
  infoBox:     { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.lg, gap: 5 },
  infoTitle:   { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xs },
  infoItem:    { fontSize: FontSize.sm, color: Colors.textSecondary },
  infoNote:    { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.sm, lineHeight: 16 },
  sectionLabel:{ fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1.5, fontWeight: '600', marginBottom: Spacing.sm, marginTop: Spacing.md },
  actionBtn:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm },
  exportBtn:   { backgroundColor: Colors.accent + '18', borderColor: Colors.accent + '55' },
  importBtn:   { backgroundColor: Colors.success + '18', borderColor: Colors.success + '55' },
  actionIcon:  { fontSize: 24 },
  actionMeta:  { flex: 1 },
  actionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  actionDesc:  { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  logBox:      { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginTop: Spacing.lg },
  logLine:     { fontSize: FontSize.xs, color: Colors.textSecondary, fontFamily: 'monospace' as any, lineHeight: 18 },
  logSuccess:  { color: Colors.success },
  errBox:      { backgroundColor: Colors.error + '22', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.error, padding: Spacing.md, marginTop: Spacing.md },
  errText:     { color: Colors.error, fontSize: FontSize.sm },
});