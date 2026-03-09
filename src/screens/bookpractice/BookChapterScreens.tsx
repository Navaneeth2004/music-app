import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import { Book, Chapter } from '../../types';
import { ContentBlock } from '../../types/blocks';
import { getBooks, getChapters, getChapter } from '../../api/content';
import { s, BackButton, Empty } from './practiceShared';
import { BlockPreview, RichText } from '../../components/shared/Blockpreview';
import { getFavorites, toggleFavorite } from '../../utils/favorites';
import { getHidden, toggleHidden } from '../../utils/hidden';
import { useAuth } from '../../context/AuthContext';

// ─── Long-press context menu ───────────────────────────────────
const ContextMenu: React.FC<{
  visible: boolean;
  title: string;
  isHidden: boolean;
  isPinned?: boolean;
  onHide: () => void;
  onPin?: () => void;
  onClose: () => void;
}> = ({ visible, title, isHidden, isPinned, onHide, onPin, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={cm.overlay} onPress={onClose}>
      <View style={cm.box}>
        <Text style={cm.label} numberOfLines={1}>{title}</Text>
        {onPin && (
          <Pressable onPress={() => { onPin(); onClose(); }} style={cm.row}>
            <Text style={cm.rowIcon}>{isPinned ? '★' : '☆'}</Text>
            <Text style={cm.rowText}>{isPinned ? 'Unpin' : 'Pin to top'}</Text>
          </Pressable>
        )}
        <Pressable onPress={() => { onHide(); onClose(); }} style={cm.row}>
          <Text style={cm.rowIcon}>{isHidden ? '👁️' : '🙈'}</Text>
          <Text style={cm.rowText}>{isHidden ? 'Show for students' : 'Hide from students'}</Text>
        </Pressable>
        <Pressable onPress={onClose} style={[cm.row, cm.cancelRow]}>
          <Text style={cm.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Pressable>
  </Modal>
);

const cm = {
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' as const, padding: Spacing.lg },
  box:       { backgroundColor: '#1E1E2E', borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' as const },
  label:     { fontSize: FontSize.xs, fontWeight: '700' as const, color: Colors.textMuted, textAlign: 'center' as const, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, letterSpacing: 0.5, textTransform: 'uppercase' as const, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  row:       { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 14, paddingHorizontal: Spacing.lg, gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  rowIcon:   { fontSize: 18, width: 26 },
  rowText:   { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '500' as const },
  cancelRow: { borderBottomWidth: 0 },
  cancelText:{ flex: 1, textAlign: 'center' as const, fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' as const },
};

// ─── Book List ─────────────────────────────────────────────────
export const BookListScreen: React.FC<{ onBook: (b: Book) => void; onSoloDecks: () => void }> = ({ onBook, onSoloDecks }) => {
  const { isAdmin } = useAuth();
  const [books, setBooks]     = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinned, setPinned]   = useState<Set<string>>(new Set());
  const [hidden, setHidden]   = useState<Set<string>>(new Set());
  const [menu, setMenu]       = useState<Book | null>(null);

  const load = useCallback(async () => {
    const [b, p, h] = await Promise.all([
      getBooks(),
      getFavorites('book'),
      getHidden('book'),
    ]);
    setBooks(b);
    setPinned(p);
    setHidden(h);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePin = async (id: string) => {
    await toggleFavorite('book', id);
    setPinned(await getFavorites('book'));
  };

  const handleToggleHide = async (id: string) => {
    await toggleHidden('book', id);
    setHidden(await getHidden('book'));
  };

  // Students don't see hidden books; admins see all with a dim badge
  const visible = isAdmin ? books : books.filter(b => !hidden.has(b.id));

  const sorted = [...visible].sort((a, b) => {
    const ap = pinned.has(a.id) ? 0 : 1;
    const bp = pinned.has(b.id) ? 0 : 1;
    return ap - bp;
  });

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Study Practice</Text>
        <Text style={s.pageSubtitle}>Choose a book to study from</Text>
        {loading
          ? <ActivityIndicator style={{ marginTop: Spacing.xl }} />
          : visible.length === 0
            ? <>
                <Empty icon="📚" title="No books yet" subtitle="Books will appear here once added" />
                <Pressable onPress={onSoloDecks} style={[s.soloBtn, { marginTop: Spacing.md }]}>
                  <Text style={s.soloBtnIcon}>💡</Text>
                  <Text style={s.soloBtnText}>Solo Decks</Text>
                  <Text style={s.chevron}>›</Text>
                </Pressable>
              </>
            : <>
                {pinned.size > 0 && <Text style={s.sectionLabel}>PINNED</Text>}
                {sorted.map((book, idx) => {
                  const isPinned  = pinned.has(book.id);
                  const isHid     = hidden.has(book.id);
                  const wasFirst  = idx === 0 && !isPinned && pinned.size > 0;
                  return (
                    <React.Fragment key={book.id}>
                      {wasFirst && <Text style={[s.sectionLabel, { marginTop: Spacing.md }]}>ALL BOOKS</Text>}
                      <Pressable
                        onPress={() => onBook(book)}
                        onLongPress={() => isAdmin && setMenu(book)}
                        delayLongPress={400}
                        style={({ pressed }) => [s.bookCard, pressed && s.pressed, isHid && { opacity: 0.45 }]}
                      >
                        <View style={[s.bookCover, { backgroundColor: book.color }]}>
                          <Text style={{ fontSize: 26 }}>{book.icon}</Text>
                        </View>
                        <View style={s.bookMeta}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={s.bookTitle}>{book.title}</Text>
                            {isAdmin && isHid && <Text style={{ fontSize: 12 }}>🙈</Text>}
                          </View>
                          <Text style={s.bookAuthor}>{book.author}</Text>
                        </View>
                        <Pressable onPress={() => handlePin(book.id)} hitSlop={12} style={{ padding: 6 }}>
                          <Text style={{ fontSize: 20, opacity: isPinned ? 1 : 0.3 }}>⭐</Text>
                        </Pressable>
                        <Text style={s.chevron}>›</Text>
                      </Pressable>
                    </React.Fragment>
                  );
                })}
                <Pressable onPress={onSoloDecks} style={[s.soloBtn, { marginTop: Spacing.md }]}>
                  <Text style={s.soloBtnIcon}>💡</Text>
                  <Text style={s.soloBtnText}>Solo Decks</Text>
                  <Text style={s.chevron}>›</Text>
                </Pressable>
              </>
        }
      </ScrollView>
      {menu && (
        <ContextMenu
          visible
          title={menu.title}
          isHidden={hidden.has(menu.id)}
          isPinned={pinned.has(menu.id)}
          onHide={() => handleToggleHide(menu.id)}
          onPin={() => handlePin(menu.id)}
          onClose={() => setMenu(null)}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Chapter List ──────────────────────────────────────────────
export const ChapterListScreen: React.FC<{
  book: Book;
  onChapter: (c: Chapter) => void;
  onBack: () => void;
}> = ({ book, onChapter, onBack }) => {
  const { isAdmin } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading]   = useState(true);
  const [hidden, setHidden]     = useState<Set<string>>(new Set());
  const [menu, setMenu]         = useState<Chapter | null>(null);

  const load = useCallback(async () => {
    const [ch, h] = await Promise.all([
      getChapters(book.id),
      getHidden('chapter'),
    ]);
    setChapters(ch);
    setHidden(h);
    setLoading(false);
  }, [book.id]);

  useEffect(() => { load(); }, [load]);

  const handleToggleHide = async (id: string) => {
    await toggleHidden('chapter', id);
    setHidden(await getHidden('chapter'));
  };

  const visible = isAdmin ? chapters : chapters.filter(c => !hidden.has(c.id));

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <BackButton onPress={onBack} label="Books" />
        <View style={s.heroRow}>
          <View style={[s.heroCover, { backgroundColor: book.color }]}>
            <Text style={{ fontSize: 28 }}>{book.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.pageTitle}>{book.title}</Text>
            <Text style={s.pageSubtitle}>{book.author}</Text>
          </View>
        </View>
        <Text style={s.sectionLabel}>CHAPTERS</Text>
        {loading
          ? <ActivityIndicator />
          : visible.length === 0
            ? <Empty icon="📖" title="No chapters yet" />
            : visible.map(ch => {
                const isHid = hidden.has(ch.id);
                return (
                  <Pressable key={ch.id}
                    onPress={() => onChapter(ch)}
                    onLongPress={() => isAdmin && setMenu(ch)}
                    delayLongPress={400}
                    style={({ pressed }) => [s.chCard, pressed && s.pressed, isHid && { opacity: 0.45 }]}
                  >
                    <View style={[s.chNum, { borderColor: book.color + '44' }]}>
                      <Text style={[s.chNumText, { color: book.color }]}>{ch.number}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.chTitle}>{ch.title}</Text>
                        {isAdmin && isHid && <Text style={{ fontSize: 12 }}>🙈</Text>}
                      </View>
                      {ch.subtitle ? <Text style={s.chSub}>{ch.subtitle}</Text> : null}
                    </View>
                    <Text style={s.chevron}>›</Text>
                  </Pressable>
                );
              })
        }
      </ScrollView>
      {menu && (
        <ContextMenu
          visible
          title={`Chapter ${menu.number}: ${menu.title}`}
          isHidden={hidden.has(menu.id)}
          onHide={() => handleToggleHide(menu.id)}
          onClose={() => setMenu(null)}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Chapter View ──────────────────────────────────────────────
export const ChapterViewScreen: React.FC<{
  book: Book;
  chapter: Chapter;
  onFlashcards: () => void;
  onBack: () => void;
}> = ({ book, chapter: initialChapter, onFlashcards, onBack }) => {
  const [chapter, setChapter] = useState<Chapter>(initialChapter);
  const [blocks, setBlocks]   = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getChapter(initialChapter.id)
      .then(fresh => {
        setChapter(fresh);
        try {
          const raw = fresh.content;
          const parsed = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
          setBlocks(Array.isArray(parsed) ? parsed : []);
        } catch { setBlocks([]); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initialChapter.id]);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg }}>
          <Pressable onPress={onBack} style={{ paddingVertical: 4, minWidth: 60 }}>
            <Text style={{ color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '500' }}>← {book.title}</Text>
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={[s.badge, { backgroundColor: book.color + '22', borderColor: book.color + '55', alignSelf: 'center', marginBottom: 0 }]}>
              <Text style={[s.badgeText, { color: book.color }]}>CHAPTER {chapter.number}</Text>
            </View>
          </View>
          <View style={{ minWidth: 60 }} />
        </View>
        <Text style={s.chapterTitle}>{chapter.title}</Text>
        {chapter.subtitle ? <Text style={s.chapterSub}>{chapter.subtitle}</Text> : null}
        {blocks.length === 0
          ? <View style={{ marginTop: Spacing.xl }}><Empty icon="📝" title="No content yet" subtitle="Check back soon" /></View>
          : <View style={{ marginBottom: Spacing.xl }}>{blocks.map(b => <BlockPreview key={b.id} block={b} />)}</View>
        }
        <Pressable onPress={onFlashcards}
          style={[s.flashcardsBtn, { borderColor: book.color + '55', backgroundColor: book.color + '11' }]}>
          <Text style={{ fontSize: 24 }}>🃏</Text>
          <Text style={[s.flashcardsBtnText, { color: book.color }]}>Study Flashcards</Text>
          <Text style={s.chevron}>›</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};