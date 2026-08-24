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

// Nueva interfaz para el listado completo de usuarios
export interface SystemUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  area: string;
  role: 'Admin' | 'Usuario';
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
  birth_date: string;
  created_at: string;
}

export const getPendingUsers = async (): Promise<PendingUser[]> => {
  const token = localStorage.getItem('token');
  
  // Usando backticks (`) para que inyecte la variable
  const response = await fetch(`${BASE_URL}/users/pending`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al obtener usuarios');
  return data;
};

// ============================================
// NUEVO: OBTENER TODOS LOS USUARIOS
// ============================================
export const getAllUsers = async (): Promise<SystemUser[]> => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${BASE_URL}/users`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al obtener la lista de cuentas');
  return data;
};

export const updateUserStatus = async (id: number, status: 'Aprobado' | 'Rechazado'): Promise<void> => {
  const token = localStorage.getItem('token');
  
  // Usando backticks (`)
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

// ============================================
// NUEVO: CAMBIAR ROL DE USUARIO
// ============================================
export const updateUserRole = async (id: number, role: 'Admin' | 'Usuario'): Promise<void> => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${BASE_URL}/users/${id}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ role })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al actualizar el rol');
};