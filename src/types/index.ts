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

export interface Progress {
  id: string;
  userId: string;
  topic: string;
  score: number;
  created: string;
}
