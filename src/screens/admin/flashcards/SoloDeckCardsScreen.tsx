import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../../constants/theme';
import { SoloDeck, SoloFlashcard } from '../../../types';
import {
  getSoloFlashcards, createSoloFlashcard, deleteSoloFlashcard,
} from '../../../api/content';
import { ConfirmModal }   from '../../../components/shared/ConfirmModal';
import { ImportModal }    from '../../../components/shared/ImportModal';
import { ImageLightbox }  from '../../../components/shared/ImageLightbox';
import { SwipeableRow }   from '../../../components/shared/SwipeableRow';
import { CardListItem }   from '../../../components/shared/CardListItem';
import { CardListHeader, SelectionBar } from '../../../components/shared/CardListHeader';
import { AudioPlayer }    from '../../../components/shared/AudioPlayer';
import { exportJson }     from '../../../utils/exportJson';
import { embedMedia }     from '../../../utils/mediaExport';
import { getHidden, toggleHidden } from '../../../utils/hidden';
import { ExportNameModal, ExportPrompt } from '../../../components/shared/Exportnamemodal';
import { SoloFlashcardFormScreen } from './SoloFlashcardFormScreen';
import { BackButton } from '../../../components/shared/Backbutton';

const BACK_COLOR = '#38BFA1';
type CardView = 'list' | 'preview' | 'create' | 'edit';

interface Props {
  deck:   SoloDeck;
  onBack: () => void;
}

