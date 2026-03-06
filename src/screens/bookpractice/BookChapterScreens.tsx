import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants/theme';
import { Book, Chapter } from '../../types';
import { ContentBlock } from '../../types/blocks';
import { getBooks, getChapters, getChapter } from '../../api/content';
import { getFileUrl } from '../../api/pb';
import { s, bs, RichText, BackButton, Empty, ZoomableImage } from './practiceShared';
import { AudioPlayer } from '../../components/shared/AudioPlayer';

// ─── Book List ─────────────────────────────────────────────────
export const BookListScreen: React.FC<{ onBook: (b: Book) => void; onSoloDecks: () => void }> = ({ onBook, onSoloDecks }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getBooks().then(setBooks).finally(() => setLoading(false)); }, []);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>Study Practice</Text>
        <Text style={s.pageSubtitle}>Choose a book to study from</Text>
        {loading
          ? <ActivityIndicator style={{ marginTop: Spacing.xl }} />
          : books.length === 0
            ? <>
                <Empty icon="📚" title="No books yet" subtitle="Books will appear here once added" />
                <Pressable onPress={onSoloDecks} style={[s.soloBtn, { marginTop: Spacing.md }]}>
                  <Text style={s.soloBtnIcon}>💡</Text>
                  <Text style={s.soloBtnText}>Solo Decks</Text>
                  <Text style={s.chevron}>›</Text>
                </Pressable>
              </>
            : <>
                {books.map(book => (
                  <Pressable key={book.id} onPress={() => onBook(book)}
                    style={({ pressed }) => [s.bookCard, pressed && s.pressed]}>
                    <View style={[s.bookCover, { backgroundColor: book.color }]}>
                      <Text style={{ fontSize: 26 }}>{book.icon}</Text>
                    </View>
                    <View style={s.bookMeta}>
                      <Text style={s.bookTitle}>{book.title}</Text>
                      <Text style={s.bookAuthor}>{book.author}</Text>
                    </View>
                    <Text style={s.chevron}>›</Text>
                  </Pressable>
                ))}
                <Pressable onPress={onSoloDecks} style={[s.soloBtn, { marginTop: Spacing.md }]}>
                  <Text style={s.soloBtnIcon}>💡</Text>
                  <Text style={s.soloBtnText}>Solo Decks</Text>
                  <Text style={s.chevron}>›</Text>
                </Pressable>
              </>
        }
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Chapter List ──────────────────────────────────────────────
export const ChapterListScreen: React.FC<{
  book: Book;
  onChapter: (c: Chapter) => void;
  onBack: () => void;
}> = ({ book, onChapter, onBack }) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getChapters(book.id).then(setChapters).finally(() => setLoading(false)); }, []);

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
          : chapters.length === 0
            ? <Empty icon="📖" title="No chapters yet" />
            : chapters.map(ch => (
                <Pressable key={ch.id} onPress={() => onChapter(ch)}
                  style={({ pressed }) => [s.chCard, pressed && s.pressed]}>
                  <View style={[s.chNum, { borderColor: book.color + '44' }]}>
                    <Text style={[s.chNumText, { color: book.color }]}>{ch.number}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.chTitle}>{ch.title}</Text>
                    {ch.subtitle ? <Text style={s.chSub}>{ch.subtitle}</Text> : null}
                  </View>
                  <Text style={s.chevron}>›</Text>
                </Pressable>
              ))
        }
      </ScrollView>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChapter(initialChapter.id)
      .then(fresh => setChapter(fresh))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initialChapter.id]);

  const blocks: ContentBlock[] = (() => {
    try {
      const raw = chapter.content;
      if (!raw) return [];
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch { return []; }
  })();

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <BackButton onPress={onBack} label={book.title} />
        <View style={[s.badge, { backgroundColor: book.color + '22', borderColor: book.color + '55' }]}>
          <Text style={[s.badgeText, { color: book.color }]}>CHAPTER {chapter.number}</Text>
        </View>
        <Text style={s.chapterTitle}>{chapter.title}</Text>
        {chapter.subtitle ? <Text style={s.chapterSub}>{chapter.subtitle}</Text> : null}
        {loading
          ? <ActivityIndicator style={{ marginTop: Spacing.xl }} />
          : blocks.length === 0
            ? <View style={{ marginTop: Spacing.xl }}><Empty icon="📝" title="No content yet" subtitle="Check back soon" /></View>
            : <View style={{ marginBottom: Spacing.xl }}>{blocks.map(b => <RenderBlock key={b.id} block={b} chapterRecord={chapter} />)}</View>
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

// ─── Block renderer ────────────────────────────────────────────
const RenderBlock: React.FC<{ block: ContentBlock; chapterRecord: any }> = ({ block: b, chapterRecord }) => {
  if (b.type === 'divider') return <View style={bs.divider} />;
  if (b.type === 'heading') return <RichText text={b.text ?? ''} style={bs.heading} />;
  if (b.type === 'subheading') return <RichText text={b.text ?? ''} style={bs.subheading} />;
  if (b.type === 'paragraph') return <RichText text={b.text ?? ''} style={bs.paragraph} />;
  if (b.type === 'bullets') return (
    <View style={bs.bullets}>
      {(b.bullets ?? []).map((pt, i) => (
        <View key={i} style={bs.bulletRow}>
          <View style={bs.bulletDot} />
          <RichText text={pt} style={bs.bulletText} />
        </View>
      ))}
    </View>
  );
  if (b.type === 'image') {
    const validFile = b.imageFile && b.imageFile.length > 4 ? b.imageFile : null;
    const imgUri = validFile ? getFileUrl('chapters', chapterRecord.id, validFile) : (b.imageUrl ?? null);
    if (!imgUri) return null;
    return <ZoomableImage uri={imgUri} style={bs.image} />;
  }
  if (b.type === 'audio') {
    const validFile = b.audioFile && b.audioFile.length > 4 ? b.audioFile : null;
    if (!validFile) return null;
    const uri = getFileUrl('chapters', chapterRecord.id, validFile);
    return (
      <View style={bs.audioWrap}>
        <AudioPlayer uri={uri} accentColor={Colors.accent} />
      </View>
    );
  }
  if (b.type === 'table') {
    const headers = b.headers ?? [];
    const rows = b.rows ?? [];
    return (
      <View style={bs.table}>
        <View style={bs.tableHRow}>
          {headers.map((h, i) => (
            <View key={i} style={[bs.tableCell, i < headers.length - 1 && bs.cellBorder]}>
              <RichText text={h} style={bs.tableHText} />
            </View>
          ))}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={[bs.tableRow, ri < rows.length - 1 && bs.rowBorder]}>
            {row.cells.map((cell, ci) => (
              <View key={ci} style={[bs.tableCell, ci < row.cells.length - 1 && bs.cellBorder]}>
                <RichText text={cell} style={bs.tableCellText} />
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }
  return null;
};