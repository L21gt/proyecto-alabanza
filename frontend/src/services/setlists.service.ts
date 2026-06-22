import type { Setlist } from '../types'; // Asegúrate de que la ruta coincida con tu archivo de tipos

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_URL = `${BASE_URL}/setlists`;

// Función auxiliar para obtener el token
const getToken = () => localStorage.getItem('token');

export const getSetlists = async (): Promise<Setlist[]> => {
  const response = await fetch(API_URL, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    }
  });

  if (!response.ok) {
    throw new Error('Error al obtener los repertorios');
  }

  return await response.json();
};

export const getSetlistById = async (id: string | number): Promise<Setlist> => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    }
  });

  if (!response.ok) {
    throw new Error('Error al obtener los detalles del repertorio');
  }

  return await response.json();
};

export const createSetlist = async (data: { name: string; event_date?: string }): Promise<Setlist> => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify(data)
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Error al crear el repertorio');
  }

  return result.setlist;
};

export const deleteSetlist = async (id: string | number): Promise<void> => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    }
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || 'Error al eliminar el repertorio');
  }
};

export const addSongToSetlist = async (setId: string | number, songData: { song_id: number; transposed_key: string; sort_order: number }): Promise<void> => {
  const response = await fetch(`${API_URL}/${setId}/songs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify(songData)
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || 'Error al agregar la canción al repertorio');
  }
};

export const removeSongFromSetlist = async (setId: string | number, songId: string | number): Promise<void> => {
  const response = await fetch(`${API_URL}/${setId}/songs/${songId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    }
  });

  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || 'Error al quitar la canción del repertorio');
  }
};