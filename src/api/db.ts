/**
 * src/api/db.ts — fully local SQLite. No PocketBase.
 * All content tables are scoped to user_id so each account sees only their own data.
 */
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Book, Chapter, ChapterFlashcard, SoloDeck, SoloFlashcard } from '../types';

let _db: SQLite.SQLiteDatabase | null = null;
let _userId: string = '';   // set by setCurrentUserId() after login/session restore

export function setCurrentUserId(id: string) { _userId = id; }
export function getCurrentUserId(): string   { return _userId; }

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('studyapp.db');
  await migrate(_db);
  return _db;
}

function uid(): string {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 15; i++) id += c[Math.floor(Math.random() * c.length)];
  return id;
}
function now(): string { return new Date().toISOString(); }
function row<T>(r: any): T { return r as T; }

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created       TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS books (
      id        TEXT PRIMARY KEY,
      user_id   TEXT NOT NULL DEFAULT '',
      title     TEXT NOT NULL DEFAULT '',
      author    TEXT NOT NULL DEFAULT '',
      icon      TEXT NOT NULL DEFAULT '📚',
      color     TEXT NOT NULL DEFAULT '#7C6FF7',
      "order"   INTEGER NOT NULL DEFAULT 0,
      created   TEXT NOT NULL,
      updated   TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chapters (
      id       TEXT PRIMARY KEY,
      user_id  TEXT NOT NULL DEFAULT '',
      book     TEXT NOT NULL REFERENCES books(id),
      number   INTEGER NOT NULL DEFAULT 1,
      title    TEXT NOT NULL DEFAULT '',
      subtitle TEXT NOT NULL DEFAULT '',
      content  TEXT,
      created  TEXT NOT NULL,
      updated  TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chapter_flashcards (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL DEFAULT '',
      chapter     TEXT NOT NULL REFERENCES chapters(id),
      front       TEXT NOT NULL DEFAULT '',
      back        TEXT NOT NULL DEFAULT '',
      front_image TEXT,
      back_image  TEXT,
      front_audio TEXT,
      back_audio  TEXT,
      "order"     INTEGER NOT NULL DEFAULT 0,
      created     TEXT NOT NULL,
      updated     TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS solo_decks (
      id      TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT '',
      title   TEXT NOT NULL DEFAULT '',
      color   TEXT NOT NULL DEFAULT '#7C6FF7',
      icon    TEXT NOT NULL DEFAULT '🃏',
      created TEXT NOT NULL,
      updated TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS solo_flashcards (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL DEFAULT '',
      deck        TEXT NOT NULL REFERENCES solo_decks(id),
      front       TEXT NOT NULL DEFAULT '',
      back        TEXT NOT NULL DEFAULT '',
      front_image TEXT,
      back_image  TEXT,
      front_audio TEXT,
      back_audio  TEXT,
      "order"     INTEGER NOT NULL DEFAULT 0,
      created     TEXT NOT NULL,
      updated     TEXT NOT NULL
    );
  `);
  // Migration: add user_id column to existing tables if it doesn't exist yet
  for (const table of ['books','chapters','chapter_flashcards','solo_decks','solo_flashcards']) {
    await db.execAsync(
      `ALTER TABLE ${table} ADD COLUMN user_id TEXT NOT NULL DEFAULT '';`
    ).catch(() => {}); // throws if column already exists — safe to ignore
  }
}

// ─── USERS ────────────────────────────────────────────────────
export async function dbCreateUser(username: string, passwordHash: string): Promise<User> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{id:string}>(
    `SELECT id FROM users WHERE username = ? COLLATE NOCASE`, [username]
  ).catch(() => null);
  if (existing) throw new Error('USERNAME_TAKEN');
  const id = uid(), ts = now();
  await db.runAsync(
    `INSERT INTO users (id, username, password_hash, created) VALUES (?,?,?,?)`,
    [id, username, passwordHash, ts]
  );
  return { id, username, email: '', created: ts, updated: ts };
}

export async function dbGetUserByUsername(username: string): Promise<{id:string;username:string;password_hash:string;created:string}|null> {
  const db = await getDb();
  return db.getFirstAsync<any>(
    `SELECT * FROM users WHERE username = ? COLLATE NOCASE`, [username]
  ).catch(() => null);
}

// ─── BOOKS ────────────────────────────────────────────────────
export async function dbGetBooks(): Promise<Book[]> {
  const db = await getDb();
  return (await db.getAllAsync(
    `SELECT * FROM books WHERE user_id = ? ORDER BY "order" ASC, title ASC`, [_userId]
  )).map(row<Book>);
}
export async function dbCreateBook(d: Partial<Book>): Promise<Book> {
  const db = await getDb(); const id = uid(), ts = now();
  await db.runAsync(
    `INSERT INTO books (id,user_id,title,author,icon,color,"order",created,updated) VALUES (?,?,?,?,?,?,?,?,?)`,
    [id,_userId,d.title??'',d.author??'',d.icon??'📚',d.color??'#7C6FF7',d.order??0,ts,ts]
  );
  return (await db.getFirstAsync<Book>(`SELECT * FROM books WHERE id=?`,[id]))!;
}
export async function dbUpdateBook(id: string, d: Partial<Book>): Promise<Book> {
  const db = await getDb(); const ts = now();
  const f:string[]=[],v:any[]=[];
  if(d.title!==undefined){f.push('title=?');v.push(d.title);}
  if(d.author!==undefined){f.push('author=?');v.push(d.author);}
  if(d.icon!==undefined){f.push('icon=?');v.push(d.icon);}
  if(d.color!==undefined){f.push('color=?');v.push(d.color);}
  if(d.order!==undefined){f.push('"order"=?');v.push(d.order);}
  f.push('updated=?');v.push(ts);v.push(id);v.push(_userId);
  await db.runAsync(`UPDATE books SET ${f.join(',')} WHERE id=? AND user_id=?`,v);
  return (await db.getFirstAsync<Book>(`SELECT * FROM books WHERE id=?`,[id]))!;
}
export async function dbDeleteBook(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM books WHERE id=? AND user_id=?`,[id,_userId]);
}

// ─── CHAPTERS ─────────────────────────────────────────────────
export async function dbGetChapters(bookId: string): Promise<Chapter[]> {
  const db = await getDb();
  return (await db.getAllAsync(
    `SELECT * FROM chapters WHERE book=? AND user_id=? ORDER BY number ASC`,[bookId,_userId]
  )).map(row<Chapter>);
}
export async function dbGetChapter(id: string): Promise<Chapter> {
  const db = await getDb();
  const r = await db.getFirstAsync<Chapter>(`SELECT * FROM chapters WHERE id=? AND user_id=?`,[id,_userId]);
  if(!r) throw new Error(`Chapter ${id} not found`);
  return r;
}
export async function dbCreateChapter(d: Partial<Chapter>): Promise<Chapter> {
  const db = await getDb(); const id = uid(), ts = now();
  await db.runAsync(
    `INSERT INTO chapters (id,user_id,book,number,title,subtitle,content,created,updated) VALUES (?,?,?,?,?,?,?,?,?)`,
    [id,_userId,d.book??'',d.number??1,d.title??'',d.subtitle??'',d.content??null,ts,ts]
  );
  return (await db.getFirstAsync<Chapter>(`SELECT * FROM chapters WHERE id=?`,[id]))!;
}
export async function dbUpdateChapter(id: string, d: Partial<Chapter>): Promise<Chapter> {
  const db = await getDb(); const ts = now();
  const f:string[]=[],v:any[]=[];
  if(d.number!==undefined){f.push('number=?');v.push(d.number);}
  if(d.title!==undefined){f.push('title=?');v.push(d.title);}
  if(d.subtitle!==undefined){f.push('subtitle=?');v.push(d.subtitle);}
  if(d.content!==undefined){f.push('content=?');v.push(d.content);}
  f.push('updated=?');v.push(ts);v.push(id);v.push(_userId);
  await db.runAsync(`UPDATE chapters SET ${f.join(',')} WHERE id=? AND user_id=?`,v);
  return (await db.getFirstAsync<Chapter>(`SELECT * FROM chapters WHERE id=?`,[id]))!;
}
export async function dbDeleteChapter(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM chapters WHERE id=? AND user_id=?`,[id,_userId]);
}

// ─── CHAPTER FLASHCARDS ───────────────────────────────────────
export async function dbGetChapterFlashcards(chapterId: string): Promise<ChapterFlashcard[]> {
  const db = await getDb();
  return (await db.getAllAsync(
    `SELECT * FROM chapter_flashcards WHERE chapter=? AND user_id=? ORDER BY "order" ASC,created ASC`,[chapterId,_userId]
  )).map(row<ChapterFlashcard>);
}
export async function dbCreateChapterFlashcard(d: Partial<ChapterFlashcard>): Promise<ChapterFlashcard> {
  const db = await getDb(); const id = uid(), ts = now();
  await db.runAsync(
    `INSERT INTO chapter_flashcards (id,user_id,chapter,front,back,front_image,back_image,front_audio,back_audio,"order",created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id,_userId,d.chapter??'',d.front??'',d.back??'',d.front_image??null,d.back_image??null,d.front_audio??null,d.back_audio??null,d.order??0,ts,ts]
  );
  return (await db.getFirstAsync<ChapterFlashcard>(`SELECT * FROM chapter_flashcards WHERE id=?`,[id]))!;
}
export async function dbUpdateChapterFlashcard(id: string, d: Partial<ChapterFlashcard>): Promise<ChapterFlashcard> {
  const db = await getDb(); const ts = now();
  const f:string[]=[],v:any[]=[];
  if(d.front!==undefined){f.push('front=?');v.push(d.front);}
  if(d.back!==undefined){f.push('back=?');v.push(d.back);}
  if(d.front_image!==undefined){f.push('front_image=?');v.push(d.front_image);}
  if(d.back_image!==undefined){f.push('back_image=?');v.push(d.back_image);}
  if(d.front_audio!==undefined){f.push('front_audio=?');v.push(d.front_audio);}
  if(d.back_audio!==undefined){f.push('back_audio=?');v.push(d.back_audio);}
  if(d.order!==undefined){f.push('"order"=?');v.push(d.order);}
  f.push('updated=?');v.push(ts);v.push(id);v.push(_userId);
  await db.runAsync(`UPDATE chapter_flashcards SET ${f.join(',')} WHERE id=? AND user_id=?`,v);
  return (await db.getFirstAsync<ChapterFlashcard>(`SELECT * FROM chapter_flashcards WHERE id=?`,[id]))!;
}
export async function dbDeleteChapterFlashcard(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM chapter_flashcards WHERE id=? AND user_id=?`,[id,_userId]);
}

// ─── SOLO DECKS ───────────────────────────────────────────────
export async function dbGetSoloDecks(): Promise<SoloDeck[]> {
  const db = await getDb();
  return (await db.getAllAsync(
    `SELECT * FROM solo_decks WHERE user_id=? ORDER BY created ASC`,[_userId]
  )).map(row<SoloDeck>);
}
export async function dbCreateSoloDeck(d: Partial<SoloDeck>): Promise<SoloDeck> {
  const db = await getDb(); const id = uid(), ts = now();
  await db.runAsync(
    `INSERT INTO solo_decks (id,user_id,title,color,icon,created,updated) VALUES (?,?,?,?,?,?,?)`,
    [id,_userId,d.title??'',d.color??'#7C6FF7',d.icon??'🃏',ts,ts]
  );
  return (await db.getFirstAsync<SoloDeck>(`SELECT * FROM solo_decks WHERE id=?`,[id]))!;
}
export async function dbUpdateSoloDeck(id: string, d: Partial<SoloDeck>): Promise<SoloDeck> {
  const db = await getDb(); const ts = now();
  const f:string[]=[],v:any[]=[];
  if(d.title!==undefined){f.push('title=?');v.push(d.title);}
  if(d.color!==undefined){f.push('color=?');v.push(d.color);}
  if(d.icon!==undefined){f.push('icon=?');v.push(d.icon);}
  f.push('updated=?');v.push(ts);v.push(id);v.push(_userId);
  await db.runAsync(`UPDATE solo_decks SET ${f.join(',')} WHERE id=? AND user_id=?`,v);
  return (await db.getFirstAsync<SoloDeck>(`SELECT * FROM solo_decks WHERE id=?`,[id]))!;
}
export async function dbDeleteSoloDeck(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM solo_decks WHERE id=? AND user_id=?`,[id,_userId]);
}

