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
  const { title, author, version, original_key, tempo, category, content, video_link, status } = req.body;
  const tags = req.body.tags || req.body.themes; 

  if (!title || !author || !original_key || !category || !content) {
    res.status(400).json({ error: 'Faltan campos obligatorios' });
    return;
  }

  if (tags && Array.isArray(tags) && tags.length > 10) {
    res.status(400).json({ error: 'Se permite un máximo de 10 etiquetas por canción' });
    return;
  }

  let initialStatus = req.user?.role === 'Admin' ? 'Aprobado' : 'Pendiente';
  if (req.user?.role === 'Admin' && status === 'Borrador') {
    initialStatus = 'Borrador';
  }
  
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertSongQuery = `
      INSERT INTO songs (title, author, version, original_key, tempo, category, content, video_link, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, title, status
    `;
    const songResult = await client.query(insertSongQuery, [
      title, author, version || null, original_key, tempo, category, content, video_link || null, initialStatus, req.user?.id || null
    ]);
    const newSong = songResult.rows[0];

    await client.query(
      `INSERT INTO song_audit_logs (song_id, user_id, action, new_status, notes) VALUES ($1, $2, $3, $4, $5)`,
      [newSong.id, req.user?.id || null, 'CREACION', initialStatus, `Canción registrada en estado: ${initialStatus}`]
    );

    if (tags && Array.isArray(tags) && tags.length > 0) {
      const safeTags = tags.slice(0, 10);
      for (const tagName of safeTags) {
        const normalizedTag = tagName.trim().toLowerCase();
        let tagId: number;
        
        const checkTagQuery = `SELECT id FROM tags WHERE name = $1`;
        const existingTag = await client.query(checkTagQuery, [normalizedTag]);

        if (existingTag.rows.length > 0) {
          tagId = existingTag.rows[0].id;
        } else {
          const insertTagQuery = `INSERT INTO tags (name) VALUES ($1) RETURNING id`;
          const tagResult = await client.query(insertTagQuery, [normalizedTag]);
          tagId = tagResult.rows[0].id;
        }

        await client.query(
          `INSERT INTO song_tags (song_id, tag_id) VALUES ($1, $2)`,
          [newSong.id, tagId]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: initialStatus === 'Aprobado' ? 'Canción creada exitosamente' : 'Canción guardada',
      song: newSong,
      id: newSong.id
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear la canción:', error);
    res.status(500).json({ error: 'Error interno al guardar la canción' });
  } finally {
    client.release();
  }
};

export const getSongById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { transpose } = req.query; 

    const songResult = await pool.query('SELECT * FROM songs WHERE id = $1 AND deleted_at IS NULL', [id]);
    
    if (songResult.rows.length === 0) {
      res.status(404).json({ error: 'Canción no encontrada o eliminada' });
      return;
    }

    const song = songResult.rows[0];

    if ((song.status === 'Pendiente' || song.status === 'Borrador') && req.user?.role !== 'Admin') {
      res.status(403).json({ error: 'Esta canción está en revisión o borrador y no está disponible públicamente.' });
      return;
    }

    try {
      const tagsResult = await pool.query(`
        SELECT t.name 
        FROM tags t
        INNER JOIN song_tags st ON t.id = st.tag_id
        WHERE st.song_id = $1
      `, [id]);
      
      song.tags = tagsResult.rows.map((row: {name: string}) => row.name);
    } catch (e) {
      console.error("Error obteniendo etiquetas:", e);
      song.tags = [];
    }

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

export const getAllSongs = async (req: Request, res: Response): Promise<void> => {
  const { search, category, author, original_key, page = '1', limit = '12' } = req.query;

  try {
    let query = "SELECT * FROM songs WHERE status = 'Aprobado' AND deleted_at IS NULL";
    const queryParams: any[] = [];
    let paramCount = 1;

    if (search) {
      queryParams.push(`%${search}%`);
      query += ` AND (
        title ILIKE $${paramCount} OR 
        author ILIKE $${paramCount} OR 
        id IN (
          -- CORRECCIÓN 2: Buscador apunta a tags y song_tags
          SELECT song_id FROM song_tags st
          JOIN tags t ON st.tag_id = t.id
          WHERE t.name ILIKE $${paramCount}
        )
      )`;
      paramCount++;
    }

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

    const countQuery = `SELECT COUNT(*) FROM (${query}) AS filtered_songs`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalItems = parseInt(countResult.rows[0].count, 10);

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

export const updateSong = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { title, author, version, original_key, tempo, category, content, video_link, status } = req.body;
  const tags = req.body.tags || req.body.themes; // Soporte unificado de etiquetas

  if (!title || !author || !original_key || !category || !content) {
    res.status(400).json({ error: 'Faltan campos obligatorios' });
    return;
  }

  if (tags && Array.isArray(tags) && tags.length > 10) {
    res.status(400).json({ error: 'Se permite un máximo de 10 etiquetas por canción' });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const prevQuery = await client.query('SELECT status, deleted_at FROM songs WHERE id = $1', [id]);
    if (prevQuery.rows.length === 0 || prevQuery.rows[0].deleted_at !== null) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Canción no encontrada o eliminada' });
      return;
    }
    const previousStatus = prevQuery.rows[0].status;

    const targetStatus = status || 'Aprobado';

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
          status = $9, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `;
    const songResult = await client.query(updateSongQuery, [
      title, author, version || null, original_key, tempo, category, content, video_link || null, targetStatus, id
    ]);

    const updatedSong = songResult.rows[0];

    await client.query(
      `INSERT INTO song_audit_logs (song_id, user_id, action, previous_status, new_status, notes) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, req.user?.id || null, 'EDICION', previousStatus, targetStatus, `Edición del contenido / metadatos de la canción`]
    );

    // CORRECCIÓN 3: Limpiamos y actualizamos las etiquetas en la nueva tabla 'song_tags'
    await client.query('DELETE FROM song_tags WHERE song_id = $1', [id]);

    if (tags && Array.isArray(tags) && tags.length > 0) {
      const safeTags = tags.slice(0, 10);
      for (const tagName of safeTags) {
        const normalizedTag = tagName.trim().toLowerCase();
        let tagId: number;

        const checkTagQuery = `SELECT id FROM tags WHERE name = $1`;
        const existingTag = await client.query(checkTagQuery, [normalizedTag]);

        if (existingTag.rows.length > 0) {
          tagId = existingTag.rows[0].id;
        } else {
          const insertTagQuery = `INSERT INTO tags (name) VALUES ($1) RETURNING id`;
          const tagResult = await client.query(insertTagQuery, [normalizedTag]);
          tagId = tagResult.rows[0].id;
        }

        await client.query(
          `INSERT INTO song_tags (song_id, tag_id) VALUES ($1, $2)`,
          [id, tagId]
        );
      }
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Canción actualizada exitosamente', song: updatedSong });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar:', error);
    res.status(500).json({ error: 'Error interno al actualizar la canción' });
  } finally {
    client.release();
  }
};

