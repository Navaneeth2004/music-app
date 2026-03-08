import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../../constants/theme';
import { Book, Chapter } from '../../../types';
import { getChapters, createChapter, updateChapter, deleteChapter, getChapterFlashcards, createChapterFlashcard } from '../../../api/content';
import { BlockEditorScreen }  from './BlockEditorScreen';
import { ConfirmModal }       from '../../../components/shared/ConfirmModal';
import { SwipeableRow }       from '../../../components/shared/SwipeableRow';
import { SelectionBar }       from '../../../components/shared/CardListHeader';
import { exportJson }         from '../../../utils/exportJson';
import { embedMedia }         from '../../../utils/mediaExport';
import { restoreMediaMap, remapUri } from '../../../utils/mediaExport';
import { ExportNameModal, ExportPrompt } from '../../../components/shared/Exportnamemodal';
import { InfoModal, InfoModalData }      from '../../../components/shared/Infomodal';
import { ImportModal }                   from '../../../components/shared/ImportModal';
import { getHidden, toggleHidden } from '../../../utils/hidden';


interface Props { book: Book; onBack: () => void; }

export const ChapterBuilderScreen: React.FC<Props> = ({ book, onBack }) => {
  const [chapters, setChapters]         = useState<Chapter[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [title, setTitle]               = useState('');
  const [subtitle, setSubtitle]         = useState('');
  const [editing, setEditing]           = useState<Chapter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);
  const [error, setError]               = useState<string | null>(null);
  // selection (for export)
  const [selecting, setSelecting]       = useState(false);
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [exportPrompt, setExportPrompt] = useState<ExportPrompt | null>(null);
  const [infoModal, setInfoModal]       = useState<InfoModalData | null>(null);
  const [showImport, setShowImport]     = useState(false);
  const [hidden, setHidden]             = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try { const [ch, h] = await Promise.all([getChapters(book.id), getHidden('chapter')]); setChapters(ch); setHidden(h); }
    catch { setError('Failed to load.'); }
    finally { setLoading(false); }
  }, [book.id]);
  useEffect(() => { load(); }, [load]);

  // Called by ImportModal with already-validated + type-checked data
  const handleImport = async (data: any) => {
    const uriMap = await restoreMediaMap(data.media);

    let chaptersToImport: any[] = [];
    if (data.chapter) chaptersToImport = [data.chapter];
    else if (Array.isArray(data.books) && data.books.length) { for (const b of data.books) chaptersToImport.push(...(b.chapters ?? [])); }
    else if (Array.isArray(data.chapters)) chaptersToImport = data.chapters;

    for (const ch of chaptersToImport) {
      const chapter = await createChapter({ book: book.id, number: chapters.length + 1, title: ch.title ?? '', subtitle: ch.subtitle ?? '' });
      if (ch.content) {
        try {
          let blocks = JSON.parse(ch.content);
          if (Object.keys(uriMap).length) {
            blocks = blocks.map((bl: any) => ({
              ...bl,
              imageFile: remapUri(bl.imageFile, 'images', uriMap),
              audioFile: remapUri(bl.audioFile, 'audio',  uriMap),
            }));
          }
          await updateChapter(chapter.id, { content: JSON.stringify(blocks) } as any);
        } catch {}
      }
      for (const card of (ch.flashcards ?? [])) {
        await createChapterFlashcard({
          chapter: chapter.id, front: card.front ?? '', back: card.back ?? '', order: 0,
          front_image: remapUri(card.front_image, 'images', uriMap),
          back_image:  remapUri(card.back_image,  'images', uriMap),
          front_audio: remapUri(card.front_audio, 'audio',  uriMap),
          back_audio:  remapUri(card.back_audio,  'audio',  uriMap),
        });
      }
    }
    await load();
  };

  const cancelSelect = () => { setSelecting(false); setSelected(new Set()); };
  const toggleSelect = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const allSelected = selected.size === chapters.length && chapters.length > 0;

  const handleToggleHide = async (id: string) => {
    await toggleHidden('chapter', id);
    setHidden(await getHidden('chapter'));
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createChapter({ book: book.id, number: chapters.length + 1, title: title.trim(), subtitle: subtitle.trim() });
      setTitle(''); setSubtitle(''); setShowForm(false); await load();
    } catch { setError('Failed to create.'); }
    finally { setSaving(false); }
  };

  const handleExportSelected = async () => {
    const chosen = chapters.filter(ch => selected.has(ch.id));
    if (!chosen.length) return;
    try {
      for (const ch of chosen) {
        const media: Record<string, string> = {};
        const cards = await getChapterFlashcards(ch.id);

        let blocks: any[] = [];
        try { blocks = (ch as any).content ? JSON.parse((ch as any).content) : []; } catch {}
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

        const payload = {
          version: 2, exportedAt: new Date().toISOString(), type: 'chapter',
          book: { title: book.title, icon: book.icon, color: book.color },
          chapter: {
            number: ch.number, title: ch.title, subtitle: ch.subtitle,
            content: exportBlocks.length ? JSON.stringify(exportBlocks) : null,
            flashcards: exportCards,
          },
          media,
        };
        const slug = ch.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
        await new Promise<void>((resolve) => {
          setExportPrompt({
            suggested: `chapter-${ch.number}-${slug}`,
            onConfirm: async (filename) => { await exportJson(payload, filename); resolve(); },
          });
        });
      }
      cancelSelect();
    } catch { setInfoModal({ title: 'Export failed', message: 'Could not export chapters.' }); }
  };

  if (editing) return <BlockEditorScreen chapter={editing} book={book} onBack={() => { setEditing(null); load(); }} />;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={selecting ? cancelSelect : onBack} style={s.back}>
          <Text style={s.backText}>{selecting ? '✕ Cancel' : '← Textbooks'}</Text>
        </Pressable>

        <View style={s.heroRow}>
          <View style={[s.cover, { backgroundColor: book.color }]}>
            <Text style={{ fontSize: 26 }}>{book.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bookTitle}>{book.title}</Text>
            <Text style={s.bookSub}>{chapters.length} chapter{chapters.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {error && <View style={s.err}><Text style={s.errText}>{error}</Text></View>}

        {!loading && !selecting && (
          <Text style={s.hint}>long-press to export  ·  swipe → hide  ·  swipe ← delete</Text>
        )}

        {selecting && (
          <SelectionBar
            count={selected.size} total={chapters.length}
            accentColor={book.color} allSelected={allSelected}
            onSelectAll={() => setSelected(allSelected ? new Set() : new Set(chapters.map(c => c.id)))}
            onExport={handleExportSelected}
          />
        )}

        {loading
          ? <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />
          : <>
              {chapters.map(ch => (
                <SwipeableRow key={ch.id} onDelete={() => setDeleteTarget(ch)} onHide={() => handleToggleHide(ch.id)} isHidden={hidden.has(ch.id)} containerStyle={{ marginBottom: Spacing.sm, borderRadius: Radius.md }}>
                  <Pressable
                    onPress={() => selecting ? toggleSelect(ch.id) : setEditing(ch)}
                    onLongPress={() => { if (!selecting) { setSelecting(true); setSelected(new Set([ch.id])); } }}
                    delayLongPress={350}
                    style={({ pressed }) => [
                      s.chCard,
                      pressed && { opacity: 0.75 },
                      !selecting && hidden.has(ch.id) && { opacity: 0.45 },
                      selecting && selected.has(ch.id) && { borderColor: book.color, backgroundColor: book.color + '12' },
                    ]}
                  >
                    {selecting ? (
                      <View style={[s.check, selected.has(ch.id) && { backgroundColor: book.color, borderColor: book.color }]}>
                        {selected.has(ch.id) && <Text style={s.checkMark}>✓</Text>}
                      </View>
                    ) : (
                      <View style={[s.num, { borderColor: book.color + '55' }]}>
                        <Text style={[s.numText, { color: book.color }]}>{ch.number}</Text>
                      </View>
                    )}
                    <View style={s.meta}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.chTitle}>{ch.title}</Text>
                        {!selecting && hidden.has(ch.id) && <Text style={{ fontSize: 11 }}>🙈</Text>}
                      </View>
                      {ch.subtitle ? <Text style={s.chSub}>{ch.subtitle}</Text> : null}
                    </View>
                    {!selecting && <Text style={s.chevron}>›</Text>}
                  </Pressable>
                </SwipeableRow>
              ))}

              {!showForm
                ? <View style={s.addRow}>
                    <Pressable onPress={() => setShowForm(true)} style={s.addBtn}>
                      <Text style={s.addBtnText}>+ Add Chapter</Text>
                    </Pressable>
                    <Pressable onPress={() => setShowImport(true)} style={s.importBtn}>
                      <Text style={s.importBtnText}>⬇ Import</Text>
                    </Pressable>
                  </View>
                : <View style={s.form}>
                    <Text style={s.formTitle}>Chapter {chapters.length + 1}</Text>
                    <Text style={s.label}>TITLE</Text>
                    <TextInput style={s.input} value={title} onChangeText={setTitle}
                      placeholder="Chapter title" placeholderTextColor={Colors.textMuted} />
                    <Text style={s.label}>SUBTITLE (optional)</Text>
                    <TextInput style={s.input} value={subtitle} onChangeText={setSubtitle}
                      placeholder="Brief description" placeholderTextColor={Colors.textMuted} />
                    <View style={s.formActions}>
                      <Pressable onPress={() => setShowForm(false)} style={s.cancelBtn}>
                        <Text style={s.cancelText}>Cancel</Text>
                      </Pressable>
                      <Pressable onPress={handleCreate} style={[s.saveBtn, !title.trim() && { opacity: 0.4 }]} disabled={!title.trim()}>
                        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveBtnText}>Save</Text>}
                      </Pressable>
                    </View>
                  </View>
              }
            </>
        }
      </ScrollView>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete Chapter"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={async () => {
          if (deleteTarget) { await deleteChapter(deleteTarget.id).catch(() => {}); await load(); }
          setDeleteTarget(null);
        }}
        onCancel={async () => { setDeleteTarget(null); await load(); }}
      />
      <ExportNameModal prompt={exportPrompt} onClose={() => setExportPrompt(null)} />
      <InfoModal info={infoModal} onClose={() => setInfoModal(null)} />
      <ImportModal visible={showImport} mode="chapter" onImport={handleImport} onCancel={() => setShowImport(false)} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: Colors.background },
  content:  { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  back:     { marginBottom: Spacing.lg },
  backText: { color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '500' },
  heroRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  cover:    { width: 52, height: 64, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  bookTitle:{ fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  bookSub:  { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  err:      { backgroundColor: Colors.error + '22', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.error },
  errText:  { color: Colors.error, fontSize: FontSize.sm },
  hint:     { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic', marginBottom: Spacing.sm },

  chCard:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
              backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1,
              borderColor: Colors.border, padding: Spacing.md },
  num:      { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt,
              alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  numText:  { fontWeight: '800', fontSize: FontSize.md },
  check:    { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border,
              alignItems: 'center', justifyContent: 'center' },
  checkMark:{ color: Colors.textPrimary, fontSize: 11, fontWeight: '800' },
  meta:     { flex: 1 },
  chTitle:  { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  chSub:    { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  chevron:  { color: Colors.textMuted, fontSize: 20 },

  addRow:     { marginTop: Spacing.md, gap: Spacing.sm },
  addBtn:     { borderWidth: 1.5, borderColor: Colors.accent + '66', borderStyle: 'dashed', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  addBtnText: { color: Colors.accent, fontSize: FontSize.md, fontWeight: '600' },
  importBtn:  { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  importBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  form:       { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.sm, marginTop: Spacing.md },
  formTitle:  { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  label:      { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1.5, fontWeight: '600' },
  input:      { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.textPrimary, fontSize: FontSize.md, padding: Spacing.md },
  formActions:{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  cancelBtn:  { flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  saveBtn:    { flex: 1, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center' },
  saveBtnText:{ color: Colors.textPrimary, fontWeight: '700' },
});