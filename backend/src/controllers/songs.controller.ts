import { Request, Response } from 'express';
import pool from '../config/database';
import { transposeChord, transposeSongContent } from '../utils/transposer';

// Interfaz para tipar el usuario inyectado por el middleware de autenticación
interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const createSong = async (req: AuthRequest, res: Response): Promise<void> => {
  // 1. Agregamos version y video_link a la desestructuración
  const { title, author, version, original_key, tempo, category, content, video_link, themes } = req.body;

  if (!title || !author || !original_key || !category || !content) {
    res.status(400).json({ error: 'Faltan campos obligatorios' });
    return;
  }

  const initialStatus = req.user?.role === 'Admin' ? 'Aprobado' : 'Pendiente';
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 2. Insertamos los nuevos campos en la tabla
    const insertSongQuery = `
      INSERT INTO songs (title, author, version, original_key, tempo, category, content, video_link, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, title, status
    `;
    const songResult = await client.query(insertSongQuery, [
      title, author, version || null, original_key, tempo, category, content, video_link || null, initialStatus
    ]);
    const newSong = songResult.rows[0];

    if (themes && Array.isArray(themes) && themes.length > 0) {
      for (const themeName of themes) {
        const normalizedTheme = themeName.trim().toLowerCase();
        let themeId: number;

        const insertThemeQuery = `
          INSERT INTO themes (name) VALUES ($1)
          ON CONFLICT (name) DO NOTHING
          RETURNING id
        `;
        const themeResult = await client.query(insertThemeQuery, [normalizedTheme]);

        if (themeResult.rows.length > 0) {
          themeId = themeResult.rows[0].id;
        } else {
          const selectThemeQuery = `SELECT id FROM themes WHERE name = $1`;
          const existingTheme = await client.query(selectThemeQuery, [normalizedTheme]);
          themeId = existingTheme.rows[0].id;
        }

        await client.query(
          `INSERT INTO song_themes (song_id, theme_id) VALUES ($1, $2)`,
          [newSong.id, themeId]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: initialStatus === 'Aprobado' 
        ? 'Canción creada exitosamente' 
        : 'Canción propuesta enviada a revisión',
      song: newSong
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear la canción:', error);
    res.status(500).json({ error: 'Error interno al guardar la canción' });
  } finally {
    client.release();
  }
};

export const getAllSongs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    
    let query = 'SELECT id, title, author, original_key, category, status FROM songs WHERE 1=1';
    const queryParams: any[] = [];
    let paramCounter = 1;

    // 1. FLUJO EDITORIAL: Filtro por Rol
    // Si no es admin, forzamos a que solo vea las canciones aprobadas
    if (req.user?.role !== 'Admin') {
      query += ` AND status = 'Aprobado'`;
    }

    // 2. Filtro de Búsqueda
    if (search) {
      query += ` AND title ILIKE $${paramCounter}`;
      queryParams.push(`%${search}%`);
      paramCounter++;
    }

    query += ' ORDER BY title ASC';

    const result = await pool.query(query, queryParams);
    res.status(200).json({ songs: result.rows });

  } catch (error) {
    console.error('Error al obtener catálogo de canciones:', error);
    res.status(500).json({ error: 'Error interno al obtener las canciones' });
  }
};

export const getSongById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { transpose } = req.query; 

    const songResult = await pool.query('SELECT * FROM songs WHERE id = $1', [id]);
    
    if (songResult.rows.length === 0) {
      res.status(404).json({ error: 'Canción no encontrada' });
      return;
    }

    const song = songResult.rows[0];

    // FLUJO EDITORIAL: Bloquear acceso a canciones pendientes si no es Admin
    if (song.status === 'Pendiente' && req.user?.role !== 'Admin') {
      res.status(403).json({ error: 'Esta canción está en revisión y no está disponible.' });
      return;
    }

    const themesResult = await pool.query(`
      SELECT t.name 
      FROM themes t
      INNER JOIN song_themes st ON t.id = st.theme_id
      WHERE st.song_id = $1
    `, [id]);
    song.themes = themesResult.rows.map(row => row.name);

    if (transpose && !isNaN(Number(transpose))) {
      const steps = Number(transpose);
      song.original_key = transposeChord(song.original_key, steps);
      song.content = transposeSongContent(song.content, steps);
    }

    res.status(200).json({ song });

  } catch (error) {
    console.error('Error al obtener la canción:', error);
    res.status(500).json({ error: 'Error interno al obtener la canción' });
  }
};

export const updateSong = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  // 1. Agregamos version y video_link
  const { title, author, version, original_key, tempo, category, content, video_link, themes } = req.body;

  if (!title || !author || !original_key || !category || !content) {
    res.status(400).json({ error: 'Faltan campos obligatorios' });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 2. Actualizamos la consulta SQL
    const updateSongQuery = `
      UPDATE songs 
      SET title = $1, author = $2, version = $3, original_key = $4, tempo = $5, category = $6, content = $7, video_link = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `;
    const songResult = await client.query(updateSongQuery, [
      title, author, version || null, original_key, tempo, category, content, video_link || null, id
    ]);

    if (songResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Canción no encontrada' });
      return;
    }

    const updatedSong = songResult.rows[0];

    await client.query('DELETE FROM song_themes WHERE song_id = $1', [id]);

    if (themes && Array.isArray(themes) && themes.length > 0) {
      for (const themeName of themes) {
        const normalizedTheme = themeName.trim().toLowerCase();
        let themeId: number;

        const insertThemeQuery = `
          INSERT INTO themes (name) VALUES ($1)
          ON CONFLICT (name) DO NOTHING
          RETURNING id
        `;
        const themeResult = await client.query(insertThemeQuery, [normalizedTheme]);

        if (themeResult.rows.length > 0) {
          themeId = themeResult.rows[0].id;
        } else {
          const selectThemeQuery = `SELECT id FROM themes WHERE name = $1`;
          const existingTheme = await client.query(selectThemeQuery, [normalizedTheme]);
          themeId = existingTheme.rows[0].id;
        }

        await client.query(
          `INSERT INTO song_themes (song_id, theme_id) VALUES ($1, $2)`,
          [id, themeId]
        );
      }
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Canción actualizada', song: updatedSong });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar:', error);
    res.status(500).json({ error: 'Error interno al actualizar la canción' });
  } finally {
    client.release();
  }
};

export const deleteSong = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM songs WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Canción no encontrada' });
      return;
    }

    res.status(200).json({ message: 'Canción eliminada exitosamente' });

  } catch (error) {
    console.error('Error al eliminar:', error);
    res.status(500).json({ error: 'Error interno al eliminar la canción' });
  }
};

// ============================================
// NUEVA FUNCIÓN: APROBAR CANCIÓN (Solo Admin)
// ============================================
export const updateSongStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Acceso denegado. Solo los administradores pueden aprobar canciones.' });
    return;
  }

  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'Aprobado' && status !== 'Pendiente') {
    res.status(400).json({ error: 'Estado inválido. Debe ser Aprobado o Pendiente.' });
    return;
  }

  try {
    const result = await pool.query(
      'UPDATE songs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, title, status',
      [status, id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Canción no encontrada' });
      return;
    }

    res.status(200).json({ 
      message: `Canción ${status.toLowerCase()} exitosamente`, 
      song: result.rows[0] 
    });

  } catch (error) {
    console.error('Error al actualizar estado de la canción:', error);
    res.status(500).json({ error: 'Error interno al actualizar el estado' });
  }
};