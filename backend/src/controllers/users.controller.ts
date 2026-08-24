import { Request, Response } from 'express';
import pool from '../config/database';

// Interfaz para tipar el usuario inyectado por el middleware de autenticación
interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const getPendingUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  // Validación de seguridad (RBAC): Solo los administradores pueden ver esta lista
  if (req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de Administrador.' });
    return;
  }

  try {
    // Obtenemos todos los usuarios que están en estado 'Pendiente'
    // Excluimos el password_hash por seguridad
    const query = `
      SELECT id, name, email, phone, area, birth_date, created_at 
      FROM users 
      WHERE status = 'Pendiente' 
      ORDER BY created_at ASC
    `;
    const result = await pool.query(query);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener usuarios pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ============================================
// NUEVO: OBTENER TODOS LOS USUARIOS (DASHBOARD)
// ============================================
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de Administrador.' });
    return;
  }

  try {
    // Excluimos datos sensibles como password_hash y tokens
    const query = `
      SELECT id, name, email, phone, area, role, status, birth_date, created_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener la lista completa de usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ============================================
// ACTUALIZADO: CAMBIAR ESTADO (APROBAR / BLOQUEAR)
// ============================================
export const updateUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de Administrador.' });
    return;
  }

  const { id } = req.params;
  const { status } = req.body;

  // Validación de seguridad contra el ENUM de la base de datos (user_status)
  if (status !== 'Aprobado' && status !== 'Rechazado' && status !== 'Pendiente') {
    res.status(400).json({ error: 'El estado proporcionado no es válido.' });
    return;
  }

  try {
    const query = `
      UPDATE users 
      SET status = $1 
      WHERE id = $2 
      RETURNING id, name, email, status
    `;
    const result = await pool.query(query, [status, id]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.status(200).json({ 
      message: `Usuario ${status.toLowerCase()} exitosamente`, 
      user: result.rows[0] 
    });
  } catch (error) {
    console.error('Error al actualizar estado del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ============================================
// NUEVO: CAMBIAR ROL (ADMINISTRADOR / USUARIO)
// ============================================
export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de Administrador.' });
    return;
  }

  const { id } = req.params;
  const { role } = req.body;

  // Validación de seguridad contra el ENUM de la base de datos (user_role)
  if (role !== 'Admin' && role !== 'Usuario') {
    res.status(400).json({ error: 'Rol inválido. Debe ser Admin o Usuario.' });
    return;
  }

  try {
    const query = `
      UPDATE users 
      SET role = $1 
      WHERE id = $2 
      RETURNING id, name, email, role
    `;
    const result = await pool.query(query, [role, id]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.status(200).json({ 
      message: `El rol ha sido actualizado a ${role} exitosamente`, 
      user: result.rows[0] 
    });
  } catch (error) {
    console.error('Error al actualizar rol del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor al actualizar el rol' });
  }
};