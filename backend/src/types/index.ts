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