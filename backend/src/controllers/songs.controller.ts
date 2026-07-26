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
  const { title, author, version, original_key, tempo, category, content, video_link, themes } = req.body;

  if (!title || !author || !original_key || !category || !content) {
    res.status(400).json({ error: 'Faltan campos obligatorios' });
    return;
  }

  // AQUÍ ESTÁ LA SEGURIDAD: Definimos el estado según el rol
  const initialStatus = req.user?.role === 'Admin' ? 'Aprobado' : 'Pendiente';
  
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // INSERTAMOS con el 'initialStatus' calculado arriba
    const insertSongQuery = `
      INSERT INTO songs (title, author, version, original_key, tempo, category, content, video_link, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, title, status
    `;
    const songResult = await client.query(insertSongQuery, [
      title, author, version || null, original_key, tempo, category, content, video_link || null, initialStatus
    ]);
    const newSong = songResult.rows[0];

    // MANTENEMOS TU LÓGICA DE TEMAS (ETIQUETAS)
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

export const getAllSongs = async (req: Request, res: Response): Promise<void> => {
  // Extraemos parámetros de paginación y filtros
  const { search, category, author, original_key, page = '1', limit = '12' } = req.query;

  try {
    let query = "SELECT * FROM songs WHERE status = 'Aprobado'";
    const queryParams: any[] = [];
    let paramCount = 1;

    // Filtro de Búsqueda General (Título, Autor o Etiquetas)
    if (search) {
      queryParams.push(`%${search}%`);
      query += ` AND (
        title ILIKE $${paramCount} OR 
        author ILIKE $${paramCount} OR 
        id IN (
          SELECT song_id FROM song_themes st
          JOIN themes t ON st.theme_id = t.id
          WHERE t.name ILIKE $${paramCount}
        )
      )`;
      paramCount++;
    }

    // Filtros Específicos
    if (category) {
      queryParams.push(category);
      query += ` AND category = $${paramCount}`;
      paramCount++;
    }

    if (author) {
      queryParams.push(`%${author}%`);
      query += ` AND author ILIKE $${paramCount}`;
      paramCount++;
    }

    if (original_key) {
      queryParams.push(original_key);
      query += ` AND original_key = $${paramCount}`;
      paramCount++;
    }

    // 1. Calculamos el total de resultados para la Paginación
    const countQuery = `SELECT COUNT(*) FROM (${query}) AS filtered_songs`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalItems = parseInt(countResult.rows[0].count, 10);

    // 2. Aplicamos ordenamiento, LIMIT y OFFSET
    query += ' ORDER BY title ASC';
    
    const parsedPage = parseInt(page as string, 10) || 1;
    const parsedLimit = parseInt(limit as string, 10) || 12;
    const offset = (parsedPage - 1) * parsedLimit;
    
    queryParams.push(parsedLimit, offset);
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;

    const result = await pool.query(query, queryParams);
    
    res.status(200).json({ 
      songs: result.rows,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / parsedLimit),
        currentPage: parsedPage,
        pageSize: parsedLimit
      }
    });
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
    // Forzamos que cualquier edición guardada por el administrador apruebe la canción automáticamente
    const updateSongQuery = `
      UPDATE songs 
      SET title = $1, 
          author = $2, 
          version = $3, 
          original_key = $4, 
          tempo = $5, 
          category = $6, 
          content = $7, 
          video_link = $8, 
          status = 'Aprobado', 
          updated_at = CURRENT_TIMESTAMP
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

export const getPendingSongs = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT * FROM songs 
      WHERE status = 'Pendiente' 
      ORDER BY created_at DESC
    `);
    res.status(200).json({ songs: result.rows });
  } catch (error) {
    console.error('Error al obtener canciones pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};