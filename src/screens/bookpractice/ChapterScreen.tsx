import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { Chapter, Book } from '../../types';

interface ChapterScreenProps {
  chapter: Chapter;
  book: Book;
  onBack: () => void;
}

export const ChapterScreen: React.FC<ChapterScreenProps> = ({ chapter, book, onBack }) => (
  <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← {book.title}</Text>
      </Pressable>

      {/* Chapter badge + title */}
      <View style={[styles.badge, { backgroundColor: book.color + '22', borderColor: book.color + '55' }]}>
        <Text style={[styles.badgeText, { color: book.color }]}>CHAPTER {chapter.number}</Text>
      </View>
      <Text style={styles.title}>{chapter.title}</Text>
      <Text style={styles.subtitle}>{chapter.subtitle}</Text>

      {/* Practice options */}
      <Text style={styles.sectionLabel}>PRACTICE</Text>
      <PracticeCard icon="📝" title="Exercises" description="Work through practice problems" color={book.color} comingSoon />
      <PracticeCard icon="💡" title="Quick Notes" description="Key concepts & theory summaries" color="#4CAF88" comingSoon />
    </ScrollView>
  </SafeAreaView>
);

const PracticeCard = ({ icon, title, description, color, comingSoon }: {
  icon: string; title: string; description: string; color: string; comingSoon?: boolean;
}) => (
  <View style={styles.practiceCard}>
    <View style={[styles.practiceIcon, { backgroundColor: color + '22' }]}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
    </View>
    <View style={styles.practiceMeta}>
      <View style={styles.practiceTitleRow}>
        <Text style={styles.practiceTitle}>{title}</Text>
        {comingSoon && (
          <View style={styles.soonBadge}>
            <Text style={styles.soonText}>Coming soon</Text>
          </View>
        )}
      </View>
      <Text style={styles.practiceDesc}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  backBtn: { marginBottom: Spacing.xl },
  backText: { color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '500' },
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, marginBottom: Spacing.md },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1.5 },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: Spacing.sm },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  sectionLabel: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1.5, fontWeight: '600', marginBottom: Spacing.sm },
  practiceCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm },
  practiceIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  practiceMeta: { flex: 1 },
  practiceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  practiceTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  practiceDesc: { fontSize: FontSize.sm, color: Colors.textSecondary },
  soonBadge: { backgroundColor: Colors.warning + '22', borderRadius: 999, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  soonText: { color: Colors.warning, fontSize: FontSize.xs, fontWeight: '600' },
});
