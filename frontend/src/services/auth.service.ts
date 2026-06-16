import type { AuthResponse } from '../types';

// Utilizamos la variable de entorno de Vite inyectada por Docker, o hacemos fallback a localhost para desarrollo local
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const AUTH_URL = `${BASE_URL}/auth`;

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error al iniciar sesión');
  }

  return data;
};

export const register = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error al registrar la cuenta');
  }

  return data;
};