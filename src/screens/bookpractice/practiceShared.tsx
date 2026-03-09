import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Image, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { SoloDeck, SoloFlashcard } from '../../types';
import { getSoloDecks, getSoloFlashcards } from '../../api/content';
import { ImageLightbox } from '../../components/shared/ImageLightbox';
import { AudioPlayer } from '../../components/shared/AudioPlayer';
import { CardListItem } from '../../components/shared/CardListItem';
import { CardListHeader, SelectionBar } from '../../components/shared/CardListHeader';
import { exportJson } from '../../utils/exportJson';
import { getFavorites, toggleFavorite } from '../../utils/favorites';
import { getHidden, toggleHidden } from '../../utils/hidden';
import { useAuth } from '../../context/AuthContext';

// ─── Constants ─────────────────────────────────────────────────
// FRONT side always uses the book/deck's accent color.
// BACK  side always uses this purple so you always know which side you're on.
// Solo flashcard back color — fixed teal, never in the deck color palette so always distinct from front
export const BACK_COLOR = '#38BFA1';

// ─── Helpers ───────────────────────────────────────────────────
// With SQLite, file fields store full local URIs directly — no PocketBase URL needed
export const imgUrl = (card: any, field: 'front_image' | 'back_image' | 'image'): string | null => {
  const f = card?.[field]; if (!f) return null;
  return String(f);
};

// ─── Shared atoms ──────────────────────────────────────────────
export const BackButton: React.FC<{ onPress: () => void; label: string }> = ({ onPress, label }) => (
  <Pressable onPress={onPress} style={s.backBtnWrap}>
    <Text style={s.backText}>← {label}</Text>
  </Pressable>
);

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
    if (m[1] !== undefined) parts.push({ t: m[1], b: true,  i: false });
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
// Wraps a flashcard image so tapping it opens the lightbox.
// The Pressable must inherit width from its parent — alignSelf:'stretch' ensures
// that width:'100%' on the Image resolves correctly (without this the Pressable
// has no intrinsic width and the image collapses to 0).
export const ZoomableImage: React.FC<{ uri: string; style?: any }> = ({ uri, style }) => {
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  return (
    <>
      <Pressable
        onPress={() => setLightboxUri(uri)}
        hitSlop={4}
        style={{ alignSelf: 'stretch' }}
      >
        <Image source={{ uri }} style={[{ width: '100%' }, style]} resizeMode="contain" />
      </Pressable>
      <ImageLightbox uri={lightboxUri} onClose={() => setLightboxUri(null)} />
    </>
  );
};

