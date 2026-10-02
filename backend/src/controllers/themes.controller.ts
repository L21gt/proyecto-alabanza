import { Request, Response } from 'express';
import pool from '../config/database';

export const getThemes = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM themes ORDER BY id ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener temas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};