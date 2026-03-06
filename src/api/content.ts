import pb from './pb';
import { Book, Chapter, ChapterFlashcard, SoloDeck, SoloFlashcard } from '../types';
import { ContentBlock } from '../types/blocks';

export const getBooks = async (): Promise<Book[]> => {
  const r = await pb.collection('books').getFullList({ sort: 'order,title', requestKey: null });
  return r as unknown as Book[];
};
export const createBook = async (d: Partial<Book>): Promise<Book> =>
  pb.collection('books').create(d) as unknown as Promise<Book>;
export const updateBook = async (id: string, d: Partial<Book>): Promise<Book> =>
  pb.collection('books').update(id, d) as unknown as Promise<Book>;
export const deleteBook = async (id: string) => pb.collection('books').delete(id);

export const getChapters = async (bookId: string): Promise<Chapter[]> => {
  const r = await pb.collection('chapters').getFullList({
    filter: `book = "${bookId}"`, sort: 'number',
    requestKey: null,
  });
  return r as unknown as Chapter[];
};
export const createChapter = async (d: Partial<Chapter>): Promise<Chapter> =>
  pb.collection('chapters').create(d) as unknown as Promise<Chapter>;
export const updateChapter = async (id: string, d: Partial<Chapter>): Promise<Chapter> =>
  pb.collection('chapters').update(id, d) as unknown as Promise<Chapter>;
export const deleteChapter = async (id: string) => pb.collection('chapters').delete(id);

export const getChapterFlashcards = async (chapterId: string): Promise<ChapterFlashcard[]> => {
  const r = await pb.collection('chapter_flashcards').getFullList({
    filter: `chapter = "${chapterId}"`, sort: 'order,created',
    requestKey: null,
  });
  return r as unknown as ChapterFlashcard[];
};
export const createChapterFlashcard = async (d: Partial<ChapterFlashcard>): Promise<ChapterFlashcard> =>
  pb.collection('chapter_flashcards').create(d) as unknown as Promise<ChapterFlashcard>;
export const updateChapterFlashcard = async (id: string, d: Partial<ChapterFlashcard>): Promise<ChapterFlashcard> =>
  pb.collection('chapter_flashcards').update(id, d) as unknown as Promise<ChapterFlashcard>;
export const deleteChapterFlashcard = async (id: string) => pb.collection('chapter_flashcards').delete(id);

export const getChapter = async (id: string): Promise<Chapter> => {
  const r = await pb.collection('chapters').getOne(id, { requestKey: null });
  return r as unknown as Chapter;
};

// ─── Solo Decks ───────────────────────────────────────────────
export const getSoloDecks = async (): Promise<SoloDeck[]> => {
  const r = await pb.collection('solo_decks').getFullList({ sort: 'created', requestKey: null });
  return r as unknown as SoloDeck[];
};
export const createSoloDeck = async (d: Partial<SoloDeck>): Promise<SoloDeck> =>
  pb.collection('solo_decks').create(d) as unknown as Promise<SoloDeck>;
export const updateSoloDeck = async (id: string, d: Partial<SoloDeck>): Promise<SoloDeck> =>
  pb.collection('solo_decks').update(id, d) as unknown as Promise<SoloDeck>;
export const deleteSoloDeck = async (id: string) => pb.collection('solo_decks').delete(id);

// ─── Solo Flashcards ──────────────────────────────────────────
export const getSoloFlashcards = async (deckId: string): Promise<SoloFlashcard[]> => {
  const r = await pb.collection('solo_flashcards').getFullList({
    filter: `deck = "${deckId}"`, sort: 'order,created',
    requestKey: null,
  });
  return r as unknown as SoloFlashcard[];
};
export const createSoloFlashcard = async (d: Partial<SoloFlashcard>): Promise<SoloFlashcard> =>
  pb.collection('solo_flashcards').create(d) as unknown as Promise<SoloFlashcard>;
export const updateSoloFlashcard = async (id: string, d: Partial<SoloFlashcard>): Promise<SoloFlashcard> =>
  pb.collection('solo_flashcards').update(id, d) as unknown as Promise<SoloFlashcard>;
export const deleteSoloFlashcard = async (id: string) => pb.collection('solo_flashcards').delete(id);
