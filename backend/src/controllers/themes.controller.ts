import { Request, Response } from 'express';
import pool from '../config/database';

export const getThemes = async (req: Request, res: Response): Promise<void> => {
  try {
    // FILTRO DEFINITIVO: Usamos background_style porque no tiene valor DEFAULT en la BD.
    // Las etiquetas de canciones tendrán esto en NULL.
    const result = await pool.query(`
      SELECT * FROM themes 
      WHERE background_style IS NOT NULL 
      ORDER BY id ASC
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener temas:', error);
    res.status(500).json({ error: 'Error al obtener temas' });
  }
};