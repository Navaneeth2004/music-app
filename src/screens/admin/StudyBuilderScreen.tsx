import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { Book } from '../../types';
import { BookBuilderScreen } from './builder/BookBuilderScreen';
import { ChapterBuilderScreen } from './builder/ChapterBuilderScreen';
import { FlashcardBookPickerScreen } from './flashcards/FlashcardBookPickerScreen';
import { SoloDeckBuilderScreen } from './flashcards/SoloDeckBuilderScreen';

type AdminView = 'home' | 'books' | 'chapters' | 'flashcards' | 'soloDecks';

interface StudyBuilderScreenProps {
  onDeepNav: (deep: boolean) => void;
}

export const StudyBuilderScreen: React.FC<StudyBuilderScreenProps> = ({ onDeepNav }) => {
  const [view, setView] = useState<AdminView>('home');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  useEffect(() => { onDeepNav(view !== 'home'); }, [view]);

  if (view === 'books') return <BookBuilderScreen onChapters={(book) => { setSelectedBook(book); setView('chapters'); }} onBack={() => setView('home')} />;
  if (view === 'chapters' && selectedBook) return <ChapterBuilderScreen book={selectedBook} onBack={() => setView('books')} />;
  if (view === 'flashcards') return <FlashcardBookPickerScreen onBack={() => setView('home')} />;
  if (view === 'soloDecks') return <SoloDeckBuilderScreen onBack={() => setView('home')} />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Study Builder</Text>
        <Text style={styles.pageSubtitle}>Build content for the app</Text>
        <Text style={styles.sectionLabel}>CONTENT</Text>
        <BuilderCard icon="📚" title="Textbooks" description="Manage books and build chapter content" color={Colors.accent} onPress={() => setView('books')} />
        <BuilderCard icon="🃏" title="Chapter Flashcards" description="Create flashcards tied to a chapter" color="#4CAF88" onPress={() => setView('flashcards')} />
        <BuilderCard icon="💡" title="Solo Decks" description="Standalone flashcard sets — any topic" color="#4A9EE0" onPress={() => setView('soloDecks')} />
        <BuilderCard icon="📝" title="Exercises" description="Built via code — not editable here" color="#9896B0" disabled hint="Added through code per chapter" />
      </ScrollView>
    </SafeAreaView>
  );
};

const BuilderCard = ({ icon, title, description, color, onPress, disabled, hint }: { icon: string; title: string; description: string; color: string; onPress?: () => void; disabled?: boolean; hint?: string }) => (
  <Pressable onPress={disabled ? undefined : onPress} style={({ pressed }) => [styles.card, disabled && styles.cardDisabled, pressed && !disabled && styles.cardPressed]}>
    <View style={[styles.cardIcon, { backgroundColor: color + '22' }]}><Text style={{ fontSize: 26 }}>{icon}</Text></View>
    <View style={styles.cardMeta}>
      <Text style={[styles.cardTitle, disabled && styles.textMuted]}>{title}</Text>
      <Text style={styles.cardDesc}>{description}</Text>
      {hint && <Text style={styles.cardHint}>{hint}</Text>}
    </View>
    {!disabled ? <Text style={styles.chevron}>›</Text> : <View style={styles.lockedBadge}><Text style={styles.lockedText}>Code only</Text></View>}
  </Pressable>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: Spacing.xs },
  pageSubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  sectionLabel: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1.5, fontWeight: '600', marginBottom: Spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm },
  cardDisabled: { opacity: 0.5 },
  cardPressed: { opacity: 0.75 },
  cardIcon: { width: 56, height: 56, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flex: 1, gap: 2 },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  cardDesc: { fontSize: FontSize.sm, color: Colors.textSecondary },
  cardHint: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  textMuted: { color: Colors.textMuted },
  chevron: { color: Colors.textMuted, fontSize: 22 },
  lockedBadge: { backgroundColor: Colors.surfaceAlt, borderRadius: 999, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  lockedText: { color: Colors.textMuted, fontSize: FontSize.xs },
});
