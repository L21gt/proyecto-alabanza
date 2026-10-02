import type { Theme } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const getThemes = async (): Promise<Theme[]> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/themes`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) throw new Error('Error al obtener los temas');
  return response.json();
};