export const deleteSong = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const checkQuery = await client.query('SELECT status, deleted_at FROM songs WHERE id = $1', [id]);
    
    if (checkQuery.rows.length === 0 || checkQuery.rows[0].deleted_at !== null) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Canción no encontrada o ya estaba eliminada' });
      return;
    }

    const previousStatus = checkQuery.rows[0].status;

    // CORRECCIÓN 1: No actualizamos 'deleted_by' en la tabla songs, 
    // esa trazabilidad la maneja la bitácora 'song_audit_logs'.
    await client.query(
      `UPDATE songs 
       SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );

    await client.query(
      `INSERT INTO song_audit_logs (song_id, user_id, action, previous_status, notes) 
       VALUES ($1, $2, $3, $4, $5)`,
      [id, req.user?.id || null, 'ELIMINACION', previousStatus, 'La canción fue enviada a la papelera (Soft Delete)']
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'Canción eliminada lógicamente de manera exitosa' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar (Soft Delete):', error);
    res.status(500).json({ error: 'Error interno al intentar eliminar la canción' });
  } finally {
    client.release();
  }
};

export const updateSongStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Acceso denegado. Solo los administradores pueden cambiar el estado.' });
    return;
  }

  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'Aprobado' && status !== 'Pendiente' && status !== 'Borrador') {
    res.status(400).json({ error: 'Estado inválido. Debe ser Aprobado, Pendiente o Borrador.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const prevQuery = await client.query('SELECT status, deleted_at FROM songs WHERE id = $1', [id]);
    if (prevQuery.rows.length === 0 || prevQuery.rows[0].deleted_at !== null) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Canción no encontrada o eliminada' });
      return;
    }
    const previousStatus = prevQuery.rows[0].status;

    const result = await client.query(
      'UPDATE songs SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, title, status',
      [status, id]
    );

    await client.query(
      `INSERT INTO song_audit_logs (song_id, user_id, action, previous_status, new_status, notes) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, req.user?.id || null, 'CAMBIO_ESTADO', previousStatus, status, `Cambio de estado editorial a: ${status}`]
    );

    await client.query('COMMIT');

    res.status(200).json({ 
      message: `Estado cambiado a ${status.toLowerCase()} exitosamente`, 
      song: result.rows[0] 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error interno al actualizar el estado' });
  } finally {
    client.release();
  }
};

