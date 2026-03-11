export interface User {
  id:       string;
  username: string;
  email:    string;
  created:  string;
  updated:  string;
}

export interface Book {
  id:      string;
  user_id: string;
  title:   string;
  author:  string;
  icon:    string;
  color:   string;
  order:   number;
  created: string;
  updated: string;
}

export interface Chapter {
  id:       string;
  user_id:  string;
  book:     string;
  number:   number;
  title:    string;
  subtitle: string;
  content:  string | null;
  created:  string;
  updated:  string;
}

export interface ChapterFlashcard {
  id:          string;
  user_id:     string;
  chapter:     string;
  front:       string;
  back:        string;
  front_image: string | null;
  back_image:  string | null;
  front_audio: string | null;
  back_audio:  string | null;
  order:       number;
  created:     string;
  updated:     string;
}

export interface SoloDeck {
  id:      string;
  user_id: string;
  title:   string;
  color:   string;
  icon:    string;
  created: string;
  updated: string;
}

export interface SoloFlashcard {
  id:          string;
  user_id:     string;
  deck:        string;
  front:       string;
  back:        string;
  front_image: string | null;
  back_image:  string | null;
  front_audio: string | null;
  back_audio:  string | null;
  order:       number;
  created:     string;
  updated:     string;
}