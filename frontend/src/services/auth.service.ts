import type { AuthResponse } from '../types';

// Definición estricta de los datos esperados en el registro (Onboarding)
export interface RegisterData {
  email: string;
  password: string;
  name: string;
  birth_date: string;
  phone?: string;
  area?: string;
}

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

export const register = async (userData: RegisterData): Promise<AuthResponse> => {
  const response = await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // Enviamos el objeto completo al backend
    body: JSON.stringify(userData), 
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error al registrar la cuenta');
  }

  return data;
};