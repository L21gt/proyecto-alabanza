import { Request, Response } from 'express';
import pool from '../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const register = async (req: Request, res: Response): Promise<void> => {
  // Extraemos todos los campos del nuevo payload de onboarding
  const { email, password, name, birth_date, phone, area } = req.body;

  // Validación 400 estricta para campos requeridos
  if (!email || !password || !name || !birth_date) {
    res.status(400).json({ error: 'Email, contraseña, nombre y fecha de nacimiento son obligatorios' });
    return;
  }

  try {
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      res.status(409).json({ error: 'El correo ya está registrado' });
      return;
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const isFirstUser = parseInt(countResult.rows[0].count) === 0;
    
    // Arquitectura Zero Trust:
    // El usuario "Génesis" (primer usuario) nace como Admin y Aprobado.
    // Todos los usuarios subsecuentes nacen como 'Usuario' estándar y estado 'Pendiente'.
    const assignedRole = isFirstUser ? 'Admin' : 'Usuario';
    const initialStatus = isFirstUser ? 'Aprobado' : 'Pendiente';

    const insertQuery = `
      INSERT INTO users (email, password_hash, name, birth_date, phone, area, role, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id, email, role, status
    `;
    
    const newUser = await pool.query(insertQuery, [
      email, 
      hashedPassword, 
      name, 
      birth_date, 
      phone || null, 
      area || 'Otro', 
      assignedRole, 
      initialStatus
    ]);

    res.status(201).json({ 
      message: 'Usuario registrado exitosamente',
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email y password son requeridos' });
    return;
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      res.status(401).json({ error: 'Contraseña incorrecta' });
      return;
    }

    // ==========================================
    // BARRERA DE SEGURIDAD (RBAC & Status Check)
    // ==========================================
    if (user.status === 'Pendiente') {
      res.status(403).json({ error: 'Tu cuenta está en revisión. Un administrador debe aprobarla para que puedas ingresar.' });
      return;
    }

    if (user.status === 'Rechazado') {
      res.status(403).json({ error: 'Tu acceso a la plataforma ha sido denegado.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'super_secreto_desarrollo',
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token,
      user: { id: user.id, email: user.email, role: user.role, status: user.status }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};