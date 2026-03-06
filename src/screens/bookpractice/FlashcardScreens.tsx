import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, Radius } from '../../constants/theme';
import { Book, Chapter, ChapterFlashcard as Flashcard } from '../../types';
import { getChapterFlashcards } from '../../api/content';
import { s, imgUrl, BACK_COLOR, ZoomableImage, Empty } from './practiceShared';
import { AudioPlayer } from '../../components/shared/AudioPlayer';
import { CardListHeader, SelectionBar } from '../../components/shared/Cardlistheader';
import { CardListItem } from '../../components/shared/Cardlistitem';
import { exportJson } from '../../utils/exportJson';

// ─── Flashcards List ───────────────────────────────────────────
export const FlashcardsScreen: React.FC<{
  book: Book; chapter: Chapter;
  onSingle: (c: Flashcard) => void;
  onExam:   (cards: Flashcard[]) => void;
  onBack:   () => void;
}> = ({ book, chapter, onSingle, onExam, onBack }) => {
  const [cards, setCards]         = useState<Flashcard[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected]   = useState<Set<string>>(new Set());

  useEffect(() => { getChapterFlashcards(chapter.id).then(setCards).finally(() => setLoading(false)); }, []);

  const cancelSelect = () => { setSelecting(false); setSelected(new Set()); };
  const toggleSelect = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const allSelected = selected.size === cards.length && cards.length > 0;

  const handleExportSelected = async () => {
    const chosen = cards.filter(c => selected.has(c.id));
    if (!chosen.length) return;
    const payload = {
      version: 1, exportedAt: new Date().toISOString(), type: 'chapter_flashcards',
      chapter: { title: chapter.title, number: chapter.number },
      cards: chosen.map(c => ({ front: c.front, back: c.back })),
    };
    const slug = chapter.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    await exportJson(payload, `flashcards-${slug}.json`);
    cancelSelect();
  };

  // Right-action: Review button (exam) when not selecting; Go button when selecting
  const rightAction = !loading && cards.length > 0
    ? selecting
      ? <Pressable
          onPress={() => { onExam(cards.filter(c => selected.has(c.id))); cancelSelect(); }}
          disabled={selected.size === 0}
          style={[ls.actionBtn, { backgroundColor: book.color, opacity: selected.size === 0 ? 0.4 : 1 }]}>
          <Text style={ls.actionBtnText}>Go {selected.size > 0 ? `(${selected.size})` : ''}</Text>
        </Pressable>
      : <Pressable
          onPress={() => setSelecting(true)}
          style={[ls.actionBtn, { backgroundColor: book.color + '22', borderWidth: 1, borderColor: book.color + '55' }]}>
          <Text style={[ls.actionBtnText, { color: book.color }]}>Review</Text>
        </Pressable>
    : undefined;

  return (
    <SafeAreaView style={s.safe}>
      <CardListHeader
        accentColor={book.color}
        badge={
          <View style={[ls.chPill, { backgroundColor: book.color + '30' }]}>
            <Text style={[ls.chPillText, { color: book.color }]}>CH {chapter.number}</Text>
          </View>
        }
        title={chapter.title}
        onBack={selecting ? cancelSelect : onBack}
        selecting={selecting}
        rightAction={rightAction}
      />
      {selecting && (
        <SelectionBar
          count={selected.size} total={cards.length}
          accentColor={book.color} allSelected={allSelected}
          onSelectAll={() => setSelected(allSelected ? new Set() : new Set(cards.map(c => c.id)))}
          onExport={handleExportSelected}
        />
      )}

      <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
        {!loading && !selecting && cards.length > 0 && (
          <View style={ls.hint}><Text style={ls.hintText}>long-press a card to select for export</Text></View>
        )}
        {loading
          ? <ActivityIndicator style={{ marginTop: Spacing.xl }} color={book.color} />
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
                  accentColor={book.color}
                  selecting={selecting}
                  selected={selected.has(card.id)}
                  onPress={() => selecting ? toggleSelect(card.id) : onSingle(card)}
                  onLongPress={() => { if (!selecting) { setSelecting(true); setSelected(new Set([card.id])); } }}
                />
              ))
        }
      </ScrollView>
    </SafeAreaView>
  );
};

