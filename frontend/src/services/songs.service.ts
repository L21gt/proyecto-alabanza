import type { Song } from '../types';

const API_URL = 'http://localhost:3000/api/songs';

export const getSongs = async (): Promise<Song[]> => {
  // Recuperamos el token que guardamos durante el login
  const token = localStorage.getItem('token');

  const response = await fetch(API_URL, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // Enviamos el token de seguridad
    }
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Sesión expirada o sin permisos');
    }
    throw new Error('Error al obtener el catálogo');
  }

  const data = await response.json();
  return data.songs;
};