// ─── SOLO FLASHCARDS ──────────────────────────────────────────
export async function dbGetSoloFlashcards(deckId: string): Promise<SoloFlashcard[]> {
  const db = await getDb();
  return (await db.getAllAsync(
    `SELECT * FROM solo_flashcards WHERE deck=? AND user_id=? ORDER BY "order" ASC,created ASC`,[deckId,_userId]
  )).map(row<SoloFlashcard>);
}
export async function dbCreateSoloFlashcard(d: Partial<SoloFlashcard>): Promise<SoloFlashcard> {
  const db = await getDb(); const id = uid(), ts = now();
  await db.runAsync(
    `INSERT INTO solo_flashcards (id,user_id,deck,front,back,front_image,back_image,front_audio,back_audio,"order",created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id,_userId,d.deck??'',d.front??'',d.back??'',d.front_image??null,d.back_image??null,d.front_audio??null,d.back_audio??null,d.order??0,ts,ts]
  );
  return (await db.getFirstAsync<SoloFlashcard>(`SELECT * FROM solo_flashcards WHERE id=?`,[id]))!;
}
export async function dbUpdateSoloFlashcard(id: string, d: Partial<SoloFlashcard>): Promise<SoloFlashcard> {
  const db = await getDb(); const ts = now();
  const f:string[]=[],v:any[]=[];
  if(d.front!==undefined){f.push('front=?');v.push(d.front);}
  if(d.back!==undefined){f.push('back=?');v.push(d.back);}
  if(d.front_image!==undefined){f.push('front_image=?');v.push(d.front_image);}
  if(d.back_image!==undefined){f.push('back_image=?');v.push(d.back_image);}
  if(d.front_audio!==undefined){f.push('front_audio=?');v.push(d.front_audio);}
  if(d.back_audio!==undefined){f.push('back_audio=?');v.push(d.back_audio);}
  if(d.order!==undefined){f.push('"order"=?');v.push(d.order);}
  f.push('updated=?');v.push(ts);v.push(id);v.push(_userId);
  await db.runAsync(`UPDATE solo_flashcards SET ${f.join(',')} WHERE id=? AND user_id=?`,v);
  return (await db.getFirstAsync<SoloFlashcard>(`SELECT * FROM solo_flashcards WHERE id=?`,[id]))!;
}
export async function dbDeleteSoloFlashcard(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM solo_flashcards WHERE id=? AND user_id=?`,[id,_userId]);
}

