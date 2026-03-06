import React, { useState, useEffect } from 'react';
import { Book, Chapter, ChapterFlashcard as Flashcard, SoloDeck, SoloFlashcard } from '../../types';
import { BookListScreen, ChapterListScreen, ChapterViewScreen } from './BookChapterScreens';
import { FlashcardsScreen, SingleCardScreen, ExamScreen } from './FlashcardScreens';
import { SoloDecksScreen, SoloDeckStudyScreen, SoloExamScreen } from './SoloScreens';

type NavView =
  | { screen: 'books' }
  | { screen: 'chapters'; book: Book }
  | { screen: 'chapter'; book: Book; chapter: Chapter }
  | { screen: 'flashcards'; book: Book; chapter: Chapter }
  | { screen: 'flashcardSingle'; book: Book; chapter: Chapter; card: Flashcard }
  | { screen: 'flashcardExam'; book: Book; chapter: Chapter; cards: Flashcard[] }
  | { screen: 'soloDecks' }
  | { screen: 'soloCards'; deck: SoloDeck }
  | { screen: 'soloExam'; deck: SoloDeck; cards: SoloFlashcard[] };

interface BookPracticeScreenProps {
  onDeepNav?: (deep: boolean) => void;
}

export const BookPracticeScreen: React.FC<BookPracticeScreenProps> = ({ onDeepNav }) => {
  const [nav, setNav] = useState<NavView>({ screen: 'books' });
  const go = (v: NavView) => setNav(v);

  useEffect(() => {
    onDeepNav?.(nav.screen !== 'books');
  }, [nav.screen]);

  if (nav.screen === 'chapters')
    return <ChapterListScreen book={nav.book}
      onChapter={ch => go({ screen: 'chapter', book: nav.book, chapter: ch })}
      onBack={() => go({ screen: 'books' })} />;

  if (nav.screen === 'chapter')
    return <ChapterViewScreen book={nav.book} chapter={nav.chapter}
      onFlashcards={() => go({ screen: 'flashcards', book: nav.book, chapter: nav.chapter })}
      onBack={() => go({ screen: 'chapters', book: nav.book })} />;

  if (nav.screen === 'flashcards')
    return <FlashcardsScreen book={nav.book} chapter={nav.chapter}
      onSingle={card => go({ screen: 'flashcardSingle', book: nav.book, chapter: nav.chapter, card })}
      onExam={cards => go({ screen: 'flashcardExam', book: nav.book, chapter: nav.chapter, cards })}
      onBack={() => go({ screen: 'chapter', book: nav.book, chapter: nav.chapter })} />;

  if (nav.screen === 'flashcardSingle')
    return <SingleCardScreen card={nav.card} book={nav.book}
      onBack={() => go({ screen: 'flashcards', book: nav.book, chapter: nav.chapter })} />;

  if (nav.screen === 'flashcardExam')
    return <ExamScreen cards={nav.cards} book={nav.book} chapter={nav.chapter}
      onBack={() => go({ screen: 'flashcards', book: nav.book, chapter: nav.chapter })} />;

  if (nav.screen === 'soloDecks')
    return <SoloDecksScreen
      onDeck={deck => go({ screen: 'soloCards', deck })}
      onBack={() => go({ screen: 'books' })} />;

  if (nav.screen === 'soloCards')
    return <SoloDeckStudyScreen deck={nav.deck}
      onExam={cards => go({ screen: 'soloExam', deck: nav.deck, cards })}
      onBack={() => go({ screen: 'soloDecks' })} />;

  if (nav.screen === 'soloExam')
    return <SoloExamScreen deck={nav.deck} cards={nav.cards}
      onBack={() => go({ screen: 'soloCards', deck: nav.deck })} />;

  return <BookListScreen
    onBook={book => go({ screen: 'chapters', book })}
    onSoloDecks={() => go({ screen: 'soloDecks' })} />;
};