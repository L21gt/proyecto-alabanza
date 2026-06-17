import type { Song } from '../types';

// Dynamic base URL via Vite environment variables for Docker compatibility
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_URL = `${BASE_URL}/songs`;

export const getSongs = async (searchQuery?: string): Promise<Song[]> => {
  const token = localStorage.getItem('token');
  
  // URL construction with optional query parameters for filtering
  const url = searchQuery 
    ? `${API_URL}?search=${encodeURIComponent(searchQuery)}` 
    : API_URL;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Sesión expirada o sin permisos');
    }
    throw new Error('Error al obtener el catálogo');
  }

  const data = await response.json();
  return data.songs || data || [];
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
    body: JSON.stringify(songData)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error al guardar la canción');
  }

  return data;
};

export const updateSong = async (id: string, songData: Omit<Song, 'id' | 'created_at' | 'updated_at'>): Promise<void> => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(songData)
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