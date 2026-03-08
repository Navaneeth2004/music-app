import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../../constants/theme';
import { Book, Chapter, ChapterFlashcard as Flashcard } from '../../../types';
import { getChapterFlashcards as getFlashcards, deleteChapterFlashcard as deleteFlashcard, createChapterFlashcard } from '../../../api/content';
import { ConfirmModal }          from '../../../components/shared/ConfirmModal';
import { ImportModal } from '../../../components/shared/ImportModal';
import { ImageLightbox }         from '../../../components/shared/ImageLightbox';
import { SwipeableRow }          from '../../../components/shared/SwipeableRow';
import { CardListItem }          from '../../../components/shared/CardListItem';
import { CardListHeader, SelectionBar } from '../../../components/shared/CardListHeader';
import { AudioPlayer }           from '../../../components/shared/AudioPlayer';
import { FlashcardFormScreen }   from './FlashcardFormScreen';
import { exportJson }            from '../../../utils/exportJson';
import { getHidden, toggleHidden } from '../../../utils/hidden';
import { embedMedia }            from '../../../utils/mediaExport';
import { ExportNameModal, ExportPrompt } from '../../../components/shared/Exportnamemodal';

const BACK_COLOR = Colors.accent;

type View_ = 'list' | 'preview' | 'create' | 'edit';
interface Props { chapter: Chapter; book: Book; onBack: () => void; }

