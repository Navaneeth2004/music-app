import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../../constants/theme';
import { SoloDeck, SoloFlashcard } from '../../../types';
import { getSoloDecks, createSoloDeck, updateSoloDeck, deleteSoloDeck,
         getSoloFlashcards, deleteSoloFlashcard, createSoloFlashcard } from '../../../api/content';
import { ConfirmModal }          from '../../../components/shared/ConfirmModal';
import { ImportModal } from '../../../components/shared/ImportModal';
import { ImageLightbox }         from '../../../components/shared/ImageLightbox';
import { SwipeableRow }          from '../../../components/shared/SwipeableRow';
import { CardListItem }          from '../../../components/shared/CardListItem';
import { CardListHeader, SelectionBar } from '../../../components/shared/CardListHeader';
import { AudioPlayer }           from '../../../components/shared/AudioPlayer';
import { exportJson }            from '../../../utils/exportJson';
import { embedMedia }            from '../../../utils/mediaExport';
import { ExportNameModal, ExportPrompt } from '../../../components/shared/Exportnamemodal';
import { SoloFlashcardFormScreen } from './SoloFlashcardFormScreen';

const BACK_COLOR = '#38BFA1';
const COLORS = ['#7C6FF7','#4CAF88','#E05C6A','#F0A050','#4A9EE0','#C47ED4','#56CCB2','#E8845A'];
const ICONS  = ['🃏','💡','🧠','📖','🔥','⚡','🎯','🌟','🔑','💎','🚀','📝'];

type DeckView = 'decks' | 'cards';
type CardView = 'list' | 'preview' | 'create' | 'edit';
interface Props { onBack: () => void; }

// ─── Deck list ─────────────────────────────────────────────────
export const SoloDeckBuilderScreen: React.FC<Props> = ({ onBack }) => {
  const [view, setView]                 = useState<DeckView>('decks');
  const [decks, setDecks]               = useState<SoloDeck[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [title, setTitle]               = useState('');
  const [icon, setIcon]                 = useState(ICONS[0]);
  const [color, setColor]               = useState(COLORS[0]);
  const [saving, setSaving]             = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SoloDeck | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<SoloDeck | null>(null);
  const [error, setError]               = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setDecks(await getSoloDecks()); }
    catch { setError('Failed to load.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try { await createSoloDeck({ title: title.trim(), icon, color }); setTitle(''); setShowForm(false); await load(); }
    catch { setError('Failed to create.'); }
    finally { setSaving(false); }
  };

  const handleDeleteDeck = async () => {
    if (!deleteTarget) return;
    try {
      const cards = await getSoloFlashcards(deleteTarget.id).catch(() => []);
      await Promise.all(cards.map(c => deleteSoloFlashcard(c.id).catch(() => {})));
      await deleteSoloDeck(deleteTarget.id).catch(() => {});
    } finally { setDeleteTarget(null); await load(); }
  };

  if (view === 'cards' && selectedDeck) {
    return <SoloDeckCardsScreen deck={selectedDeck} onBack={() => { setView('decks'); setSelectedDeck(null); load(); }} />;
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Back button with proper top spacing */}
        <Pressable onPress={onBack} style={s.back}><Text style={s.backText}>← Study Builder</Text></Pressable>
        <Text style={s.title}>Solo Decks</Text>
        <Text style={s.subtitle}>Standalone flashcard sets</Text>

        {error && <View style={s.err}><Text style={s.errText}>{error}</Text></View>}

        {loading ? <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} /> : <>
          <Text style={s.hint}>swipe left on a deck to delete it</Text>
          {decks.map(deck => (
            <SwipeableRow key={deck.id} onDelete={() => setDeleteTarget(deck)} containerStyle={{ marginBottom: Spacing.sm, borderRadius: Radius.md }}>
              <Pressable onPress={() => { setSelectedDeck(deck); setView('cards'); }}
                style={({ pressed }) => [s.deckCard, pressed && { opacity: 0.75 }]}>
                <View style={[s.cover, { backgroundColor: deck.color + '33' }]}>
                  <Text style={{ fontSize: 22 }}>{deck.icon}</Text>
                </View>
                <View style={s.meta}><Text style={s.deckTitle}>{deck.title}</Text></View>
                <Text style={s.chevron}>›</Text>
              </Pressable>
            </SwipeableRow>
          ))}
          {!showForm
            ? <Pressable onPress={() => setShowForm(true)} style={s.addBtn}><Text style={s.addBtnText}>+ New Deck</Text></Pressable>
            : <View style={s.form}>
                <Text style={s.formTitle}>New Deck</Text>
                <Text style={s.label}>TITLE</Text>
                <TextInput style={s.input} value={title} onChangeText={setTitle}
                  placeholder="e.g. Spanish Vocab, History Dates…" placeholderTextColor={Colors.textMuted} />
                <Text style={s.label}>ICON</Text>
                <View style={s.presets}>
                  {ICONS.map(ic => (
                    <Pressable key={ic} onPress={() => setIcon(ic)} style={[s.presetItem, icon === ic && s.presetActive]}>
                      <Text style={{ fontSize: 22 }}>{ic}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={s.label}>COLOR</Text>
                <View style={s.presets}>
                  {COLORS.map(col => (
                    <Pressable key={col} onPress={() => setColor(col)}
                      style={[s.colorDot, { backgroundColor: col }, color === col && s.colorActive]} />
                  ))}
                </View>
                <View style={s.formActions}>
                  <Pressable onPress={() => setShowForm(false)} style={s.cancelBtn}><Text style={s.cancelText}>Cancel</Text></Pressable>
                  <Pressable onPress={handleCreate} style={[s.saveBtn, !title.trim() && { opacity: 0.4 }]} disabled={!title.trim()}>
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveBtnText}>Save</Text>}
                  </Pressable>
                </View>
              </View>
          }
        </>}
      </ScrollView>
      <ConfirmModal visible={!!deleteTarget} title="Delete Deck"
        message={`Delete "${deleteTarget?.title}"? All cards will be permanently deleted.`}
        onConfirm={handleDeleteDeck} onCancel={async () => { setDeleteTarget(null); await load(); }} />
    </SafeAreaView>
  );
};