// ─── Solo Decks List ───────────────────────────────────────────
// ─── Solo deck context menu ────────────────────────────────────
const DeckContextMenu: React.FC<{
  visible: boolean; title: string; isHidden: boolean; isPinned: boolean;
  onHide: () => void; onPin: () => void; onClose: () => void;
}> = ({ visible, title, isHidden, isPinned, onHide, onPin, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={dcm.overlay} onPress={onClose}>
      <View style={dcm.box}>
        <Text style={dcm.label} numberOfLines={1}>{title}</Text>
        <Pressable onPress={() => { onPin(); onClose(); }} style={dcm.row}>
          <Text style={dcm.rowIcon}>{isPinned ? '★' : '☆'}</Text>
          <Text style={dcm.rowText}>{isPinned ? 'Unpin' : 'Pin to top'}</Text>
        </Pressable>
        <Pressable onPress={() => { onHide(); onClose(); }} style={dcm.row}>
          <Text style={dcm.rowIcon}>{isHidden ? '👁️' : '🙈'}</Text>
          <Text style={dcm.rowText}>{isHidden ? 'Show for students' : 'Hide from students'}</Text>
        </Pressable>
        <Pressable onPress={onClose} style={[dcm.row, dcm.cancelRow]}>
          <Text style={dcm.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Pressable>
  </Modal>
);
const dcm = {
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' as const, padding: Spacing.lg },
  box:        { backgroundColor: '#1E1E2E', borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' as const },
  label:      { fontSize: FontSize.xs, fontWeight: '700' as const, color: Colors.textMuted, textAlign: 'center' as const, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, letterSpacing: 0.5, textTransform: 'uppercase' as const, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  row:        { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 14, paddingHorizontal: Spacing.lg, gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  rowIcon:    { fontSize: 18, width: 26 },
  rowText:    { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '500' as const },
  cancelRow:  { borderBottomWidth: 0 },
  cancelText: { flex: 1, textAlign: 'center' as const, fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' as const },
};

export const SoloDecksScreen: React.FC<{ onDeck: (d: SoloDeck) => void; onBack: () => void }> = ({ onDeck, onBack }) => {
  const { isAdmin } = useAuth();
  const [decks, setDecks]   = useState<SoloDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [menu, setMenu]     = useState<SoloDeck | null>(null);

  useEffect(() => {
    Promise.all([getSoloDecks(), getFavorites('deck'), getHidden('deck')])
      .then(([d, p, h]) => { setDecks(d); setPinned(p); setHidden(h); })
      .finally(() => setLoading(false));
  }, []);

  const handlePin = async (id: string) => {
    await toggleFavorite('deck', id);
    setPinned(await getFavorites('deck'));
  };

  const handleToggleHide = async (id: string) => {
    await toggleHidden('deck', id);
    setHidden(await getHidden('deck'));
  };

  const visible = isAdmin ? decks : decks.filter(d => !hidden.has(d.id));

  const sorted = [...visible].sort((a, b) => {
    const ap = pinned.has(a.id) ? 0 : 1;
    const bp = pinned.has(b.id) ? 0 : 1;
    return ap - bp;
  });

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <BackButton onPress={onBack} label="Study" />
        <Text style={s.pageTitle}>Solo Decks</Text>
        <Text style={s.pageSubtitle}>Standalone flashcard sets</Text>
        {loading
          ? <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />
          : visible.length === 0
            ? <Empty icon="💡" title="No solo decks yet" subtitle="Decks will appear here once added" />
            : <>
                {pinned.size > 0 && <Text style={s.sectionLabel}>PINNED</Text>}
                {sorted.map((deck, idx) => {
                  const isPinned = pinned.has(deck.id);
                  const isHid    = hidden.has(deck.id);
                  const isFirstUnpinned = idx > 0 && !isPinned && pinned.has(sorted[idx - 1].id);
                  return (
                    <React.Fragment key={deck.id}>
                      {isFirstUnpinned && <Text style={[s.sectionLabel, { marginTop: Spacing.md }]}>ALL DECKS</Text>}
                      <Pressable
                        onPress={() => onDeck(deck)}
                        onLongPress={() => isAdmin && setMenu(deck)}
                        delayLongPress={400}
                        style={({ pressed }) => [s.bookCard, pressed && s.pressed, isHid && { opacity: 0.45 }]}
                      >
                        <View style={[s.bookCover, { backgroundColor: deck.color + '33' }]}>
                          <Text style={{ fontSize: 22 }}>{deck.icon}</Text>
                        </View>
                        <View style={s.bookMeta}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={s.bookTitle}>{deck.title}</Text>
                            {isAdmin && isHid && <Text style={{ fontSize: 12 }}>🙈</Text>}
                          </View>
                        </View>
                        <Pressable onPress={() => handlePin(deck.id)} hitSlop={12} style={{ padding: 6 }}>
                          <Text style={{ fontSize: 20, opacity: isPinned ? 1 : 0.3 }}>⭐</Text>
                        </Pressable>
                        <Text style={s.chevron}>›</Text>
                      </Pressable>
                    </React.Fragment>
                  );
                })}
              </>
        }
      </ScrollView>
      {menu && (
        <DeckContextMenu
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

// ─── Solo Deck Study ───────────────────────────────────────────
export const SoloDeckStudyScreen: React.FC<{
  deck: SoloDeck;
  onExam: (cards: SoloFlashcard[]) => void;
  onBack: () => void;
}> = ({ deck, onExam, onBack }) => {
  const [cards, setCards]         = useState<SoloFlashcard[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [previewCard, setPreviewCard] = useState<SoloFlashcard | null>(null);
  const [flipped, setFlipped]     = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  useEffect(() => { getSoloFlashcards(deck.id).then(setCards).finally(() => setLoading(false)); }, []);

  const cancelSelect = () => { setSelecting(false); setSelected(new Set()); };
  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const allSelected = selected.size === cards.length && cards.length > 0;

  const handleExportSelected = async () => {
    const chosen = cards.filter(c => selected.has(c.id));
    if (!chosen.length) return;
    const payload = {
      version: 1, exportedAt: new Date().toISOString(), type: 'solo_deck',
      deck: { title: deck.title, icon: deck.icon, color: deck.color },
      cards: chosen.map(c => ({ front: c.front, back: c.back })),
    };
    const slug = deck.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    await exportJson(payload, `deck-${slug}.json`);
    cancelSelect();
  };

  // Preview card
  if (previewCard) {
    const shownImg   = flipped ? imgUrl(previewCard, 'back_image') : imgUrl(previewCard, 'front_image');
    const shownAudio = flipped ? imgUrl(previewCard, 'back_audio' as any) : imgUrl(previewCard, 'front_audio' as any);
    const sideColor  = flipped ? BACK_COLOR : deck.color;
    return (
      <SafeAreaView style={s.safe}>
        <ImageLightbox uri={lightboxUri} onClose={() => setLightboxUri(null)} />
        {/* Header row inside SafeAreaView — no floating buttons above safe area */}
        <View style={s.previewHeader}>
          <Pressable onPress={() => { setPreviewCard(null); setFlipped(false); }} hitSlop={8}>
            <Text style={s.backText}>← Flashcards</Text>
          </Pressable>
        </View>
        <View style={s.previewContainer}>
          <Pressable onPress={() => setFlipped(f => !f)}
            style={[s.flashcard, { borderColor: sideColor + '55', backgroundColor: sideColor + '08' }]}>
            <View style={[s.sidePill, { backgroundColor: sideColor + '22' }]}>
              <Text style={[s.sideLabel, { color: sideColor }]}>{flipped ? 'BACK' : 'FRONT'}</Text>
            </View>
            {shownImg
              ? <Pressable onPress={() => setLightboxUri(shownImg!)} hitSlop={4} style={{ alignSelf: 'stretch' }}>
                  <Image source={{ uri: shownImg! }} style={s.flashcardImg} resizeMode="contain" />
                </Pressable>
              : null}
            <Text style={s.flashcardText}>
              {flipped ? (previewCard.back || '—') : (previewCard.front || '—')}
            </Text>
            {shownAudio && (
              <View style={s.audioPlayerWrap}>
                <AudioPlayer uri={shownAudio} accentColor={sideColor} />
              </View>
            )}
            <Text style={s.tapHint}>tap card to flip{shownImg ? ' · tap image to zoom' : ''}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Right-action button
  const rightAction = !loading && cards.length > 0
    ? selecting
      ? <Pressable
          onPress={() => { onExam(cards.filter(c => selected.has(c.id))); cancelSelect(); }}
          disabled={selected.size === 0}
          style={[s.deckListAction, { backgroundColor: deck.color, opacity: selected.size === 0 ? 0.4 : 1 }]}>
          <Text style={s.deckListActionText}>Go {selected.size > 0 ? `(${selected.size})` : ''}</Text>
        </Pressable>
      : <Pressable
          onPress={() => setSelecting(true)}
          style={[s.deckListAction, { backgroundColor: deck.color + '22', borderWidth: 1, borderColor: deck.color + '55' }]}>
          <Text style={[s.deckListActionText, { color: deck.color }]}>Review</Text>
        </Pressable>
    : undefined;


  return (
    <SafeAreaView style={s.safe}>
      <CardListHeader
        accentColor={deck.color}
        badge={<Text style={{ fontSize: 16 }}>{deck.icon}</Text>}
        title={deck.title}
        onBack={selecting ? cancelSelect : onBack}
        selecting={selecting}
        rightAction={rightAction}
      />
      {selecting && (
        <SelectionBar
          count={selected.size} total={cards.length}
          accentColor={deck.color} allSelected={allSelected}
          onSelectAll={() => setSelected(allSelected ? new Set() : new Set(cards.map(c => c.id)))}
          onExport={handleExportSelected}
        />
      )}

      <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
        {loading
          ? <ActivityIndicator style={{ marginTop: Spacing.xl }} color={deck.color} />
          : cards.length === 0
            ? <Empty icon="🃏" title="No flashcards yet" subtitle="Check back when cards are added" />
            : cards.map((card, i) => (
                <CardListItem
                  key={card.id}
                  index={i}
                  front={card.front}
                  back={card.back}
                  thumbUri={imgUrl(card, 'front_image')}
                  hasAudio={!!(card as any).front_audio || !!(card as any).back_audio}
                  accentColor={deck.color}
                  selecting={selecting}
                  selected={selected.has(card.id)}
                  onPress={() => selecting ? toggleSelect(card.id) : setPreviewCard(card)}
                  onLongPress={() => { if (!selecting) { setSelecting(true); setSelected(new Set([card.id])); } }}
                />
              ))
        }
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Solo Exam ─────────────────────────────────────────────────
type Rating = 'know' | 'unsure' | 'missed';

export const SoloExamScreen: React.FC<{
  deck: SoloDeck;
  cards: SoloFlashcard[];
  onBack: () => void;
}> = ({ deck, cards: initialCards, onBack }) => {
  const [phase, setPhase] = useState<'session' | 'results'>('session');
  const [deckCards, setDeckCards] = useState<SoloFlashcard[]>(() => [...initialCards].sort(() => Math.random() - 0.5));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Record<string, Rating>>({});

  const current = deckCards[idx];
  // FRONT = deck color, BACK = purple
  const sideColor = flipped ? BACK_COLOR : deck.color;
  const shownImg = flipped ? imgUrl(current, 'back_image') : imgUrl(current, 'front_image');
  const shownAudio = flipped ? imgUrl(current, 'back_audio' as any) : imgUrl(current, 'front_audio' as any);

  const rate = (r: Rating) => {
    setResults(prev => ({ ...prev, [current.id]: r }));
    if (idx < deckCards.length - 1) { setIdx(i => i + 1); setFlipped(false); }
    else setPhase('results');
  };

  const retryWrong = () => {
    setDeckCards(deckCards.filter(c => results[c.id] !== 'know').sort(() => Math.random() - 0.5));
    setIdx(0); setFlipped(false); setResults({}); setPhase('session');
  };

  if (phase === 'session') return (
    <SafeAreaView style={s.safe}>
      <View style={s.examHeader}>
        <Pressable onPress={onBack}><Text style={s.backText}>✕ Quit</Text></Pressable>
        <Text style={s.examProgress}>{idx + 1} / {deckCards.length}</Text>
        <View style={{ width: 56 }} />
      </View>
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${(idx / deckCards.length) * 100}%` as any, backgroundColor: deck.color }]} />
      </View>
      <View style={s.sessionBody}>
        <Pressable onPress={() => setFlipped(f => !f)}
          style={[s.flashcard, { borderColor: sideColor + '55', backgroundColor: sideColor + '08' }]}>
          <View style={[s.sidePill, { backgroundColor: sideColor + '22' }]}>
            <Text style={[s.sideLabel, { color: sideColor }]}>{flipped ? 'ANSWER' : 'QUESTION'}</Text>
          </View>
          {shownImg
            ? <ZoomableImage uri={shownImg} style={s.flashcardImg} />
            : null}
          <Text style={s.flashcardText}>
            {flipped ? (current.back || '(no text)') : (current.front || '(no text)')}
          </Text>
          {shownAudio && (
            <View style={s.audioPlayerWrap}>
              <AudioPlayer uri={shownAudio} accentColor={sideColor} />
            </View>
          )}
          {!flipped && <Text style={s.tapHint}>tap to reveal answer</Text>}
        </Pressable>
        {flipped ? (
          <View style={s.ratingRow}>
            <Pressable onPress={() => rate('missed')} style={[s.ratingBtn, { backgroundColor: Colors.error + '18', borderColor: Colors.error + '66' }]}>
              <Text style={[s.ratingIcon, { color: Colors.error }]}>✗</Text>
              <Text style={[s.ratingLabel, { color: Colors.error }]}>Missed</Text>
            </Pressable>
            <Pressable onPress={() => rate('unsure')} style={[s.ratingBtn, { backgroundColor: Colors.warning + '18', borderColor: Colors.warning + '66' }]}>
              <Text style={[s.ratingIcon, { color: Colors.warning }]}>〜</Text>
              <Text style={[s.ratingLabel, { color: Colors.warning }]}>Unsure</Text>
            </Pressable>
            <Pressable onPress={() => rate('know')} style={[s.ratingBtn, { backgroundColor: Colors.success + '18', borderColor: Colors.success + '66' }]}>
              <Text style={[s.ratingIcon, { color: Colors.success }]}>✓</Text>
              <Text style={[s.ratingLabel, { color: Colors.success }]}>Got it</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={s.ratingHint}>Rate yourself after revealing the answer</Text>
        )}
      </View>
    </SafeAreaView>
  );

  const knowCount   = Object.values(results).filter(r => r === 'know').length;
  const unsureCount = Object.values(results).filter(r => r === 'unsure').length;
  const missedCount = Object.values(results).filter(r => r === 'missed').length;
  const pct = Math.round((knowCount / deckCards.length) * 100);
  const grade = pct >= 90 ? { emoji: '🏆', label: 'Excellent!',      color: Colors.success }
    : pct >= 70           ? { emoji: '👍', label: 'Good job!',       color: Colors.accent  }
    : pct >= 50           ? { emoji: '📚', label: 'Keep going',      color: Colors.warning }
    :                       { emoji: '💪', label: 'Keep practicing', color: Colors.error   };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={[s.scoreCard, { borderColor: grade.color + '33', backgroundColor: grade.color + '0A' }]}>
          <Text style={s.scoreEmoji}>{grade.emoji}</Text>
          <Text style={[s.scoreLabel, { color: grade.color }]}>{grade.label}</Text>
          <Text style={[s.scorePct, { color: grade.color }]}>{pct}%</Text>
          <Text style={s.scoreDetail}>{knowCount} of {deckCards.length} cards correct</Text>
        </View>
        <View style={s.statsRow}>
          {[
            { n: knowCount,   label: 'Got it', color: Colors.success },
            { n: unsureCount, label: 'Unsure', color: Colors.warning },
            { n: missedCount, label: 'Missed', color: Colors.error   },
          ].map(st => (
            <View key={st.label} style={[s.statBox, { borderColor: st.color + '33', backgroundColor: st.color + '08' }]}>
              <Text style={[s.statNum, { color: st.color }]}>{st.n}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>
        <Text style={s.breakdownTitle}>Card Breakdown</Text>
        {deckCards.map((card, i) => {
          const r = results[card.id];
          const rColor = r === 'know' ? Colors.success : r === 'unsure' ? Colors.warning : Colors.error;
          const rIcon  = r === 'know' ? '✓' : r === 'unsure' ? '〜' : '✗';
          const fUrl = imgUrl(card, 'front_image');
          return (
            <View key={card.id} style={s.breakRow}>
              <View style={[s.cardNum, { backgroundColor: deck.color + '22' }]}>
                <Text style={[s.cardNumText, { color: deck.color }]}>{i + 1}</Text>
              </View>
              {fUrl && <Image source={{ uri: fUrl }} style={s.breakThumb} resizeMode="cover" />}
              <Text style={s.breakText} numberOfLines={2}>{card.front || '(image)'}</Text>
              <View style={[s.resultDot, { backgroundColor: rColor + '22' }]}>
                <Text style={[s.resultDotText, { color: rColor }]}>{rIcon}</Text>
              </View>
            </View>
          );
        })}
        <View style={s.resultsActions}>
          {missedCount + unsureCount > 0 && (
            <Pressable onPress={retryWrong} style={[s.retryBtn, { backgroundColor: deck.color + '18', borderColor: deck.color + '55' }]}>
              <Text style={[s.retryText, { color: deck.color }]}>🔁 Retry {missedCount + unsureCount} missed cards</Text>
            </Pressable>
          )}
          <Pressable onPress={onBack} style={s.doneBtn}>
            <Text style={s.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
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

  // ── Deck list header ──
  deckListHeader:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
                        borderBottomWidth: 1 },
  deckListBack:       { paddingRight: Spacing.xs },
  deckListBadge:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                        borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 5 },
  deckListIcon:       { fontSize: 16 },
  deckListTitle:      { fontSize: FontSize.sm, fontWeight: '700', flex: 1 },
  deckListAction:     { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  deckListActionText: { color: Colors.textPrimary, fontWeight: '700', fontSize: FontSize.sm },

  // ── Clean list rows ──
  listContent: { paddingBottom: Spacing.xxl },
  listRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                 paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 3,
                 borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  listNum:     { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  listNumText: { fontSize: 10, fontWeight: '800' },
  listCheck:   { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border,
                 alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  listCheckMark:{ color: Colors.textPrimary, fontSize: 11, fontWeight: '800' },
  listThumb:   { width: 36, height: 36, borderRadius: Radius.sm, flexShrink: 0 },
  listBody:    { flex: 1, gap: 2 },
  listFront:   { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  listBack:    { fontSize: FontSize.xs, color: Colors.textMuted },
  listChevron: { color: Colors.textMuted, fontSize: 18 },

  // Legacy — kept so FlashcardScreens.tsx (chapter) still compiles
  fcCard:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 3,
                borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  checkbox:   { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkmark:  { color: Colors.textPrimary, fontSize: 11, fontWeight: '800' },
  cardNum:    { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardNumText:{ fontSize: 10, fontWeight: '800' },
  fcThumb:    { width: 36, height: 36, borderRadius: Radius.sm, flexShrink: 0 },
  fcCardBody: { flex: 1, gap: 2 },
  fcFront:    { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  fcBack:     { fontSize: FontSize.xs, color: Colors.textMuted },

  // Flip card (preview + exam)
  previewHeader:    { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
                      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
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

  // Rating buttons — icon color applied inline per button
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