// ─── Search ───────────────────────────────────────────────────
export interface SearchResult {
  type: 'book' | 'chapter' | 'chapter_flashcard' | 'solo_deck' | 'solo_flashcard';
  id: string;
  title: string;       // primary display text
  subtitle: string;    // secondary display text
  // For navigation — carry enough context to jump straight to the item
  bookId?: string;
  bookTitle?: string;
  bookColor?: string;
  bookIcon?: string;
  chapterId?: string;
  chapterTitle?: string;
  chapterNumber?: number;
  deckId?: string;
  deckTitle?: string;
  deckColor?: string;
  deckIcon?: string;
}

export async function dbSearchAll(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const db = await getDb();
  const q = `%${query.trim()}%`;
  const results: SearchResult[] = [];

  // Load hidden sets from AsyncStorage
  const loadHiddenSet = async (key: string): Promise<Set<string>> => {
    try {
      const raw = await AsyncStorage.getItem(`hidden_${key}`);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  };
  const [hiddenBooks, hiddenChapters, hiddenDecks, hiddenFlashcards] = await Promise.all([
    loadHiddenSet('book'), loadHiddenSet('chapter'),
    loadHiddenSet('deck'), loadHiddenSet('flashcard'),
  ]);

  // Books
  const books = await db.getAllAsync<any>(
    `SELECT * FROM books WHERE user_id=? AND (title LIKE ? OR author LIKE ?) ORDER BY title ASC LIMIT 10`,
    [_userId, q, q]
  );
  for (const b of books) {
    if (hiddenBooks.has(b.id)) continue;
    results.push({ type: 'book', id: b.id, title: b.title, subtitle: b.author, bookColor: b.color, bookIcon: b.icon });
  }

  // Chapters (join book for color/icon)
  const chapters = await db.getAllAsync<any>(
    `SELECT c.*, b.title as bookTitle, b.color as bookColor, b.icon as bookIcon
     FROM chapters c JOIN books b ON c.book=b.id
     WHERE c.user_id=? AND (c.title LIKE ? OR c.subtitle LIKE ?) ORDER BY c.number ASC LIMIT 20`,
    [_userId, q, q]
  );
  for (const c of chapters) {
    if (hiddenBooks.has(c.book) || hiddenChapters.has(c.id)) continue;
    results.push({
      type: 'chapter', id: c.id,
      title: c.title, subtitle: `Chapter ${c.number} · ${c.bookTitle}`,
      bookId: c.book, bookTitle: c.bookTitle, bookColor: c.bookColor, bookIcon: c.bookIcon,
      chapterId: c.id, chapterTitle: c.title, chapterNumber: c.number,
    });
  }

  // Chapter flashcards
  const chCards = await db.getAllAsync<any>(
    `SELECT cf.*, c.title as chTitle, c.number as chNum, b.id as bId, b.title as bTitle, b.color as bColor, b.icon as bIcon
     FROM chapter_flashcards cf
     JOIN chapters c ON cf.chapter=c.id
     JOIN books b ON c.book=b.id
     WHERE cf.user_id=? AND (cf.front LIKE ? OR cf.back LIKE ?) LIMIT 30`,
    [_userId, q, q]
  );
  for (const f of chCards) {
    if (hiddenBooks.has(f.bId) || hiddenChapters.has(f.chapter) || hiddenFlashcards.has(f.id)) continue;
    results.push({
      type: 'chapter_flashcard', id: f.id,
      title: f.front || '(no text)', subtitle: `Card · ${f.chTitle}`,
      bookId: f.bId, bookTitle: f.bTitle, bookColor: f.bColor, bookIcon: f.bIcon,
      chapterId: f.chapter, chapterTitle: f.chTitle, chapterNumber: f.chNum,
    });
  }

  // Solo decks
  const decks = await db.getAllAsync<any>(
    `SELECT * FROM solo_decks WHERE user_id=? AND title LIKE ? ORDER BY title ASC LIMIT 10`,
    [_userId, q]
  );
  for (const d of decks) {
    if (hiddenDecks.has(d.id)) continue;
    results.push({ type: 'solo_deck', id: d.id, title: d.title, subtitle: 'Solo Deck', deckId: d.id, deckTitle: d.title, deckColor: d.color, deckIcon: d.icon });
  }

  // Solo flashcards
  const soloCards = await db.getAllAsync<any>(
    `SELECT sf.*, sd.title as deckTitle, sd.color as deckColor, sd.icon as deckIcon
     FROM solo_flashcards sf JOIN solo_decks sd ON sf.deck=sd.id
     WHERE sf.user_id=? AND (sf.front LIKE ? OR sf.back LIKE ?) LIMIT 30`,
    [_userId, q, q]
  );
  for (const f of soloCards) {
    if (hiddenDecks.has(f.deck) || hiddenFlashcards.has(f.id)) continue;
    results.push({
      type: 'solo_flashcard', id: f.id,
      title: f.front || '(no text)', subtitle: `Card · ${f.deckTitle}`,
      deckId: f.deck, deckTitle: f.deckTitle, deckColor: f.deckColor, deckIcon: f.deckIcon,
    });
  }

  return results;
}