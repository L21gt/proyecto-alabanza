import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/database';
import jwt from 'jsonwebtoken';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // 1. Validar que vengan los datos
    if (!email || !password) {
      res.status(400).json({ error: 'Email y password son requeridos' });
      return;
    }

    // 2. Encriptar la contraseña (Regla de Ciberseguridad)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 3. Guardar en la Base de Datos (Prevención de Inyección SQL usando $1, $2)
    // Nota: 'role' y 'status' se asignan automáticamente por los DEFAULT de la tabla
    const result = await pool.query(
      `INSERT INTO users (email, password_hash) 
       VALUES ($1, $2) 
       RETURNING id, email, role, status, created_at`,
      [email, passwordHash]
    );

    const newUser = result.rows[0];

    // 4. Responder al cliente garantizando la estructura que pide la prueba
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: newUser
    });

  } catch (error: any) {
    // Si el email ya existe, PostgreSQL tira el error código 23505
    if (error.code === '23505') {
      res.status(409).json({ error: 'El correo electrónico ya está registrado' });
      return;
    }
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email y password son requeridos' });
      return;
    }

    // 1. Buscar al usuario en la base de datos
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // 2. Comparar la contraseña enviada con el hash guardado
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    // 3. Generar el JWT
    const secret = process.env.JWT_SECRET || 'secret_de_respaldo';
    const token = jwt.sign(
      { id: user.id, role: user.role, status: user.status }, 
      secret, 
      { expiresIn: '24h' } // El token expirará en 1 día
    );

    // 4. Retornar la respuesta (sin la contraseña)
    delete user.password_hash;
    
    res.status(200).json({
      message: 'Login exitoso',
      token,
      user
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};