/**
 * SearchScreen.tsx
 * Global search across books, chapters, chapter flashcards,
 * solo decks, and solo flashcards. Tapping a result navigates
 * directly to that content via the onNavigate callback.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { dbSearchAll, SearchResult } from '../../api/db';

// Each result type maps to a nav destination the parent understands
export type SearchNavTarget =
  | { screen: 'book';              bookId: string; bookTitle: string; bookColor: string; bookIcon: string }
  | { screen: 'chapter';           bookId: string; bookTitle: string; bookColor: string; bookIcon: string; chapterId: string; chapterTitle: string; chapterNumber: number }
  | { screen: 'chapter_flashcard'; bookId: string; bookTitle: string; bookColor: string; bookIcon: string; chapterId: string; chapterTitle: string; chapterNumber: number }
  | { screen: 'solo_deck';         deckId: string; deckTitle: string; deckColor: string; deckIcon: string }
  | { screen: 'solo_flashcard';    deckId: string; deckTitle: string; deckColor: string; deckIcon: string };

interface SearchScreenProps {
  onNavigate: (target: SearchNavTarget) => void;
}

const TYPE_META: Record<SearchResult['type'], { label: string; icon: string; color: string }> = {
  book:              { label: 'Book',          icon: '📚', color: Colors.accent },
  chapter:           { label: 'Chapter',       icon: '📖', color: '#5BA4F5' },
  chapter_flashcard: { label: 'Flashcard',     icon: '🃏', color: '#4CAF88' },
  solo_deck:         { label: 'Solo Deck',     icon: '💡', color: '#F0A050' },
  solo_flashcard:    { label: 'Solo Card',     icon: '🃏', color: '#C47CF5' },
};

export const SearchScreen: React.FC<SearchScreenProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await dbSearchAll(q);
      setResults(res);
      setSearched(true);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  const handlePress = (r: SearchResult) => {
    if (r.type === 'book') {
      onNavigate({ screen: 'book', bookId: r.id, bookTitle: r.title, bookColor: r.bookColor!, bookIcon: r.bookIcon! });
    } else if (r.type === 'chapter') {
      onNavigate({ screen: 'chapter', bookId: r.bookId!, bookTitle: r.bookTitle!, bookColor: r.bookColor!, bookIcon: r.bookIcon!, chapterId: r.id, chapterTitle: r.title, chapterNumber: r.chapterNumber! });
    } else if (r.type === 'chapter_flashcard') {
      onNavigate({ screen: 'chapter_flashcard', bookId: r.bookId!, bookTitle: r.bookTitle!, bookColor: r.bookColor!, bookIcon: r.bookIcon!, chapterId: r.chapterId!, chapterTitle: r.chapterTitle!, chapterNumber: r.chapterNumber! });
    } else if (r.type === 'solo_deck') {
      onNavigate({ screen: 'solo_deck', deckId: r.id, deckTitle: r.title, deckColor: r.deckColor!, deckIcon: r.deckIcon! });
    } else if (r.type === 'solo_flashcard') {
      onNavigate({ screen: 'solo_flashcard', deckId: r.deckId!, deckTitle: r.deckTitle!, deckColor: r.deckColor!, deckIcon: r.deckIcon! });
    }
  };

  // Group results by type for sectioned display
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] = acc[r.type] ?? []).push(r);
    return acc;
  }, {});

  const typeOrder: SearchResult['type'][] = ['book', 'chapter', 'chapter_flashcard', 'solo_deck', 'solo_flashcard'];

  return (
    <SafeAreaView style={st.safe}>
      {/* Search bar */}
      <View style={st.searchRow}>
        <View style={st.inputWrap}>
          <Text style={st.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={st.input}
            placeholder="Search books, chapters, flashcards…"
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={q => {
              setQuery(q);
              if (!q.trim()) { setResults([]); setSearched(false); setLoading(false); }
            }}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setResults([]); setSearched(false); }} hitSlop={8}>
              <Text style={st.clearBtn}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Results */}
      <ScrollView
        contentContainerStyle={st.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />
        )}

        {!loading && query.trim() === '' && (
          <View style={st.emptyState}>
            <Text style={st.emptyIcon}>🔍</Text>
            <Text style={st.emptyTitle}>Search everything</Text>
            <Text style={st.emptySub}>Find books, chapters, and flashcards instantly</Text>
          </View>
        )}

        {!loading && searched && results.length === 0 && (
          <View style={st.emptyState}>
            <Text style={st.emptyIcon}>🤷</Text>
            <Text style={st.emptyTitle}>No results</Text>
            <Text style={st.emptySub}>Try different keywords</Text>
          </View>
        )}

        {!loading && typeOrder.map(type => {
          const group = grouped[type];
          if (!group?.length) return null;
          const meta = TYPE_META[type];
          return (
            <View key={type} style={st.section}>
              <View style={st.sectionHeader}>
                <Text style={st.sectionIcon}>{meta.icon}</Text>
                <Text style={st.sectionLabel}>{meta.label.toUpperCase()}S</Text>
                <View style={[st.sectionPill, { backgroundColor: meta.color + '22' }]}>
                  <Text style={[st.sectionCount, { color: meta.color }]}>{group.length}</Text>
                </View>
              </View>
              {group.map(r => (
                <Pressable
                  key={r.id}
                  onPress={() => handlePress(r)}
                  style={({ pressed }) => [st.resultRow, pressed && { opacity: 0.7 }]}
                >
                  <View style={[st.resultDot, { backgroundColor: meta.color + '22' }]}>
                    <Text style={st.resultDotText}>{meta.icon}</Text>
                  </View>
                  <View style={st.resultBody}>
                    <Text style={st.resultTitle} numberOfLines={2}>{r.title}</Text>
                    <Text style={st.resultSub} numberOfLines={1}>{r.subtitle}</Text>
                  </View>
                  <Text style={st.resultChevron}>›</Text>
                </Pressable>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  searchRow:   { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  inputWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, gap: Spacing.sm },
  searchIcon:  { fontSize: 16 },
  input:       { flex: 1, height: 44, color: Colors.textPrimary, fontSize: FontSize.md },
  clearBtn:    { color: Colors.textMuted, fontSize: FontSize.md, padding: 4 },

  content:     { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  emptyState:  { alignItems: 'center', paddingTop: Spacing.xxl * 1.5, gap: Spacing.sm },
  emptyIcon:   { fontSize: 48 },
  emptyTitle:  { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  emptySub:    { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },

  section:       { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  sectionIcon:   { fontSize: 14 },
  sectionLabel:  { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, flex: 1 },
  sectionPill:   { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  sectionCount:  { fontSize: FontSize.xs, fontWeight: '800' },

  resultRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.xs },
  resultDot:     { width: 38, height: 38, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  resultDotText: { fontSize: 18 },
  resultBody:    { flex: 1, gap: 2 },
  resultTitle:   { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  resultSub:     { fontSize: FontSize.sm, color: Colors.textSecondary },
  resultChevron: { color: Colors.textMuted, fontSize: 20 },
});