export const getPendingSongs = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT * FROM songs 
      WHERE status IN ('Pendiente', 'Borrador') 
      AND deleted_at IS NULL
      ORDER BY created_at DESC
    `);
    res.status(200).json({ songs: result.rows });
  } catch (error) {
    console.error('Error al obtener canciones pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getSongAuditHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        l.id,
        l.action,
        l.previous_status,
        l.new_status,
        l.notes,
        l.created_at,
        COALESCE(u.name, 'Usuario del Sistema') AS user_name,
        u.email AS user_email
      FROM song_audit_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.song_id = $1
      ORDER BY l.created_at DESC
    `;
    const result = await pool.query(query, [id]);

    res.status(200).json({ history: result.rows });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error interno al obtener el historial de cambios' });
  }
};

export const getDeletedSongs = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Acceso denegado.' });
    return;
  }

  try {
    // CORRECCIÓN 1: Buscamos al responsable de la eliminación en la tabla de bitácora (song_audit_logs)
    const query = `
      SELECT 
        s.*, 
        u.name as deleted_by_name 
      FROM songs s
      LEFT JOIN song_audit_logs l ON s.id = l.song_id AND l.action = 'ELIMINACION'
      LEFT JOIN users u ON l.user_id = u.id
      WHERE s.deleted_at IS NOT NULL
      ORDER BY s.deleted_at DESC
    `;
    const result = await pool.query(query);
    
    res.status(200).json({ songs: result.rows });
  } catch (error) {
    console.error('Error al obtener la papelera:', error);
    res.status(500).json({ error: 'Error interno al obtener canciones eliminadas' });
  }
};

export const restoreSong = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'Admin') {
    res.status(403).json({ error: 'Acceso denegado.' });
    return;
  }

  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const prevQuery = await client.query('SELECT status, deleted_at FROM songs WHERE id = $1', [id]);
    if (prevQuery.rows.length === 0 || prevQuery.rows[0].deleted_at === null) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'La canción no se encuentra en la papelera' });
      return;
    }
    const previousStatus = prevQuery.rows[0].status;

    // CORRECCIÓN 1: Ya no actualizamos 'deleted_by' aquí, solo 'deleted_at'
    const updateQuery = `
      UPDATE songs 
      SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING *
    `;
    const result = await client.query(updateQuery, [id]);

    await client.query(
      `INSERT INTO song_audit_logs (song_id, user_id, action, previous_status, new_status, notes) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, req.user?.id || null, 'RESTAURACION', previousStatus, previousStatus, 'La canción fue restaurada desde la papelera']
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'Canción restaurada exitosamente', song: result.rows[0] });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al restaurar:', error);
    res.status(500).json({ error: 'Error interno al restaurar la canción' });
  } finally {
    client.release();
  }
};