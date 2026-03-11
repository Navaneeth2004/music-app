import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../../constants/theme';
import { Book } from '../../../types';
import { getBooks, createBook, updateBook, deleteBook, getChapters, createChapter, updateChapter, deleteChapter, getChapterFlashcards, deleteChapterFlashcard, createChapterFlashcard } from '../../../api/content';
import { ConfirmModal }    from '../../../components/shared/ConfirmModal';
import { SwipeableRow }    from '../../../components/shared/SwipeableRow';
import { SelectionBar }    from '../../../components/shared/CardListHeader';
import { exportJson }      from '../../../utils/exportJson';
import { embedMedia }      from '../../../utils/mediaExport';
import { restoreMediaMap, remapUri } from '../../../utils/mediaExport';
import { ExportNameModal, ExportPrompt } from '../../../components/shared/Exportnamemodal';
import { InfoModal, InfoModalData }      from '../../../components/shared/Infomodal';
import { ImportModal }                   from '../../../components/shared/ImportModal';
import { getHidden, toggleHidden } from '../../../utils/hidden';
import { BackButton } from '../../../components/shared/Backbutton';

const COLORS = ['#7C6FF7','#4CAF88','#E05C6A','#F0A050','#4A9EE0','#C47ED4'];
const ICONS  = ['🎼','🎹','🎸','🎺','🎻','🥁','🎵','🎶'];

interface Props { onChapters: (b: Book) => void; onBack: () => void; }

