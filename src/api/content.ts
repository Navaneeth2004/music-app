import { Book, Chapter, ChapterFlashcard, SoloDeck, SoloFlashcard } from '../types';
import {
  dbGetBooks,      dbCreateBook,      dbUpdateBook,      dbDeleteBook,
  dbGetChapters,   dbGetChapter,      dbCreateChapter,   dbUpdateChapter,   dbDeleteChapter,
  dbGetChapterFlashcards, dbCreateChapterFlashcard, dbUpdateChapterFlashcard, dbDeleteChapterFlashcard,
  dbGetSoloDecks,  dbCreateSoloDeck,  dbUpdateSoloDeck,  dbDeleteSoloDeck,
  dbGetSoloFlashcards, dbCreateSoloFlashcard, dbUpdateSoloFlashcard, dbDeleteSoloFlashcard,
} from './db';

// ─── Books ────────────────────────────────────────────────────
export const getBooks = (): Promise<Book[]>                        => dbGetBooks();
export const createBook = (d: Partial<Book>): Promise<Book>        => dbCreateBook(d);
export const updateBook = (id: string, d: Partial<Book>): Promise<Book> => dbUpdateBook(id, d);
export const deleteBook = (id: string): Promise<void>              => dbDeleteBook(id);

// ─── Chapters ─────────────────────────────────────────────────
export const getChapters = (bookId: string): Promise<Chapter[]>    => dbGetChapters(bookId);
export const getChapter  = (id: string): Promise<Chapter>          => dbGetChapter(id);
export const createChapter = (d: Partial<Chapter>): Promise<Chapter> => dbCreateChapter(d);
export const updateChapter = (id: string, d: Partial<Chapter>): Promise<Chapter> => dbUpdateChapter(id, d);
export const deleteChapter = (id: string): Promise<void>           => dbDeleteChapter(id);

// ─── Chapter Flashcards ───────────────────────────────────────
export const getChapterFlashcards = (chapterId: string): Promise<ChapterFlashcard[]> =>
  dbGetChapterFlashcards(chapterId);
export const createChapterFlashcard = (d: Partial<ChapterFlashcard>): Promise<ChapterFlashcard> =>
  dbCreateChapterFlashcard(d);
export const updateChapterFlashcard = (id: string, d: Partial<ChapterFlashcard>): Promise<ChapterFlashcard> =>
  dbUpdateChapterFlashcard(id, d);
export const deleteChapterFlashcard = (id: string): Promise<void>  => dbDeleteChapterFlashcard(id);

// ─── Solo Decks ───────────────────────────────────────────────
export const getSoloDecks  = (): Promise<SoloDeck[]>               => dbGetSoloDecks();
export const createSoloDeck = (d: Partial<SoloDeck>): Promise<SoloDeck> => dbCreateSoloDeck(d);
export const updateSoloDeck = (id: string, d: Partial<SoloDeck>): Promise<SoloDeck> => dbUpdateSoloDeck(id, d);
export const deleteSoloDeck = (id: string): Promise<void>          => dbDeleteSoloDeck(id);

// ─── Solo Flashcards ──────────────────────────────────────────
export const getSoloFlashcards = (deckId: string): Promise<SoloFlashcard[]> =>
  dbGetSoloFlashcards(deckId);
export const createSoloFlashcard = (d: Partial<SoloFlashcard>): Promise<SoloFlashcard> =>
  dbCreateSoloFlashcard(d);
export const updateSoloFlashcard = (id: string, d: Partial<SoloFlashcard>): Promise<SoloFlashcard> =>
  dbUpdateSoloFlashcard(id, d);
export const deleteSoloFlashcard = (id: string): Promise<void>     => dbDeleteSoloFlashcard(id);
