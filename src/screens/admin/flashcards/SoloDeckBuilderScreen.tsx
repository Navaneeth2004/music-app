import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, ActivityIndicator, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../../constants/theme';
import { SoloDeck } from '../../../types';
import {
  getSoloDecks, createSoloDeck, updateSoloDeck, deleteSoloDeck,
  getSoloFlashcards, deleteSoloFlashcard,
} from '../../../api/content';
import { ConfirmModal }    from '../../../components/shared/ConfirmModal';
import { SwipeableRow }    from '../../../components/shared/SwipeableRow';
import { SelectionBar }    from '../../../components/shared/CardListHeader';
import { exportJson }      from '../../../utils/exportJson';
import { embedMedia }      from '../../../utils/mediaExport';
import { getHidden, toggleHidden } from '../../../utils/hidden';
import { BackButton } from '../../../components/shared/Backbutton';
import { ExportNameModal, ExportPrompt } from '../../../components/shared/Exportnamemodal';
import { SoloDeckCardsScreen } from './SoloDeckCardsScreen';

const COLORS = ['#7C6FF7','#4CAF88','#E05C6A','#F0A050','#4A9EE0','#C47ED4','#56CCB2','#E8845A'];
const ICONS  = ['🃏','💡','🧠','📖','🔥','⚡','🎯','🌟','🔑','💎','🚀','📝'];

interface Props { onBack: () => void; }