const ls = StyleSheet.create({
  chPill:        { borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  chPillText:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  actionBtn:     { borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  actionBtnText: { color: Colors.textPrimary, fontWeight: '700', fontSize: FontSize.sm },
  hint:          { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  hintText:      { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic' },
});

// ─── Single Card View ──────────────────────────────────────────
// FIX: BackButton must be inside SafeAreaView — we use a plain View header row
// so the back link sits properly below the status bar, not overlapping it.
export const SingleCardScreen: React.FC<{ card: Flashcard; book: Book; onBack: () => void }> = ({ card, book, onBack }) => {
  const [flipped, setFlipped] = useState(false);
  const fUrl     = imgUrl(card, 'front_image');
  const bUrl     = imgUrl(card, 'back_image');
  const fAudio   = imgUrl(card, 'front_audio' as any);
  const bAudio   = imgUrl(card, 'back_audio' as any);
  const shownImg   = flipped ? bUrl   : fUrl;
  const shownAudio = flipped ? bAudio : fAudio;
  const sideColor  = flipped ? BACK_COLOR : book.color;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header row — inside SafeAreaView so it's below the status bar */}
      <View style={sc.header}>
        <Pressable onPress={onBack} hitSlop={8}>
          <Text style={sc.backText}>← Flashcards</Text>
        </Pressable>
      </View>
      <View style={s.previewContainer}>
        <Pressable onPress={() => setFlipped(f => !f)}
          style={[s.flashcard, { borderColor: sideColor + '55', backgroundColor: sideColor + '08' }]}>
          <View style={[s.sidePill, { backgroundColor: sideColor + '22' }]}>
            <Text style={[s.sideLabel, { color: sideColor }]}>{flipped ? 'BACK' : 'FRONT'}</Text>
          </View>
          {shownImg ? <ZoomableImage uri={shownImg} style={s.flashcardImg} /> : null}
          <Text style={s.flashcardText}>{flipped ? (card.back || '—') : (card.front || '—')}</Text>
          {shownAudio && <View style={s.audioPlayerWrap}><AudioPlayer uri={shownAudio} accentColor={sideColor} /></View>}
          <Text style={s.tapHint}>tap to flip{shownImg ? ' · tap image to zoom' : ''}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const sc = StyleSheet.create({
  header:  { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
             borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  backText:{ color: Colors.accentLight, fontSize: FontSize.md, fontWeight: '500' },
});

// ─── Exam Screen ───────────────────────────────────────────────
export const ExamScreen: React.FC<{
  cards: Flashcard[]; book: Book; chapter: Chapter; onBack: () => void;
}> = ({ cards: initialCards, book, chapter, onBack }) => {
  const [phase, setPhase]         = useState<'session' | 'results'>('session');
  const [deckCards, setDeckCards] = useState<Flashcard[]>(() => [...initialCards].sort(() => Math.random() - 0.5));
  const [idx, setIdx]             = useState(0);
  const [flipped, setFlipped]     = useState(false);
  const [results, setResults]     = useState<Record<string, 'know' | 'unsure' | 'missed'>>({});

  const current    = deckCards[idx];
  const sideColor  = flipped ? BACK_COLOR : book.color;
  const shownImg   = flipped ? imgUrl(current, 'back_image')       : imgUrl(current, 'front_image');
  const shownAudio = flipped ? imgUrl(current, 'back_audio' as any): imgUrl(current, 'front_audio' as any);

  const rate = (r: 'know' | 'unsure' | 'missed') => {
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
        <View style={[s.progressFill, { width: `${(idx / deckCards.length) * 100}%` as any, backgroundColor: book.color }]} />
      </View>
      <View style={s.sessionBody}>
        <Pressable onPress={() => setFlipped(f => !f)}
          style={[s.flashcard, { borderColor: sideColor + '55', backgroundColor: sideColor + '08' }]}>
          <View style={[s.sidePill, { backgroundColor: sideColor + '22' }]}>
            <Text style={[s.sideLabel, { color: sideColor }]}>{flipped ? 'ANSWER' : 'QUESTION'}</Text>
          </View>
          {shownImg ? <ZoomableImage uri={shownImg} style={s.flashcardImg} /> : null}
          <Text style={s.flashcardText}>{flipped ? (current.back || '—') : (current.front || '—')}</Text>
          {shownAudio && <View style={s.audioPlayerWrap}><AudioPlayer uri={shownAudio} accentColor={sideColor} /></View>}
          {!flipped && <Text style={s.tapHint}>tap to reveal answer</Text>}
        </Pressable>
        {flipped ? (
          <View style={s.ratingRow}>
            {(['missed', 'unsure', 'know'] as const).map(r => {
              const cfg = { missed: [Colors.error, '✗', 'Missed'], unsure: [Colors.warning, '〜', 'Unsure'], know: [Colors.success, '✓', 'Got it'] }[r];
              return (
                <Pressable key={r} onPress={() => rate(r)} style={[s.ratingBtn, { backgroundColor: cfg[0] + '18', borderColor: cfg[0] + '66' }]}>
                  <Text style={[s.ratingIcon, { color: cfg[0] }]}>{cfg[1]}</Text>
                  <Text style={[s.ratingLabel, { color: cfg[0] }]}>{cfg[2]}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : <Text style={s.ratingHint}>Rate yourself after revealing the answer</Text>}
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
          {[['Got it', knowCount, Colors.success], ['Unsure', unsureCount, Colors.warning], ['Missed', missedCount, Colors.error]].map(([lbl, n, col]: any) => (
            <View key={lbl} style={[s.statBox, { borderColor: col + '33', backgroundColor: col + '08' }]}>
              <Text style={[s.statNum, { color: col }]}>{n}</Text>
              <Text style={s.statLabel}>{lbl}</Text>
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
              <View style={[s.cardNum, { backgroundColor: book.color + '22' }]}>
                <Text style={[s.cardNumText, { color: book.color }]}>{i + 1}</Text>
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
            <Pressable onPress={retryWrong} style={[s.retryBtn, { backgroundColor: book.color + '18', borderColor: book.color + '55' }]}>
              <Text style={[s.retryText, { color: book.color }]}>🔁 Retry {missedCount + unsureCount} missed cards</Text>
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