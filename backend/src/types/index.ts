import { Request } from 'express';

// Extendemos la interfaz Request de Express para que acepte nuestra propiedad 'user'
export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
    status: string;
  };
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

// Interfaz para las canciones dentro de un repertorio (Join de setlist_songs y songs)
export interface SetlistSong {
  song_id: number;
  transposed_key: string;
  sort_order: number;
  title: string;
  author: string;
  original_key: string;
  tempo: number;
}

// Interfaz principal del Repertorio
export interface Setlist {
  id: number;
  name: string;
  event_date: string | null;
  user_id: number;
  created_at?: string;
  songs?: SetlistSong[];
}