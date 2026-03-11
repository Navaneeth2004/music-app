import React, { useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { ImageLightbox } from '../../components/shared/ImageLightbox';

// ─── Constants ─────────────────────────────────────────────────
// Solo flashcard back color — fixed teal, distinct from every deck accent
export const BACK_COLOR = '#38BFA1';

// ─── Helpers ───────────────────────────────────────────────────
// With SQLite, file fields store full local URIs directly
export const imgUrl = (card: any, field: 'front_image' | 'back_image' | 'image'): string | null => {
  const f = card?.[field]; if (!f) return null;
  return String(f);
};

// ─── Shared atoms ──────────────────────────────────────────────
export const BackButton: React.FC<{ onPress: () => void; label: string; color?: string }> = ({ onPress, label, color }) => {
  const [loading, setLoading] = useState(false);
  const textColor = color ?? Colors.accentLight;
  const handlePress = async () => {
    if (loading) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    onPress();
    setLoading(false);
  };
  return (
    <Pressable onPress={handlePress} disabled={loading} style={s.backBtnWrap}>
      {loading
        ? <ActivityIndicator size="small" color={textColor} />
        : <Text style={[s.backText, { color: textColor }]}>← {label}</Text>
      }
    </Pressable>
  );
};

export const Empty: React.FC<{ icon: string; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <View style={s.emptyContainer}>
    <Text style={s.emptyIcon}>{icon}</Text>
    <Text style={s.emptyTitle}>{title}</Text>
    {subtitle && <Text style={s.emptySubtitle}>{subtitle}</Text>}
  </View>
);

export const RichText: React.FC<{ text: string; style?: any }> = ({ text, style }) => {
  if (!text) return null;
  const parts: { t: string; b: boolean; i: boolean }[] = [];
  const re = /<b>(.*?)<\/b>|<i>(.*?)<\/i>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if      (m[1] !== undefined) parts.push({ t: m[1], b: true,  i: false });
    else if (m[2] !== undefined) parts.push({ t: m[2], b: false, i: true  });
    else if (m[3] !== undefined) parts.push({ t: m[3], b: false, i: false });
  }
  if (parts.length === 0) return <Text style={style}>{text}</Text>;
  return (
    <Text style={style}>
      {parts.map((p, i) => (
        <Text key={i} style={[p.b && { fontWeight: '700' as const }, p.i && { fontStyle: 'italic' as const }]}>{p.t}</Text>
      ))}
    </Text>
  );
};

// ─── Zoomable card image ────────────────────────────────────────
export const ZoomableImage: React.FC<{ uri: string; style?: any }> = ({ uri, style }) => {
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  return (
    <>
      <Pressable onPress={() => setLightboxUri(uri)} hitSlop={4} style={{ alignSelf: 'stretch' }}>
        <Image source={{ uri }} style={[{ width: '100%' }, style]} resizeMode="contain" />
      </Pressable>
      <ImageLightbox uri={lightboxUri} onClose={() => setLightboxUri(null)} />
    </>
  );
};

