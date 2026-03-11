import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, ScrollView,
  ActivityIndicator, Image, Modal,
} from 'react-native';
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
import {
  BACK_COLOR, imgUrl,
  BackButton, Empty, ZoomableImage,
  s,
} from './practiceShared';

// ─── Deck context menu ────────────────────────────────────────────
const DeckContextMenu: React.FC<{
  visible:   boolean;
  title:     string;
  isHidden:  boolean;
  isPinned:  boolean;
  onHide:    () => void;
  onPin:     () => void;
  onClose:   () => void;
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

// ─── Solo Decks List ──────────────────────────────────────────────
export const SoloDecksScreen: React.FC<{
  onDeck: (d: SoloDeck) => void;
  onBack: () => void;
}> = ({ onDeck, onBack }) => {
  const { isAdmin } = useAuth();
  const [decks,   setDecks]   = useState<SoloDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinned,  setPinned]  = useState<Set<string>>(new Set());
  const [hidden,  setHidden]  = useState<Set<string>>(new Set());
  const [menu,    setMenu]    = useState<SoloDeck | null>(null);
  const [openingDeck, setOpeningDeck] = useState<string | null>(null);

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
  const sorted  = [...visible].sort((a, b) => {
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
                        onPress={async () => { setOpeningDeck(deck.id); await new Promise(r => setTimeout(r, 300)); onDeck(deck); setOpeningDeck(null); }}
                        onLongPress={() => isAdmin && setMenu(deck)}
                        delayLongPress={400}
                        disabled={openingDeck === deck.id}
                        style={({ pressed }) => [s.bookCard, pressed && s.pressed, isHid && { opacity: 0.45 }, openingDeck === deck.id && { opacity: 0.6 }]}
                      >
                        <View style={[s.bookCover, { backgroundColor: deck.color + '33' }]}>
                          {openingDeck === deck.id
                            ? <ActivityIndicator size="small" color={deck.color} />
                            : <Text style={{ fontSize: 22 }}>{deck.icon}</Text>
                          }
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

// ─── Solo Deck Study ──────────────────────────────────────────────
export const SoloDeckStudyScreen: React.FC<{
  deck:   SoloDeck;
  onExam: (cards: SoloFlashcard[]) => void;
  onBack: () => void;
}> = ({ deck, onExam, onBack }) => {
  const [cards,       setCards]       = useState<SoloFlashcard[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [selecting,   setSelecting]   = useState(false);
  const [previewCard, setPreviewCard] = useState<SoloFlashcard | null>(null);
  const [flipped,     setFlipped]     = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [backLoading, setBackLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

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
    const shownImg   = flipped ? imgUrl(previewCard, 'back_image')          : imgUrl(previewCard, 'front_image');
    const shownAudio = flipped ? imgUrl(previewCard, 'back_audio' as any)   : imgUrl(previewCard, 'front_audio' as any);
    const sideColor  = flipped ? BACK_COLOR : deck.color;
    return (
      <SafeAreaView style={s.safe}>
        <ImageLightbox uri={lightboxUri} onClose={() => setLightboxUri(null)} />
        <View style={s.previewHeader}>
          <Pressable
            onPress={async () => { setBackLoading(true); await new Promise(r => setTimeout(r, 300)); setPreviewCard(null); setFlipped(false); setBackLoading(false); }}
            disabled={backLoading}
            hitSlop={8}
            style={{ width: 100, height: 32, justifyContent: 'center' }}
          >
            {backLoading
              ? <ActivityIndicator size="small" color={Colors.accentLight} />
              : <Text style={s.backText}>← Flashcards</Text>
            }
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
                  onPress={async () => {
                    if (selecting) {
                      toggleSelect(card.id);
                    } else {
                      setPreviewLoading(card.id);
                      await new Promise(r => setTimeout(r, 300));
                      setPreviewCard(card);
                      setPreviewLoading(null);
                    }
                  }}
                  onLongPress={() => { if (!selecting) { setSelecting(true); setSelected(new Set([card.id])); } }}
                />
              ))
        }
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Solo Exam ────────────────────────────────────────────────────
type Rating = 'know' | 'unsure' | 'missed';

export const SoloExamScreen: React.FC<{
  deck:   SoloDeck;
  cards:  SoloFlashcard[];
  onBack: () => void;
}> = ({ deck, cards: initialCards, onBack }) => {
  const [phase,     setPhase]     = useState<'session' | 'results'>('session');
  const [deckCards, setDeckCards] = useState<SoloFlashcard[]>(() => [...initialCards].sort(() => Math.random() - 0.5));
  const [idx,       setIdx]       = useState(0);
  const [flipped,   setFlipped]   = useState(false);
  const [results,   setResults]   = useState<Record<string, Rating>>({});
  const [backLoading, setBackLoading] = useState(false);

  const current    = deckCards[idx];
  const sideColor  = flipped ? BACK_COLOR : deck.color;
  const shownImg   = flipped ? imgUrl(current, 'back_image')        : imgUrl(current, 'front_image');
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
        <Pressable
          onPress={async () => { setBackLoading(true); await new Promise(r => setTimeout(r, 300)); onBack(); }}
          disabled={backLoading}
          style={{ width: 56, height: 32, justifyContent: 'center' }}
        >
          {backLoading
            ? <ActivityIndicator size="small" color={Colors.accentLight} />
            : <Text style={s.backText}>✗ Quit</Text>
          }
        </Pressable>
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
          {shownImg ? <ZoomableImage uri={shownImg} style={s.flashcardImg} /> : null}
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
  const pct   = Math.round((knowCount / deckCards.length) * 100);
  const grade = pct >= 90 ? { emoji: '🏆', label: 'Excellent!',      color: Colors.success }
    : pct >= 70            ? { emoji: '👍', label: 'Good job!',       color: Colors.accent  }
    : pct >= 50            ? { emoji: '📚', label: 'Keep going',      color: Colors.warning }
    :                        { emoji: '💪', label: 'Keep practicing', color: Colors.error   };

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
          const r      = results[card.id];
          const rColor = r === 'know' ? Colors.success : r === 'unsure' ? Colors.warning : Colors.error;
          const rIcon  = r === 'know' ? '✓' : r === 'unsure' ? '〜' : '✗';
          const fUrl   = imgUrl(card, 'front_image');
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