export const FlashcardBuilderScreen: React.FC<Props> = ({ chapter, book, onBack }) => {
  const [cards, setCards]               = useState<Flashcard[]>([]);
  const [loading, setLoading]           = useState(true);
  const [view, setView]                 = useState<View_>('list');
  const [previewCard, setPreviewCard]   = useState<Flashcard | null>(null);
  const [editCard, setEditCard]         = useState<Flashcard | null>(null);
  const [flipped, setFlipped]           = useState(false);
  const [lightboxUri, setLightboxUri]   = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Flashcard | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [showImport, setShowImport]     = useState(false);
  const [selecting, setSelecting]       = useState(false);
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [exportPrompt, setExportPrompt] = useState<ExportPrompt | null>(null);
  const [hidden, setHidden]             = useState<Set<string>>(new Set());
  const load = useCallback(async () => {
    setLoading(true);
    try { const [cards, h] = await Promise.all([getFlashcards(chapter.id), getHidden('flashcard')]); setCards(cards); setHidden(h); }
    catch { setError('Failed to load.'); }
    finally { setLoading(false); }
  }, [chapter.id]);
  useEffect(() => { load(); }, [load]);

  const handleToggleHide = async (id: string) => {
    await toggleHidden('flashcard', id);
    setHidden(await getHidden('flashcard'));
  };

  const cancelSelect = () => { setSelecting(false); setSelected(new Set()); };
  const toggleSelect = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const allSelected = selected.size === cards.length && cards.length > 0;

  const handleImport = async (imported: { front: string; back: string }[]) => {
    for (const card of imported) {
      await createChapterFlashcard({ chapter: chapter.id, front: card.front, back: card.back, order: 0 });
    }
    await load();
  };

  const handleExportSelected = async () => {
    const chosen = cards.filter(c => selected.has(c.id));
    if (!chosen.length) return;
    try {
      const media: Record<string, string> = {};
      const exportCards = await Promise.all(chosen.map(async c => ({
        front: c.front, back: c.back,
        front_image: await embedMedia(c.front_image, 'images', media),
        back_image:  await embedMedia(c.back_image,  'images', media),
        front_audio: await embedMedia(c.front_audio, 'audio',  media),
        back_audio:  await embedMedia(c.back_audio,  'audio',  media),
      })));
      const payload = {
        version: 2, exportedAt: new Date().toISOString(), type: 'chapter_flashcards',
        chapter: { title: chapter.title, number: chapter.number },
        cards: exportCards,
        media,
      };
      const slug = chapter.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      await new Promise<void>((resolve) => {
        setExportPrompt({
          suggested: `flashcards-${slug}`,
          onConfirm: async (filename) => { await exportJson(payload, filename); resolve(); },
        });
      });
      cancelSelect();
    } catch { Alert.alert('Export failed', 'Could not export flashcards.'); }
  };

  // With SQLite, file fields store the full local URI directly
  const getUrl = (card: Flashcard, field: string): string | null => {
    const f = (card as any)[field];
    return f ? String(f) : null;
  };

  if (view === 'create' || view === 'edit') {
    return (
      <FlashcardFormScreen
        chapter={chapter} book={book}
        editCard={view === 'edit' ? editCard : null}
        onSave={() => { setEditCard(null); setView('list'); load(); }}
        onBack={() => { setEditCard(null); setView(previewCard ? 'preview' : 'list'); }}
      />
    );
  }

  if (view === 'preview' && previewCard) {
    const shownImg   = flipped ? getUrl(previewCard, 'back_image')  : getUrl(previewCard, 'front_image');
    const shownAudio = flipped ? getUrl(previewCard, 'back_audio')  : getUrl(previewCard, 'front_audio');
    const sideColor  = flipped ? BACK_COLOR : book.color;
    return (
      <SafeAreaView style={s.safe}>
        <ImageLightbox uri={lightboxUri} onClose={() => setLightboxUri(null)} />
        <View style={s.previewHeader}>
          <Pressable onPress={() => { setView('list'); setFlipped(false); }}>
            <Text style={s.backText}>← Cards</Text>
          </Pressable>
          <Pressable onPress={() => { setEditCard(previewCard); setView('edit'); }} style={s.editBtn}>
            <Text style={s.editBtnText}>Edit</Text>
          </Pressable>
        </View>
        <View style={s.previewContainer}>
          <Pressable onPress={() => setFlipped(f => !f)}
            style={[s.flashcard, { borderColor: sideColor + '55', backgroundColor: sideColor + '08' }]}>
            <View style={[s.sidePill, { backgroundColor: sideColor + '22' }]}>
              <Text style={[s.sideLabel, { color: sideColor }]}>{flipped ? 'BACK' : 'FRONT'}</Text>
            </View>
            {shownImg
              ? <Pressable onPress={() => setLightboxUri(shownImg!)} hitSlop={4} style={{ alignSelf: 'stretch' }}>
                  <Image source={{ uri: shownImg! }} style={s.flashcardImg} resizeMode="contain" />
                </Pressable>
              : null}
            <Text style={s.flashcardText}>{flipped ? (previewCard.back || '—') : (previewCard.front || '—')}</Text>
            {shownAudio && <View style={{ alignSelf: 'stretch', marginTop: 4 }}><AudioPlayer uri={shownAudio} accentColor={sideColor} /></View>}
            <Text style={s.tapHint}>tap to flip{shownImg ? ' · tap image to zoom' : ''}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <CardListHeader
        accentColor={book.color}
        badge={
          <View style={[s.chPill, { backgroundColor: book.color + '30' }]}>
            <Text style={[s.chPillText, { color: book.color }]}>CH {chapter.number}</Text>
          </View>
        }
        title={chapter.title}
        onBack={selecting ? cancelSelect : onBack}
        selecting={selecting}
      />
      {selecting && (
        <SelectionBar
          count={selected.size} total={cards.length}
          accentColor={book.color} allSelected={allSelected}
          onSelectAll={() => setSelected(allSelected ? new Set() : new Set(cards.map(c => c.id)))}
          onExport={handleExportSelected}
        />
      )}

      <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
        {error && <View style={s.err}><Text style={s.errText}>{error}</Text></View>}
        {!loading && !selecting && (
          <View style={s.countRow}>
            <Text style={s.countText}>{cards.length} flashcard{cards.length !== 1 ? 's' : ''}</Text>
            <Text style={s.hintText}>long-press to export  ·  swipe → hide  ·  swipe ← delete</Text>
          </View>
        )}
        {loading
          ? <ActivityIndicator color={book.color} style={{ marginTop: Spacing.xl }} />
          : cards.map((card, i) => {
              const fUrl     = getUrl(card, 'front_image');
              const hasAudio = !!(card as any).front_audio || !!(card as any).back_audio;
              return (
                <SwipeableRow key={card.id} onDelete={() => setDeleteTarget(card)} onHide={() => handleToggleHide(card.id)} isHidden={hidden.has(card.id)}>
                  <CardListItem
                    index={i} front={card.front} back={card.back}
                    thumbUri={fUrl} hasAudio={hasAudio}
                    accentColor={book.color}
                    selecting={selecting} selected={selected.has(card.id)}
                    isHidden={hidden.has(card.id)}
                    onPress={() => {
                      if (selecting) { toggleSelect(card.id); }
                      else { setPreviewCard(card); setFlipped(false); setView('preview'); }
                    }}
                    onLongPress={() => { if (!selecting) { setSelecting(true); setSelected(new Set([card.id])); } }}
                  />
                </SwipeableRow>
              );
            })
        }
        {!loading && (
          <View style={s.actions}>
            <Pressable onPress={() => setView('create')} style={s.addBtn}>
              <Text style={s.addBtnText}>+ Add Flashcard</Text>
            </Pressable>
            <Pressable onPress={() => setShowImport(true)} style={s.importBtn}>
              <Text style={s.importBtnText}>⬇ Import</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <ImportModal visible={showImport} mode="flashcards" onImport={handleImport} onCancel={() => setShowImport(false)} />
      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete Flashcard"
        message="Delete this flashcard? This cannot be undone."
        onConfirm={async () => {
          if (deleteTarget) { await deleteFlashcard(deleteTarget.id).catch(() => {}); await load(); }
          setDeleteTarget(null);
        }}
        onCancel={async () => { setDeleteTarget(null); await load(); }}
      />
      <ExportNameModal prompt={exportPrompt} onClose={() => setExportPrompt(null)} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  listContent: { paddingBottom: Spacing.xxl },
  chPill:     { borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  chPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  countRow:  { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
  countText: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1, fontWeight: '600', textTransform: 'uppercase' },
  hintText:  { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic', marginTop: 2 },
  err:     { backgroundColor: Colors.error + '22', borderRadius: Radius.md, padding: Spacing.md, margin: Spacing.lg, borderWidth: 1, borderColor: Colors.error },
  errText: { color: Colors.error, fontSize: FontSize.sm },
  actions:    { marginHorizontal: Spacing.lg, marginTop: Spacing.lg, gap: Spacing.sm },
  addBtn:     { borderWidth: 1.5, borderColor: Colors.success + '66', borderStyle: 'dashed', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  addBtnText: { color: Colors.success, fontSize: FontSize.md, fontWeight: '600' },
  importBtn:  { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  importBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  previewHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  backText:       { color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '500' },
  editBtn:        { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  editBtnText:    { color: Colors.textPrimary, fontWeight: '600', fontSize: FontSize.sm },
  previewContainer:{ flex: 1, padding: Spacing.lg, justifyContent: 'center' },
  flashcard:      { borderRadius: Radius.xl, borderWidth: 1.5, padding: Spacing.xl, alignItems: 'center', gap: Spacing.lg, minHeight: 300, justifyContent: 'center' },
  sidePill:       { borderRadius: 999, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 1 },
  sideLabel:      { fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 2.5 },
  flashcardImg:   { width: '100%', height: 160, borderRadius: Radius.md },
  flashcardText:  { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center', lineHeight: 28 },
  tapHint:        { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },
});