export const SoloDeckCardsScreen: React.FC<Props> = ({ deck, onBack }) => {
  const [cards,       setCards]       = useState<SoloFlashcard[]>([]);
  const [hiddenCards, setHiddenCards] = useState<Set<string>>(new Set());
  const [loading,     setLoading]     = useState(true);
  const [cardView,    setCardView]    = useState<CardView>('list');
  const [previewCard, setPreviewCard] = useState<SoloFlashcard | null>(null);
  const [editCard,    setEditCard]    = useState<SoloFlashcard | null>(null);
  const [flipped,     setFlipped]     = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [showImport,  setShowImport]  = useState(false);
  const [deleteTarget,setDeleteTarget]= useState<SoloFlashcard | null>(null);
  const [selecting,   setSelecting]   = useState(false);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [exportPrompt,setExportPrompt]= useState<ExportPrompt | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    Promise.all([getSoloFlashcards(deck.id), getHidden('flashcard')])
      .then(([c, h]) => { setCards(c); setHiddenCards(h); })
      .finally(() => setLoading(false));
  }, [deck.id]);
  useEffect(() => { load(); }, [load]);

  const handleToggleHideCard = async (id: string) => {
    await toggleHidden('flashcard', id);
    setHiddenCards(await getHidden('flashcard'));
  };

  const cancelSelect  = () => { setSelecting(false); setSelected(new Set()); };
  const toggleSelect  = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const allSelected = selected.size === cards.length && cards.length > 0;

  const handleImport = async (imported: { front: string; back: string }[]) => {
    for (const card of imported)
      await createSoloFlashcard({ deck: deck.id, front: card.front, back: card.back, order: 0 });
    await load();
  };

  const handleHideSelected = async () => {
    for (const id of selected) await toggleHidden('flashcard', id);
    setHiddenCards(await getHidden('flashcard'));
    cancelSelect();
  };

  const handleExportSelected = async () => {
    const chosen = cards.filter(c => selected.has(c.id));
    if (!chosen.length) return;
    try {
      const media: Record<string, string> = {};
      const exportCards = await Promise.all(chosen.map(async c => ({
        front: c.front, back: c.back,
        front_image: await embedMedia(c.front_image ?? undefined, 'images', media),
        back_image:  await embedMedia(c.back_image ?? undefined, 'images', media),
        front_audio: await embedMedia(c.front_audio ?? undefined, 'audio',  media),
        back_audio:  await embedMedia(c.back_audio ?? undefined, 'audio',  media),
      })));
      const payload = {
        version: 2, exportedAt: new Date().toISOString(), type: 'solo_deck',
        deck: { title: deck.title, icon: deck.icon, color: deck.color },
        cards: exportCards, media,
      };
      const slug = deck.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      await new Promise<void>((resolve) => {
        setExportPrompt({
          suggested: `deck-${slug}`,
          onConfirm: async (filename: string) => { await exportJson(payload, filename); resolve(); },
        });
      });
      cancelSelect();
    } catch { Alert.alert('Export failed', 'Could not export deck.'); }
  };

  const getUrl = (card: SoloFlashcard, field: string): string | null => {
    const f = (card as any)[field]; return f ? String(f) : null;
  };

  if (cardView === 'create' || cardView === 'edit') {
    return (
      <SoloFlashcardFormScreen
        deck={deck}
        editCard={cardView === 'edit' ? editCard : null}
        onSave={() => { setEditCard(null); setCardView('list'); load(); }}
        onBack={() => { setEditCard(null); setCardView('list'); setPreviewCard(null); }}
      />
    );
  }

  if (cardView === 'preview' && previewCard) {
    const shownImg   = flipped ? getUrl(previewCard, 'back_image')  : getUrl(previewCard, 'front_image');
    const shownAudio = flipped ? getUrl(previewCard, 'back_audio')  : getUrl(previewCard, 'front_audio');
    const sideColor  = flipped ? BACK_COLOR : deck.color;
    return (
      <SafeAreaView style={s.safe}>
        <ImageLightbox uri={lightboxUri} onClose={() => setLightboxUri(null)} />
        <View style={s.previewHeader}>
          <BackButton onPress={() => { setCardView('list'); setFlipped(false); setPreviewCard(null); }} label="Cards" />
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
            {shownAudio && (
              <View style={{ alignSelf: 'stretch', marginTop: 4 }}>
                <AudioPlayer uri={shownAudio} accentColor={sideColor} />
              </View>
            )}
            <Text style={s.tapHint}>tap to flip{shownImg ? ' · tap image to zoom' : ''}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <CardListHeader
        accentColor={deck.color}
        badge={<Text style={{ fontSize: 16 }}>{deck.icon}</Text>}
        title={deck.title}
        onBack={selecting ? cancelSelect : onBack}
        selecting={selecting}
      />
      {selecting && (
        <SelectionBar
          count={selected.size} total={cards.length}
          accentColor={deck.color} allSelected={allSelected}
          onSelectAll={() => setSelected(allSelected ? new Set() : new Set(cards.map(c => c.id)))}
          onHide={handleHideSelected}
          onExport={handleExportSelected}
        />
      )}

      <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
        {!loading && !selecting && (
          <View style={s.countRow}>
            <Text style={s.countText}>{cards.length} card{cards.length !== 1 ? 's' : ''}</Text>
            <Text style={s.hintText}>long-press to export  ·  swipe → edit  ·  swipe ← delete</Text>
          </View>
        )}
        {loading ? <ActivityIndicator color={deck.color} style={{ marginTop: Spacing.xl }} /> :
          cards.map((card, i) => {
            const fUrl     = getUrl(card, 'front_image');
            const hasAudio = !!(card as any).front_audio || !!(card as any).back_audio;
            return (
              <SwipeableRow
                key={card.id}
                onDelete={() => setDeleteTarget(card)}
                onHide={() => handleToggleHideCard(card.id)}
                isHidden={hiddenCards.has(card.id)}
                onRightAction={() => { setEditCard(card); setCardView('edit'); }}
                rightLabel="Edit" rightIcon="✏️" rightColor={deck.color}
              >
                <CardListItem
                  index={i} front={card.front} back={card.back}
                  thumbUri={fUrl} hasAudio={hasAudio}
                  accentColor={deck.color}
                  selecting={selecting} selected={selected.has(card.id)}
                  isHidden={hiddenCards.has(card.id)}
                  onPress={() => {
                    if (selecting) { toggleSelect(card.id); }
                    else { setPreviewCard(card); setFlipped(false); setCardView('preview'); }
                  }}
                  onLongPress={() => {
                    if (!selecting) { setSelecting(true); setSelected(new Set([card.id])); }
                  }}
                />
              </SwipeableRow>
            );
          })
        }
        {!loading && !selecting && (
          <View style={s.actions}>
            <Pressable onPress={() => setCardView('create')} style={s.addBtn}>
              <Text style={s.addBtnText}>+ Add Card</Text>
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
        title="Delete Card"
        message="Delete this flashcard? This cannot be undone."
        onConfirm={async () => {
          if (deleteTarget) { await deleteSoloFlashcard(deleteTarget.id).catch(() => {}); await load(); }
          setDeleteTarget(null);
        }}
        onCancel={async () => { setDeleteTarget(null); await load(); }}
      />
      <ExportNameModal prompt={exportPrompt} onClose={() => setExportPrompt(null)} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: Colors.background },
  listContent:     { paddingBottom: Spacing.xxl },
  backText:        { color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '500' },
  countRow:        { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
  countText:       { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1, fontWeight: '600', textTransform: 'uppercase' },
  hintText:        { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic', marginTop: 2 },
  actions:         { marginHorizontal: Spacing.lg, marginTop: Spacing.lg, gap: Spacing.sm },
  addBtn:          { marginTop: Spacing.md, borderWidth: 1.5, borderColor: Colors.success + '66', borderStyle: 'dashed', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  addBtnText:      { color: Colors.success, fontSize: FontSize.md, fontWeight: '600' },
  importBtn:       { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  importBtnText:   { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  previewHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  previewContainer:{ flex: 1, padding: Spacing.lg, justifyContent: 'center' },
  flashcard:       { borderRadius: Radius.xl, borderWidth: 1.5, padding: Spacing.xl, alignItems: 'center', gap: Spacing.lg, minHeight: 300, justifyContent: 'center' },
  sidePill:        { borderRadius: 999, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 1 },
  sideLabel:       { fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 2.5 },
  flashcardImg:    { width: '100%', height: 160, borderRadius: Radius.md },
  flashcardText:   { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center', lineHeight: 28 },
  tapHint:         { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },
});