import type { Song } from '../types';

// Dynamic base URL via Vite environment variables for Docker compatibility
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_URL = `${BASE_URL}/songs`;

export interface SongFilters {
  search?: string;
  category?: string;
  author?: string;
  original_key?: string;
  page?: number;
  limit?: number;
}

export interface PaginationData {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

// Actualizamos la firma para aceptar el objeto de filtros o un string (retro-compatibilidad)
export const getSongs = async (filters: SongFilters | string = {}): Promise<{songs: Song[], pagination: PaginationData}> => {
  const token = localStorage.getItem('token');
  
  const queryParams = new URLSearchParams();
  
  if (typeof filters === 'string') {
    if (filters) queryParams.append('search', filters);
  } else {
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.author) queryParams.append('author', filters.author);
    if (filters.original_key) queryParams.append('original_key', filters.original_key);
    if (filters.page) queryParams.append('page', filters.page.toString());
    if (filters.limit) queryParams.append('limit', filters.limit.toString());
  }

  const url = queryParams.toString() ? `${API_URL}?${queryParams.toString()}` : API_URL;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('Sesión expirada o sin permisos');
    throw new Error('Error al obtener el catálogo');
  }

  const data = await response.json();
  // El backend ahora devuelve { songs: [...], pagination: {...} }
  return { 
    songs: data.songs || [], 
    pagination: data.pagination || null 
  };
};

export const getSongById = async (id: string, transposeOffset: number = 0): Promise<Song> => {
  const token = localStorage.getItem('token');
  
  // URL construction with transposition offset parameter
  const url = transposeOffset !== 0 
    ? `${API_URL}/${id}?transpose=${transposeOffset}`
    : `${API_URL}/${id}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Error al obtener los detalles de la canción');
  }

  const data = await response.json();
  return data.song || data; 
};

export const createSong = async (songData: Omit<Song, 'id' | 'created_at' | 'updated_at'>): Promise<Song> => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(songData) // <-- LÍNEA FALTANTE
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error al guardar la canción');
  }

  return data.song || data;
};

export const updateSong = async (id: string, songData: Omit<Song, 'id' | 'created_at' | 'updated_at'>): Promise<void> => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(songData) // <-- LÍNEA FALTANTE
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Error al actualizar la canción');
  }
};

export const deleteSong = async (id: string): Promise<void> => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Error al eliminar la canción');
  }
};

export const updateSongStatus = async (id: string | number, status: 'Aprobado' | 'Pendiente' | 'Borrador'): Promise<void> => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status }) // <-- LÍNEA FALTANTE
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Error al actualizar el estado de la canción');
  }
};

export const getPendingSongs = async (): Promise<Song[]> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/pending`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) throw new Error('Error al obtener las canciones pendientes');
  const data = await response.json();
  return data.songs || data || [];
};

// ============================================
// NUEVOS ENDPOINTS: PAPELERA DE RECICLAJE
// ============================================
export const getDeletedSongs = async (): Promise<Song[]> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/deleted`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) throw new Error('Error al obtener la papelera de reciclaje');
  const data = await response.json();
  return data.songs || data || [];
};

export const restoreSong = async (id: string | number): Promise<void> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/${id}/restore`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Error al restaurar la canción');
  }
};