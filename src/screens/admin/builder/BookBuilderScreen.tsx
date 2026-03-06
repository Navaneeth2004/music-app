import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../../constants/theme';
import { Book } from '../../../types';
import { getBooks, createBook, deleteBook, getChapters, deleteChapter, getChapterFlashcards, deleteChapterFlashcard } from '../../../api/content';
import { ConfirmModal }    from '../../../components/shared/ConfirmModal';
import { SwipeableRow }    from '../../../components/shared/Swipeablerow';
import { SelectionBar }    from '../../../components/shared/Cardlistheader';
import { exportJson }      from '../../../utils/exportJson';

const COLORS = ['#7C6FF7','#4CAF88','#E05C6A','#F0A050','#4A9EE0','#C47ED4'];
const ICONS  = ['🎼','🎹','🎸','🎺','🎻','🥁','🎵','🎶'];

interface Props { onChapters: (b: Book) => void; onBack: () => void; }

export const BookBuilderScreen: React.FC<Props> = ({ onChapters, onBack }) => {
  const [books, setBooks]               = useState<Book[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
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

  const load = useCallback(async () => {
    setLoading(true);
    try { setBooks(await getBooks()); } catch { setError('Failed to load.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const cancelSelect = () => { setSelecting(false); setSelected(new Set()); };
  const toggleSelect = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const allSelected = selected.size === books.length && books.length > 0;

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
      for (const book of chosen) {
        const chapters = await getChapters(book.id).catch(() => []);
        const exportChapters = [];
        for (const ch of chapters) {
          const cards = await getChapterFlashcards(ch.id).catch(() => []);
          exportChapters.push({
            number: ch.number, title: ch.title, subtitle: ch.subtitle,
            content: (ch as any).content ?? null,
            flashcards: cards.map(c => ({ front: c.front, back: c.back })),
          });
        }
        const payload = {
          version: 1, exportedAt: new Date().toISOString(),
          books: [{ title: book.title, author: book.author, icon: book.icon, color: book.color, order: book.order, chapters: exportChapters }],
          soloDecks: [],
        };
        const slug = book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
        await exportJson(payload, `book-${slug}.json`);
      }
      cancelSelect();
    } catch { Alert.alert('Export failed', 'Could not export book.'); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={selecting ? cancelSelect : onBack} style={s.back}>
          <Text style={s.backText}>{selecting ? '✕ Cancel' : '← Study Builder'}</Text>
        </Pressable>
        <Text style={s.title}>Textbooks</Text>
        {error && <View style={s.err}><Text style={s.errText}>{error}</Text></View>}

        {!loading && !selecting && (
          <Text style={s.hint}>long-press to select for export · swipe left to delete</Text>
        )}

        {selecting && (
          <SelectionBar
            count={selected.size} total={books.length}
            accentColor={Colors.accent} allSelected={allSelected}
            onSelectAll={() => setSelected(allSelected ? new Set() : new Set(books.map(b => b.id)))}
            onExport={handleExportSelected}
          />
        )}

        {loading ? <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} /> : <>
          {books.map(book => (
            <SwipeableRow key={book.id} onDelete={() => setDeleteTarget(book)} containerStyle={{ marginBottom: Spacing.sm, borderRadius: Radius.md }}>
              <Pressable
                onPress={() => selecting ? toggleSelect(book.id) : onChapters(book)}
                onLongPress={() => { if (!selecting) { setSelecting(true); setSelected(new Set([book.id])); } }}
                delayLongPress={350}
                style={({ pressed }) => [
                  s.bookCard, pressed && { opacity: 0.75 },
                  selecting && selected.has(book.id) && { borderColor: book.color, backgroundColor: book.color + '12' },
                ]}
              >
                {selecting ? (
                  <View style={[s.check, selected.has(book.id) && { backgroundColor: book.color, borderColor: book.color }]}>
                    {selected.has(book.id) && <Text style={s.checkMark}>✓</Text>}
                  </View>
                ) : (
                  <View style={[s.cover, { backgroundColor: book.color }]}>
                    <Text style={{ fontSize: 22 }}>{book.icon}</Text>
                  </View>
                )}
                <View style={s.meta}>
                  <Text style={s.bookTitle}>{book.title}</Text>
                  <Text style={s.bookAuthor}>{book.author}</Text>
                </View>
                {!selecting && <Text style={s.chevron}>›</Text>}
              </Pressable>
            </SwipeableRow>
          ))}

          {!showForm
            ? <Pressable onPress={() => setShowForm(true)} style={s.addBtn}><Text style={s.addBtnText}>+ Add Book</Text></Pressable>
            : <View style={s.form}>
                <Text style={s.formTitle}>New Book</Text>
                <Text style={s.label}>TITLE</Text>
                <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. Harmony & Voice Leading" placeholderTextColor={Colors.textMuted} />
                <Text style={s.label}>AUTHOR</Text>
                <TextInput style={s.input} value={author} onChangeText={setAuthor} placeholder="e.g. Aldwell & Schachter" placeholderTextColor={Colors.textMuted} />
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

      <ConfirmModal
        visible={!!deleteTarget}
        title="Delete Book"
        message={`Delete "${deleteTarget?.title}"? All chapters and flashcards inside will be permanently deleted.`}
        onConfirm={handleDeleteBook}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: Colors.background },
  content:  { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  back:     { marginBottom: Spacing.lg },
  backText: { color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '500' },
  title:    { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: Spacing.sm },
  hint:     { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic', marginBottom: Spacing.md },
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

  addBtn:     { borderWidth: 1.5, borderColor: Colors.accent + '66', borderStyle: 'dashed', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  addBtnText: { color: Colors.accent, fontSize: FontSize.md, fontWeight: '600' },
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
});