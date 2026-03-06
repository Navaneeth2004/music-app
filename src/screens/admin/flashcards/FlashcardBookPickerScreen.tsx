import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../../constants/theme';
import { Book, Chapter } from '../../../types';
import { getBooks, getChapters } from '../../../api/content';
import { FlashcardBuilderScreen } from './FlashcardBuilderScreen';

type PickerView =
  | { screen: 'books' }
  | { screen: 'chapters'; book: Book }
  | { screen: 'flashcards'; chapter: Chapter; book: Book };

interface FlashcardBookPickerScreenProps {
  onBack: () => void;
}

export const FlashcardBookPickerScreen: React.FC<FlashcardBookPickerScreenProps> = ({ onBack }) => {
  const [view, setView] = useState<PickerView>({ screen: 'books' });
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getBooks().then(setBooks).finally(() => setLoading(false));
  }, []);

  const pickBook = async (book: Book) => {
    setLoading(true);
    const chs = await getChapters(book.id);
    setChapters(chs);
    setView({ screen: 'chapters', book });
    setLoading(false);
  };

  if (view.screen === 'flashcards') {
    return <FlashcardBuilderScreen chapter={view.chapter} book={view.book} onBack={() => setView({ screen: 'chapters', book: view.book })} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={view.screen === 'books' ? onBack : () => setView({ screen: 'books' })} style={styles.backBtn}>
          <Text style={styles.backText}>← {view.screen === 'books' ? 'Study Builder' : 'Books'}</Text>
        </Pressable>

        <Text style={styles.pageTitle}>Flashcards</Text>
        <Text style={styles.pageSubtitle}>
          {view.screen === 'books' ? 'Select a book' : `Select a chapter from ${(view as any).book?.title}`}
        </Text>

        {loading
          ? <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />
          : view.screen === 'books'
            ? books.map(book => (
                <Pressable key={book.id} onPress={() => pickBook(book)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}>
                  <View style={[styles.bookCover, { backgroundColor: book.color }]}>
                    <Text style={{ fontSize: 22 }}>{book.icon}</Text>
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardTitle}>{book.title}</Text>
                    <Text style={styles.cardSub}>{book.author}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))
            : chapters.map(ch => (
                <Pressable key={ch.id} onPress={() => setView({ screen: 'flashcards', chapter: ch, book: (view as any).book })} style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}>
                  <View style={[styles.chapterNum, { borderColor: (view as any).book?.color + '55' }]}>
                    <Text style={[styles.chapterNumText, { color: (view as any).book?.color }]}>{ch.number}</Text>
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardTitle}>{ch.title}</Text>
                    {ch.subtitle ? <Text style={styles.cardSub}>{ch.subtitle}</Text> : null}
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))
        }
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  backBtn: { marginBottom: Spacing.lg },
  backText: { color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '500' },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: Spacing.xs },
  pageSubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm },
  bookCover: { width: 44, height: 52, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  chapterNum: { width: 38, height: 38, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  chapterNumText: { fontWeight: '800', fontSize: FontSize.md },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  cardSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  chevron: { color: Colors.textMuted, fontSize: 22 },
});
