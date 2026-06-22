const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface PendingUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  area: string;
  birth_date: string;
  created_at: string;
}

export const getPendingUsers = async (): Promise<PendingUser[]> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/users/pending`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al obtener usuarios');
  return data;
};

export const updateUserStatus = async (id: number, status: 'Aprobado' | 'Rechazado'): Promise<void> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE_URL}/users/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al actualizar el estado');
};