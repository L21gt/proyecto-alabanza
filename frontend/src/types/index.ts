export interface Song {
  id: number;
  title: string;
  author: string;
  version?: string; // Nuevo (Opcional)
  original_key: string;
  tempo?: number;   // El '?' soluciona el error, indicando que es opcional
  category: string;
  content: string;
  themes?: string[]; // (Opcional)
  video_link?: string; // Nuevo (Opcional)
  status?: string;   // (Opcional, para el flujo editorial)
  created_at?: string;
  updated_at?: string;
}

// Interfaz para las canciones cuando están dentro de un repertorio
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
  songs?: SetlistSong[]; // Puede venir vacío al listar, o lleno al ver el detalle
}

// Interfaz para las respuestas de Autenticación (Login / Registro)
export interface AuthResponse {
  message: string;
  token?: string; // Es opcional (?) porque el registro no lo devuelve, pero el login sí
  user: {
    id: number;
    email: string;
    role: string;
  };
}