// ─── Shared styles ─────────────────────────────────────────────
export const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  pressed: { opacity: 0.7 },

  backBtnWrap: { marginBottom: Spacing.lg },
  backText:    { color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '500' },

  pageTitle:    { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: Spacing.xs },
  pageSubtitle: { fontSize: FontSize.md,  color: Colors.textSecondary, marginBottom: Spacing.xl },
  sectionLabel: { fontSize: FontSize.xs,  color: Colors.textMuted, letterSpacing: 1.5, fontWeight: '600', marginBottom: Spacing.sm },
  chevron:      { color: Colors.textMuted, fontSize: 20 },

  emptyContainer: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyIcon:      { fontSize: 44 },
  emptyTitle:     { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle:  { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },

  heroRow:    { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', marginBottom: Spacing.xl },
  heroCover:  { width: 68, height: 80, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  bookCard:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm },
  bookCover:  { width: 52, height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  bookMeta:   { flex: 1, gap: 2 },
  bookTitle:  { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  bookAuthor: { fontSize: FontSize.sm, color: Colors.textSecondary },

  soloBtn:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  soloBtnIcon: { fontSize: 22 },
  soloBtnText: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },

  chCard:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm },
  chNum:     { width: 40, height: 40, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  chNumText: { fontWeight: '800', fontSize: FontSize.md },
  chTitle:   { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  chSub:     { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  badge:             { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, marginBottom: Spacing.sm },
  badgeText:         { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1.5 },
  chapterTitle:      { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginBottom: Spacing.xs },
  chapterSub:        { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.md },
  flashcardsBtn:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1.5, borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.md },
  flashcardsBtnText: { flex: 1, fontSize: FontSize.md, fontWeight: '700' },

  fcHeader:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  fcHeaderTitle:    { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, flex: 1, textAlign: 'center', marginHorizontal: Spacing.sm },
  examBtn:          { borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  examBtnText:      { fontWeight: '700', fontSize: FontSize.sm },
  examStartBtn:     { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  examStartBtnText: { color: Colors.textPrimary, fontWeight: '700', fontSize: FontSize.sm },

  selectAllRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  selectCount:   { fontSize: FontSize.sm, color: Colors.textSecondary },
  selectAllBtn:  { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  selectAllText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600' },

  // Deck list header
  deckListHeader:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  deckListBack:       { paddingRight: Spacing.xs },
  deckListBadge:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 5 },
  deckListIcon:       { fontSize: 16 },
  deckListTitle:      { fontSize: FontSize.sm, fontWeight: '700', flex: 1 },
  deckListAction:     { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  deckListActionText: { color: Colors.textPrimary, fontWeight: '700', fontSize: FontSize.sm },

  // Clean list rows
  listContent: { paddingBottom: Spacing.xxl },
  listRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 3, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  listNum:     { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  listNumText: { fontSize: 10, fontWeight: '800' },
  listCheck:   { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  listCheckMark: { color: Colors.textPrimary, fontSize: 11, fontWeight: '800' },
  listThumb:   { width: 36, height: 36, borderRadius: Radius.sm, flexShrink: 0 },
  listBody:    { flex: 1, gap: 2 },
  listFront:   { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  listBack:    { fontSize: FontSize.xs, color: Colors.textMuted },
  listChevron: { color: Colors.textMuted, fontSize: 18 },

  // Legacy — kept so FlashcardScreens.tsx (chapter) still compiles
  fcCard:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 3, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  checkbox:   { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkmark:  { color: Colors.textPrimary, fontSize: 11, fontWeight: '800' },
  cardNum:    { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardNumText:{ fontSize: 10, fontWeight: '800' },
  fcThumb:    { width: 36, height: 36, borderRadius: Radius.sm, flexShrink: 0 },
  fcCardBody: { flex: 1, gap: 2 },
  fcFront:    { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  fcBack:     { fontSize: FontSize.xs, color: Colors.textMuted },

  // Flip card (preview + exam)
  previewHeader:    { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  previewContainer: { flex: 1, padding: Spacing.lg, justifyContent: 'center' },
  flashcard:        { borderRadius: Radius.xl, borderWidth: 1.5, padding: Spacing.xl, alignItems: 'center', gap: Spacing.lg, minHeight: 300, justifyContent: 'center' },
  sidePill:         { borderRadius: 999, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 1 },
  sideLabel:        { fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 2.5 },
  flashcardImg:     { width: '100%', height: 160, borderRadius: Radius.md },
  audioPlayerWrap:  { alignSelf: 'stretch', marginTop: Spacing.xs },
  flashcardText:    { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center', lineHeight: 28 },
  tapHint:          { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },

  examHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  examProgress: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  progressBar:  { height: 3, backgroundColor: Colors.border },
  progressFill: { height: 3 },
  sessionBody:  { flex: 1, padding: Spacing.lg, gap: Spacing.lg },

  ratingRow:  { flexDirection: 'row', gap: Spacing.sm },
  ratingBtn:  { flex: 1, borderRadius: Radius.lg, paddingVertical: Spacing.md + 4, alignItems: 'center', gap: Spacing.xs, borderWidth: 1.5 },
  ratingIcon: { fontSize: 26, fontWeight: '800' },
  ratingLabel:{ fontSize: FontSize.sm, fontWeight: '700' },
  ratingHint: { textAlign: 'center', fontSize: FontSize.sm, color: Colors.textMuted },

  scoreCard:   { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.lg },
  scoreEmoji:  { fontSize: 52 },
  scoreLabel:  { fontSize: FontSize.lg, fontWeight: '700', marginTop: Spacing.xs },
  scorePct:    { fontSize: 56, fontWeight: '900', letterSpacing: -2 },
  scoreDetail: { fontSize: FontSize.sm, color: Colors.textSecondary },

  statsRow:  { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statBox:   { flex: 1, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, alignItems: 'center', gap: 2 },
  statNum:   { fontSize: FontSize.xxl, fontWeight: '900' },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },

  breakdownTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  breakRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm + 2, marginBottom: Spacing.sm },
  breakThumb: { width: 36, height: 36, borderRadius: Radius.sm, flexShrink: 0 },
  breakText:  { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  resultDot:      { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  resultDotText:  { fontSize: FontSize.md, fontWeight: '800' },

  resultsActions: { gap: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.xl },
  retryBtn:    { borderWidth: 1.5, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  retryText:   { fontSize: FontSize.md, fontWeight: '700' },
  doneBtn:     { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  doneBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: FontSize.md },
});

// ─── Re-export Solo screens (extracted to SoloScreensContent.tsx) ──
export { SoloDecksScreen, SoloDeckStudyScreen, SoloExamScreen } from './SoloScreensContent';