export const BookBuilderScreen: React.FC<Props> = ({ onChapters, onBack }) => {
  const [books, setBooks]               = useState<Book[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [editLoading, setEditLoading]   = useState<string | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [title, setTitle]               = useState('');
  const [author, setAuthor]             = useState('');
  const [icon, setIcon]                 = useState(ICONS[0]);
  const [color, setColor]               = useState(COLORS[0]);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [error, setError]               = useState<string | null>(null);
  // selection for export
  const [selecting, setSelecting]       = useState(false);
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [showImport, setShowImport]     = useState(false);
  const [exportPrompt, setExportPrompt] = useState<ExportPrompt | null>(null);
  const [infoModal, setInfoModal]       = useState<InfoModalData | null>(null);
  const [hidden, setHidden]             = useState<Set<string>>(new Set());
  // Edit modal state
  const [editTarget,  setEditTarget]  = useState<Book | null>(null);
  const [editTitle,   setEditTitle]   = useState('');
  const [editAuthor,  setEditAuthor]  = useState('');
  const [editSaving,  setEditSaving]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const [b, h] = await Promise.all([getBooks(), getHidden('book')]); setBooks(b); setHidden(h); } catch { setError('Failed to load.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Called by ImportModal with already-validated + type-checked data
  const handleImport = async (data: any) => {
    const uriMap = await restoreMediaMap(data.media);

    // Collect book list (ImportModal already validated shape)
    let booksToImport: any[] = [];
    if (data.type === 'book' && data.book)                  booksToImport = [data.book];
    else if (Array.isArray(data.books) && data.books.length) booksToImport = data.books;
    else if (data.title)                                     booksToImport = [data];

    for (const b of booksToImport) {
      const book = await createBook({ title: b.title ?? 'Imported', author: b.author ?? '', icon: b.icon ?? '📚', color: b.color ?? '#7C6FF7', order: b.order ?? 0 });
      for (const ch of (b.chapters ?? [])) {
        const chapter = await createChapter({ book: book.id, number: ch.number ?? 1, title: ch.title ?? '', subtitle: ch.subtitle ?? '' });
        if (ch.content) {
          try {
            let blocks = JSON.parse(ch.content);
            if (Object.keys(uriMap).length) {
              blocks = blocks.map((bl: any) => {
                const { imageFile: _img, audioFile: _aud, ...rest } = bl;
                return { ...rest, imageFile: remapUri(bl.imageFile, 'images', uriMap), audioFile: remapUri(bl.audioFile, 'audio', uriMap) };
              });
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
    }
    await load();
  };

  const cancelSelect = () => { setSelecting(false); setSelected(new Set()); };
  const toggleSelect = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const allSelected = selected.size === books.length && books.length > 0;

  const handleToggleHide = async (id: string) => {
    await toggleHidden('book', id);
    setHidden(await getHidden('book'));
  };

  const handleHideSelected = async () => {
    for (const id of selected) { await toggleHidden('book', id); }
    setHidden(await getHidden('book'));
    cancelSelect();
  };

  const openEdit = (book: Book) => {
    setEditTarget(book); setEditTitle(book.title); setEditAuthor(book.author ?? '');
  };

  const handleEditSave = async () => {
    if (!editTarget || !editTitle.trim()) return;
    setEditSaving(true);
    try {
      await updateBook(editTarget.id, { title: editTitle.trim(), author: editAuthor.trim() } as any);
      await load();
      setEditTarget(null);
    } catch {}
    finally { setEditSaving(false); }
  };

  const handleCreate = async () => {
    if (!title.trim() || !author.trim()) return;
    setSaving(true);
    try {
      await createBook({ title: title.trim(), author: author.trim(), icon, color, order: books.length + 1 });
      setTitle(''); setAuthor(''); setShowForm(false); await load();
    } catch { setError('Failed to create.'); } finally { setSaving(false); }
  };

  // Cascade delete: flashcards → chapters → book
  const handleDeleteBook = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const chapters = await getChapters(deleteTarget.id).catch(() => []);
      for (const ch of chapters) {
        const cards = await getChapterFlashcards(ch.id).catch(() => []);
        await Promise.all(cards.map(c => deleteChapterFlashcard(c.id).catch(() => {})));
        await deleteChapter(ch.id).catch(() => {});
      }
      await deleteBook(deleteTarget.id).catch(() => {});
    } finally { setDeleting(false); setDeleteTarget(null); await load(); }
  };

  const handleExportSelected = async () => {
    const chosen = books.filter(b => selected.has(b.id));
    if (!chosen.length) return;
    try {
      // Build all payloads first, then prompt for name (one at a time)
      for (const book of chosen) {
        const media: Record<string, string> = {};
        const chapters = await getChapters(book.id).catch(() => []);
        const exportChapters = [];
        for (const ch of chapters) {
          const cards = await getChapterFlashcards(ch.id).catch(() => []);

          let blocks: any[] = [];
          try { blocks = ch.content ? JSON.parse(ch.content as any) : []; } catch {}
          const exportBlocks = await Promise.all(blocks.map(async (bl: any) => {
            const { imageFile: _img, audioFile: _aud, ...rest } = bl;
            return {
              ...rest,
              imageFile: await embedMedia(bl.imageFile, 'images', media),
              audioFile: await embedMedia(bl.audioFile, 'audio',  media),
            };
          }));

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
        const payload = {
          version: 2, exportedAt: new Date().toISOString(), type: 'book',
          book: { title: book.title, author: book.author, icon: book.icon, color: book.color, order: book.order, chapters: exportChapters },
          media,
        };
        const slug = book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
        // Prompt for filename
        await new Promise<void>((resolve) => {
          setExportPrompt({
            suggested: `book-${slug}`,
            onConfirm: async (filename) => { await exportJson(payload, filename); resolve(); },
          });
        });
      }
      cancelSelect();
    } catch { setInfoModal({ title: 'Export failed', message: 'Could not export book.' }); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {selecting
          ? <Pressable onPress={cancelSelect} style={s.back}><Text style={s.cancelText}>✕ Cancel</Text></Pressable>
          : <BackButton onPress={onBack} label="Study Builder" />
        }
        <Text style={s.title}>Textbooks</Text>
        {error && <View style={s.err}><Text style={s.errText}>{error}</Text></View>}

        {!loading && !selecting && (
          <Text style={s.hint}>long-press to export  ·  swipe → edit  ·  swipe ← delete</Text>
        )}

        {selecting && (
          <SelectionBar
            count={selected.size} total={books.length}
            accentColor={Colors.accent} allSelected={allSelected}
            onSelectAll={() => setSelected(allSelected ? new Set() : new Set(books.map(b => b.id)))}
            onHide={handleHideSelected}
            onExport={handleExportSelected}
          />
        )}

        {loading ? <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} /> : <>
          {books.map(book => (
            <SwipeableRow key={book.id} onDelete={() => setDeleteTarget(book)} onRightAction={() => openEdit(book)} rightLabel="Edit" rightIcon="✏️" rightColor={Colors.accent} containerStyle={{ marginBottom: Spacing.sm, borderRadius: Radius.md }}>
              <Pressable
                onPress={async () => {
                  if (selecting) { toggleSelect(book.id); }
                  else {
                    setEditLoading(book.id);
                    await new Promise(r => setTimeout(r, 400));
                    onChapters(book);
                    setEditLoading(null);
                  }
                }}
                onLongPress={() => { if (!selecting) { setSelecting(true); setSelected(new Set([book.id])); } }}
                delayLongPress={350}
                style={({ pressed }) => [
                  s.bookCard, pressed && { opacity: 0.75 },
                  !selecting && hidden.has(book.id) && { opacity: 0.45 },
                  selecting && selected.has(book.id) && { borderColor: book.color, backgroundColor: book.color + '12' },
                  editLoading === book.id && { opacity: 0.6 },
                ]}
                disabled={editLoading === book.id}
              >
                {selecting ? (
                  <View style={[s.check, selected.has(book.id) && { backgroundColor: book.color, borderColor: book.color }]}>
                    {selected.has(book.id) && <Text style={s.checkMark}>✓</Text>}
                  </View>
                ) : (
                  <View style={[s.cover, { backgroundColor: book.color }]}>
                    {editLoading === book.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ fontSize: 22 }}>{book.icon}</Text>
                    )}
                  </View>
                )}
                <View style={s.meta}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.bookTitle}>{book.title}</Text>
                  </View>
                  <Text style={s.bookAuthor}>{book.author}</Text>
                </View>
                {!selecting && <Text style={s.chevron}>›</Text>}
              </Pressable>
            </SwipeableRow>
          ))}

          {!selecting && !showForm
            ? <View style={s.addRow}>
                <Pressable onPress={() => setShowForm(true)} style={s.addBtn}><Text style={s.addBtnText}>+ Add Book</Text></Pressable>
                <Pressable onPress={() => setShowImport(true)} style={s.importBtn}>
                  <Text style={s.importBtnText}>⬇ Import</Text>
                </Pressable>
              </View>
            : !selecting && <View style={s.form}>
                <Text style={s.formTitle}>New Book</Text>
                <Text style={s.label}>TITLE</Text>
                <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. Harmony & Voice Leading" placeholderTextColor={Colors.textMuted} maxLength={80} />
                <Text style={s.label}>AUTHOR</Text>
                <TextInput style={s.input} value={author} onChangeText={setAuthor} placeholder="e.g. Aldwell & Schachter" placeholderTextColor={Colors.textMuted} maxLength={80} />
                <Text style={s.label}>ICON</Text>
                <View style={s.presets}>
                  {ICONS.map(ic => <Pressable key={ic} onPress={() => setIcon(ic)} style={[s.presetItem, icon === ic && s.presetActive]}><Text style={{ fontSize: 22 }}>{ic}</Text></Pressable>)}
                </View>
                <Text style={s.label}>COLOR</Text>
                <View style={s.presets}>
                  {COLORS.map(c => <Pressable key={c} onPress={() => setColor(c)} style={[s.colorDot, { backgroundColor: c }, color === c && s.colorActive]} />)}
                </View>
                <View style={s.formActions}>
                  <Pressable onPress={() => setShowForm(false)} style={s.cancelBtn}><Text style={s.cancelText}>Cancel</Text></Pressable>
                  <Pressable onPress={handleCreate} style={[s.saveBtn, (!title.trim() || !author.trim()) && { opacity: 0.4 }]} disabled={!title.trim() || !author.trim()}>
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.saveBtnText}>Save</Text>}
                  </Pressable>
                </View>
              </View>
          }
        </>}
      </ScrollView>

      {/* Edit book modal */}
      <Modal visible={!!editTarget} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.editBox}>
            <Text style={s.editBoxTitle}>Edit Book</Text>
            <Text style={s.label}>TITLE</Text>
            <TextInput
              style={s.input} value={editTitle} onChangeText={setEditTitle}
              placeholder="Book title" placeholderTextColor={Colors.textMuted}
              maxLength={80} autoFocus
            />
            <Text style={s.label}>AUTHOR</Text>
            <TextInput
              style={s.input} value={editAuthor} onChangeText={setEditAuthor}
              placeholder="Author" placeholderTextColor={Colors.textMuted}
              maxLength={80}
            />
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
        title="Delete Book"
        message={`Delete "${deleteTarget?.title}"? All chapters and flashcards inside will be permanently deleted.`}
        onConfirm={handleDeleteBook}
        onCancel={async () => { setDeleteTarget(null); await load(); }}
      />
      <ExportNameModal prompt={exportPrompt} onClose={() => setExportPrompt(null)} />
      <InfoModal info={infoModal} onClose={() => setInfoModal(null)} />
      <ImportModal visible={showImport} mode="book" onImport={handleImport} onCancel={() => setShowImport(false)} />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: Colors.background },
  content:  { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  back:     { marginBottom: Spacing.lg },
  backText:   { color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '500' },
  title:    { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: Spacing.sm },
  hint:     { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic', marginBottom: Spacing.sm },
  err:      { backgroundColor: Colors.error + '22', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.error },
  errText:  { color: Colors.error, fontSize: FontSize.sm },

  bookCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
              backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1,
              borderColor: Colors.border, padding: Spacing.md },
  cover:    { width: 48, height: 56, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  check:    { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border,
              alignItems: 'center', justifyContent: 'center' },
  checkMark:{ color: Colors.textPrimary, fontSize: 11, fontWeight: '800' },
  meta:     { flex: 1 },
  bookTitle:  { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  bookAuthor: { fontSize: FontSize.sm, color: Colors.textSecondary },
  chevron:  { color: Colors.textMuted, fontSize: 22 },

  addRow:     { marginTop: Spacing.md, gap: Spacing.sm },
  addBtn:     { borderWidth: 1.5, borderColor: Colors.accent + '66', borderStyle: 'dashed', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  addBtnText: { color: Colors.accent, fontSize: FontSize.md, fontWeight: '600' },
  importBtn:  { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  importBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
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
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  editBox:    { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, width: '100%', maxWidth: 380, gap: Spacing.sm },
  editBoxTitle:{ fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.xs },
});