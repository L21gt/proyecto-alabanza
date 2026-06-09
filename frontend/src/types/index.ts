export interface User {
  id: number;
  email: string;
  role: string;
  status: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
  error?: string;
}

export interface Song {
  id: number;
  title: string;
  author: string;
  original_key: string;
  tempo: number;
  category: string;
  content: string;
  themes: string[];
  created_at?: string;
  updated_at?: string;
}