// ─── Cards Screen ──────────────────────────────────────────────
const SoloDeckCardsScreen: React.FC<{ deck: SoloDeck; onBack: () => void }> = ({ deck, onBack }) => {
  const [cards, setCards]               = useState<SoloFlashcard[]>([]);
  const [loading, setLoading]           = useState(true);
  const [cardView, setCardView]         = useState<CardView>('list');
  const [previewCard, setPreviewCard]   = useState<SoloFlashcard | null>(null);
  const [editCard, setEditCard]         = useState<SoloFlashcard | null>(null);
  const [flipped, setFlipped]           = useState(false);
  const [lightboxUri, setLightboxUri]   = useState<string | null>(null);
  const [showImport, setShowImport]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SoloFlashcard | null>(null);
  const [selecting, setSelecting]       = useState(false);
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [exportPrompt, setExportPrompt] = useState<ExportPrompt | null>(null);

  const load = useCallback(async () => {
    setLoading(true); getSoloFlashcards(deck.id).then(setCards).finally(() => setLoading(false));
  }, [deck.id]);
  useEffect(() => { load(); }, [load]);

  const cancelSelect = () => { setSelecting(false); setSelected(new Set()); };
  const toggleSelect = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const allSelected = selected.size === cards.length && cards.length > 0;

  const handleImport = async (imported: { front: string; back: string }[]) => {
    for (const card of imported) {
      await createSoloFlashcard({ deck: deck.id, front: card.front, back: card.back, order: 0 });
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
        version: 2, exportedAt: new Date().toISOString(), type: 'solo_deck',
        deck: { title: deck.title, icon: deck.icon, color: deck.color },
        cards: exportCards,
        media,
      };
      const slug = deck.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      await new Promise<void>((resolve) => {
        setExportPrompt({
          suggested: `deck-${slug}`,
          onConfirm: async (filename) => { await exportJson(payload, filename); resolve(); },
        });
      });
      cancelSelect();
    } catch { Alert.alert('Export failed', 'Could not export deck.'); }
  };

  // With SQLite, file fields store full local URIs directly
  const getUrl = (card: SoloFlashcard, field: string): string | null => {
    const f = (card as any)[field]; return f ? String(f) : null;
  };

  if (cardView === 'create' || cardView === 'edit') {
    return (
      <SoloFlashcardFormScreen deck={deck} editCard={cardView === 'edit' ? editCard : null}
        onSave={() => { setEditCard(null); setCardView(previewCard ? 'preview' : 'list'); load(); }}
        onBack={() => { setEditCard(null); setCardView(previewCard ? 'preview' : 'list'); }} />
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
          <Pressable onPress={() => { setCardView('list'); setFlipped(false); setPreviewCard(null); }}>
            <Text style={s.backText}>← Cards</Text>
          </Pressable>
          <Pressable onPress={() => { setEditCard(previewCard); setCardView('edit'); }} style={s.editBtn}>
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
          onExport={handleExportSelected}
        />
      )}

      <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
        {!loading && !selecting && (
          <View style={s.countRow}>
            <Text style={s.countText}>{cards.length} card{cards.length !== 1 ? 's' : ''}</Text>
            <Text style={s.hintText}>long-press to select · swipe left to delete</Text>
          </View>
        )}
        {loading ? <ActivityIndicator color={deck.color} style={{ marginTop: Spacing.xl }} /> :
          cards.map((card, i) => {
            const fUrl     = getUrl(card, 'front_image');
            const hasAudio = !!(card as any).front_audio || !!(card as any).back_audio;
            return (
              <SwipeableRow key={card.id} onDelete={() => setDeleteTarget(card)}>
                <CardListItem
                  index={i} front={card.front} back={card.back}
                  thumbUri={fUrl} hasAudio={hasAudio}
                  accentColor={deck.color}
                  selecting={selecting} selected={selected.has(card.id)}
                  onPress={() => {
                    if (selecting) { toggleSelect(card.id); }
                    else { setPreviewCard(card); setFlipped(false); setCardView('preview'); }
                  }}
                  onLongPress={() => { if (!selecting) { setSelecting(true); setSelected(new Set([card.id])); } }}
                />
              </SwipeableRow>
            );
          })
        }
        {!loading && (
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
      <ConfirmModal visible={!!deleteTarget} title="Delete Card" message="Delete this flashcard? This cannot be undone."
        onConfirm={async () => {
          if (deleteTarget) { await deleteSoloFlashcard(deleteTarget.id).catch(() => {}); await load(); }
          setDeleteTarget(null);
        }}
        onCancel={async () => { setDeleteTarget(null); await load(); }} />
      <ExportNameModal prompt={exportPrompt} onClose={() => setExportPrompt(null)} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  content:     { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  listContent: { paddingBottom: Spacing.xxl },
  back:        { marginBottom: Spacing.lg, marginTop: Spacing.xs },
  backText:    { color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '500' },
  title:       { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: Spacing.xs },
  subtitle:    { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  hint:        { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic', marginBottom: Spacing.md },
  err:         { backgroundColor: Colors.error + '22', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.error },
  errText:     { color: Colors.error, fontSize: FontSize.sm },

  deckCard:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
               backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1,
               borderColor: Colors.border, padding: Spacing.md },
  cover:     { width: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  meta:      { flex: 1 },
  deckTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  chevron:   { color: Colors.textMuted, fontSize: 20 },

  form:       { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm, marginTop: Spacing.md },
  formTitle:  { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  label:      { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1.5, fontWeight: '600' },
  input:      { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, padding: Spacing.md },
  presets:    { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  presetItem: { width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  presetActive:{ borderColor: Colors.accent, borderWidth: 2 },
  colorDot:   { width: 32, height: 32, borderRadius: 16 },
  colorActive:{ borderWidth: 3, borderColor: Colors.textPrimary },
  formActions:{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  cancelBtn:  { flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  saveBtn:    { flex: 1, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center' },
  saveBtnText:{ color: Colors.textPrimary, fontWeight: '700' },

  countRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  countText: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1, fontWeight: '600', textTransform: 'uppercase', flex: 1 },
  hintText:  { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic' },
  actions:    { marginHorizontal: Spacing.lg, marginTop: Spacing.lg, gap: Spacing.sm },
  addBtn:     { borderWidth: 1.5, borderColor: Colors.success + '66', borderStyle: 'dashed', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  addBtnText: { color: Colors.success, fontSize: FontSize.md, fontWeight: '600' },
  importBtn:  { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  importBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },

  previewHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
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