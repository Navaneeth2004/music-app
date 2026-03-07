export interface User {
  id: string;
  username: string;
  email: string;
  created: string;
  updated: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  icon: string;
  color: string;
  order?: number;
  created: string;
  updated: string;
}

export interface Chapter {
  id: string;
  book: string;
  number: number;
  title: string;
  subtitle: string;
  content?: string;  // JSON string of ContentBlock[]
  created: string;
  updated: string;
}

// Flashcards attached to a chapter
export interface ChapterFlashcard {
  id: string;
  chapter: string;   // relation → chapters
  front: string;
  back: string;
  front_image?: string;
  back_image?: string;
  front_audio?: string;
  back_audio?: string;
  order?: number;
  created: string;
  updated: string;
}

// Standalone flashcard decks (not tied to any chapter/book)
export interface SoloDeck {
  id: string;
  title: string;
  color: string;     // hex
  icon: string;      // emoji
  created: string;
  updated: string;
}

export interface SoloFlashcard {
  id: string;
  deck: string;      // relation → solo_decks
  front: string;
  back: string;
  front_image?: string;
  back_image?: string;
  front_audio?: string;
  back_audio?: string;
  order?: number;
  created: string;
  updated: string;
}

// Legacy alias kept so old imports still compile during migration
export type Flashcard = ChapterFlashcard;