export const SoloDeckBuilderScreen: React.FC<Props> = ({ onBack }) => {
  const [selectedDeck,  setSelectedDeck]  = useState<SoloDeck | null>(null);
  const [decks,         setDecks]         = useState<SoloDeck[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [openingDeck,   setOpeningDeck]   = useState<string | null>(null);
  const [showForm,      setShowForm]      = useState(false);
  const [title,         setTitle]         = useState('');
  const [icon,          setIcon]          = useState(ICONS[0]);
  const [color,         setColor]         = useState(COLORS[0]);
  const [saving,        setSaving]        = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState<SoloDeck | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [hidden,        setHidden]        = useState<Set<string>>(new Set());
  const [selecting,     setSelecting]     = useState(false);
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [exportPrompt,  setExportPrompt]  = useState<ExportPrompt | null>(null);
  const [editTarget,    setEditTarget]    = useState<SoloDeck | null>(null);
  const [editTitle,     setEditTitle]     = useState('');
  const [editSaving,    setEditSaving]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, h] = await Promise.all([getSoloDecks(), getHidden('deck')]);
      setDecks(d); setHidden(h);
    } catch { setError('Failed to load.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (selectedDeck) {
    return (
      <SoloDeckCardsScreen
        deck={selectedDeck}
        onBack={() => { setSelectedDeck(null); load(); }}
      />
    );
  }

  const cancelSelect      = () => { setSelecting(false); setSelected(new Set()); };
  const toggleSelectDeck  = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const allSelected = selected.size === decks.length && decks.length > 0;

  const openEdit = (deck: SoloDeck) => { setEditTarget(deck); setEditTitle(deck.title); };

  const handleEditSave = async () => {
    if (!editTarget || !editTitle.trim()) return;
    setEditSaving(true);
    try { await updateSoloDeck(editTarget.id, { title: editTitle.trim() } as any); await load(); setEditTarget(null); }
    catch {} finally { setEditSaving(false); }
  };

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

  const handleHideSelected = async () => {
    for (const id of selected) await toggleHidden('deck', id);
    setHidden(await getHidden('deck'));
    cancelSelect();
  };

  const handleExportSelected = async () => {
    const chosen = decks.filter(d => selected.has(d.id));
    if (!chosen.length) return;
    try {
      for (const deck of chosen) {
        const media: Record<string, string> = {};
        const allCards = await getSoloFlashcards(deck.id).catch(() => []);
        const exportCards = await Promise.all(allCards.map(async c => ({
          front: c.front, back: c.back,
          front_image: await embedMedia(c.front_image, 'images', media),
          back_image:  await embedMedia(c.back_image, 'images', media),
          front_audio: await embedMedia(c.front_audio, 'audio',  media),
          back_audio:  await embedMedia(c.back_audio, 'audio',  media),
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
      }
      cancelSelect();
    } catch { Alert.alert('Export failed', 'Could not export deck.'); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {selecting
          ? <Pressable onPress={cancelSelect} style={s.back}><Text style={s.cancelText}>✕ Cancel</Text></Pressable>
          : <BackButton onPress={onBack} label="Study Builder" />
        }
        <Text style={s.title}>Solo Decks</Text>
        <Text style={s.subtitle}>Standalone flashcard sets</Text>

        {error && <View style={s.err}><Text style={s.errText}>{error}</Text></View>}

        {loading ? <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} /> : <>
          {selecting && (
            <SelectionBar
              count={selected.size} total={decks.length}
              accentColor={Colors.accent} allSelected={allSelected}
              onSelectAll={() => setSelected(allSelected ? new Set() : new Set(decks.map(d => d.id)))}
              onHide={handleHideSelected}
              onExport={handleExportSelected}
            />
          )}
          {!selecting && <Text style={s.hint}>long-press to export  ·  swipe → edit  ·  swipe ← delete</Text>}
          <View style={{ marginTop: Spacing.sm }}>
            {decks.map(deck => (
              <SwipeableRow
                key={deck.id}
                onDelete={selecting ? undefined : () => setDeleteTarget(deck)}
                onRightAction={selecting ? undefined : () => openEdit(deck)}
                rightLabel="Edit" rightIcon="✏️" rightColor={Colors.accent}
                containerStyle={{ marginBottom: Spacing.sm, borderRadius: Radius.md }}
              >
                <Pressable
                  onPress={async () => {
                    if (selecting) { toggleSelectDeck(deck.id); }
                    else {
                      setOpeningDeck(deck.id);
                      await new Promise(r => setTimeout(r, 300));
                      setSelectedDeck(deck);
                      setOpeningDeck(null);
                    }
                  }}
                  onLongPress={() => {
                    if (!selecting) { setSelecting(true); setSelected(new Set([deck.id])); }
                  }}
                  delayLongPress={350}
                  style={({ pressed }) => [
                    s.deckCard, pressed && { opacity: 0.75 },
                    !selecting && hidden.has(deck.id) && { opacity: 0.45 },
                    selecting && selected.has(deck.id) && { borderColor: deck.color, backgroundColor: deck.color + '12' },
                    openingDeck === deck.id && { opacity: 0.6 },
                  ]}
                  disabled={openingDeck === deck.id}
                >
                  {selecting ? (
                    <View style={[s.check, selected.has(deck.id) && { backgroundColor: deck.color, borderColor: deck.color }]}>
                      {selected.has(deck.id) && <Text style={s.checkMark}>✓</Text>}
                    </View>
                  ) : (
                    <View style={[s.cover, { backgroundColor: deck.color + '33' }]}>
                      {openingDeck === deck.id ? (
                        <ActivityIndicator size="small" color={deck.color} />
                      ) : (
                        <Text style={{ fontSize: 22 }}>{deck.icon}</Text>
                      )}
                    </View>
                  )}
                  <View style={s.meta}>
                    <Text style={s.deckTitle}>{deck.title}</Text>
                  </View>
                  {!selecting && <Text style={s.chevron}>›</Text>}
                </Pressable>
              </SwipeableRow>
            ))}
          </View>
          {!selecting && (!showForm
            ? <Pressable onPress={() => setShowForm(true)} style={s.addBtn}>
                <Text style={s.addBtnText}>+ New Deck</Text>
              </Pressable>
            : <View style={s.form}>
                <Text style={s.formTitle}>New Deck</Text>
                <Text style={s.label}>TITLE</Text>
                <TextInput style={s.input} value={title} onChangeText={setTitle}
                  placeholder="e.g. Spanish Vocab, History Dates…" placeholderTextColor={Colors.textMuted} maxLength={80} />
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
                  <Pressable onPress={() => setShowForm(false)} style={s.cancelBtn}>
                    <Text style={s.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={handleCreate} style={[s.saveBtn, !title.trim() && { opacity: 0.4 }]} disabled={!title.trim()}>
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveBtnText}>Save</Text>}
                  </Pressable>
                </View>
              </View>
          )}
        </>}
      </ScrollView>

      {/* Edit deck name modal */}
      <Modal visible={!!editTarget} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.editBox}>
            <Text style={s.editBoxTitle}>Edit Deck Name</Text>
            <Text style={s.label}>TITLE</Text>
            <TextInput style={s.input} value={editTitle} onChangeText={setEditTitle}
              placeholder="Deck name" placeholderTextColor={Colors.textMuted} maxLength={80} autoFocus />
            <View style={s.formActions}>
              <Pressable onPress={() => setEditTarget(null)} style={s.cancelBtn}>
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleEditSave} disabled={!editTitle.trim() || editSaving}
                style={[s.saveBtn, (!editTitle.trim() || editSaving) && { opacity: 0.4 }]}>
                {editSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveBtnText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete Deck"
        message={`Delete "${deleteTarget?.title}"? All cards will be permanently deleted.`}
        onConfirm={handleDeleteDeck}
        onCancel={async () => { setDeleteTarget(null); await load(); }}
      />
      <ExportNameModal prompt={exportPrompt} onClose={() => setExportPrompt(null)} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: Colors.background },
  content:      { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  back:         { marginBottom: Spacing.lg, marginTop: Spacing.xs },
  backText:     { color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '500' },
  title:        { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: Spacing.xs },
  subtitle:     { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  hint:         { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic', marginBottom: Spacing.sm },
  err:          { backgroundColor: Colors.error + '22', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.error },
  errText:      { color: Colors.error, fontSize: FontSize.sm },
  check:        { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkMark:    { color: Colors.textPrimary, fontSize: 11, fontWeight: '800' },
  deckCard:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  cover:        { width: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  meta:         { flex: 1 },
  deckTitle:    { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  chevron:      { color: Colors.textMuted, fontSize: 20 },
  form:         { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm, marginTop: Spacing.md },
  formTitle:    { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  label:        { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1.5, fontWeight: '600' },
  input:        { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, padding: Spacing.md },
  presets:      { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  presetItem:   { width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  presetActive: { borderColor: Colors.accent, borderWidth: 2 },
  colorDot:     { width: 32, height: 32, borderRadius: 16 },
  colorActive:  { borderWidth: 3, borderColor: Colors.textPrimary },
  formActions:  { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  cancelBtn:    { flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText:   { color: Colors.textSecondary, fontWeight: '600' },
  saveBtn:      { flex: 1, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center' },
  saveBtnText:  { color: Colors.textPrimary, fontWeight: '700' },
  addBtn:       { marginTop: Spacing.md, borderWidth: 1.5, borderColor: Colors.success + '66', borderStyle: 'dashed', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  addBtnText:   { color: Colors.success, fontSize: FontSize.md, fontWeight: '600' },
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  editBox:      { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, width: '100%', maxWidth: 380, gap: Spacing.sm },
  editBoxTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs },
});