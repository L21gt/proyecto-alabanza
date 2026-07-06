import { Request, Response } from 'express';
import pool from '../config/database';

// JWT Payload Interface definition
interface AuthUser {
  id: number;
  email: string;
  role: string;
}

export const createSetlist = async (req: Request, res: Response): Promise<void> => {
  const { name, event_date } = req.body;
  // Type casting to access the user object injected by auth.middleware
  const user = (req as any).user as AuthUser;

  if (!name) {
    res.status(400).json({ error: 'El nombre del repertorio es requerido' });
    return;
  }

  try {
    const query = `
      INSERT INTO setlists (name, event_date, user_id)
      VALUES ($1, $2, $3) RETURNING *
    `;
    const result = await pool.query(query, [name, event_date || null, user.id]);
    res.status(201).json({ message: 'Repertorio creado exitosamente', setlist: result.rows[0] });
  } catch (error) {
    console.error('Error al crear repertorio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getSetlists = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM setlists ORDER BY created_at DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al obtener repertorios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getSetlistById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const setlistRes = await pool.query('SELECT * FROM setlists WHERE id = $1', [id]);
    if (setlistRes.rows.length === 0) {
      res.status(404).json({ error: 'Repertorio no encontrado' });
      return;
    }

    // Join query to retrieve songs data along with their specific setlist attributes
    const songsRes = await pool.query(`
      SELECT ss.song_id, ss.transposed_key, ss.sort_order, s.title, s.author, s.original_key, s.tempo 
      FROM setlist_songs ss
      JOIN songs s ON ss.song_id = s.id
      WHERE ss.setlist_id = $1
      ORDER BY ss.sort_order ASC
    `, [id]);

    const setlist = setlistRes.rows[0];
    setlist.songs = songsRes.rows;

    res.status(200).json(setlist);
  } catch (error) {
    console.error('Error al obtener el repertorio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const addSongToSetlist = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { song_id, transposed_key, sort_order, group_name } = req.body; // <-- Agregamos group_name
  const user = (req as any).user as AuthUser;

  // Validación básica para evitar queries nulos
  if (!song_id) {
    res.status(400).json({ error: 'El ID de la canción es obligatorio' });
    return;
  }

  try {
    // RBAC: Verify ownership or Admin privileges
    const setlistRes = await pool.query('SELECT user_id FROM setlists WHERE id = $1', [id]);
    if (setlistRes.rows.length === 0) {
      res.status(404).json({ error: 'Repertorio no encontrado' });
      return;
    }

    if (user.role !== 'Admin' && setlistRes.rows[0].user_id !== user.id) {
      res.status(403).json({ error: 'No tienes permisos para modificar este repertorio' });
      return;
    }

    // Insertamos incluyendo la nueva columna
    const query = `
      INSERT INTO setlist_songs (setlist_id, song_id, transposed_key, sort_order, group_name)
      VALUES ($1, $2, $3, $4, $5)
    `;
    
    await pool.query(query, [
      id, 
      song_id, 
      transposed_key || null, 
      sort_order || 0, 
      group_name || null // <-- Si no viene, será null
    ]);
    
    res.status(201).json({ message: 'Canción agregada al repertorio' });
  } catch (error) {
    console.error('Error al agregar canción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const removeSongFromSetlist = async (req: Request, res: Response): Promise<void> => {
  const { id, songId } = req.params;
  const user = (req as any).user as AuthUser;

  try {
    // RBAC: Verify ownership or Admin privileges
    const setlistRes = await pool.query('SELECT user_id FROM setlists WHERE id = $1', [id]);
    if (setlistRes.rows.length === 0) {
      res.status(404).json({ error: 'Repertorio no encontrado' });
      return;
    }

    if (user.role !== 'Admin' && setlistRes.rows[0].user_id !== user.id) {
      res.status(403).json({ error: 'No tienes permisos para modificar este repertorio' });
      return;
    }

    await pool.query('DELETE FROM setlist_songs WHERE setlist_id = $1 AND song_id = $2', [id, songId]);
    res.status(200).json({ message: 'Canción removida del repertorio' });
  } catch (error) {
    console.error('Error al remover canción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const deleteSetlist = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const user = (req as any).user as AuthUser;

  try {
    // RBAC: Verify ownership or Admin privileges
    const setlistRes = await pool.query('SELECT user_id FROM setlists WHERE id = $1', [id]);
    if (setlistRes.rows.length === 0) {
      res.status(404).json({ error: 'Repertorio no encontrado' });
      return;
    }

    if (user.role !== 'Admin' && setlistRes.rows[0].user_id !== user.id) {
      res.status(403).json({ error: 'No tienes permisos para eliminar este repertorio' });
      return;
    }

    await pool.query('DELETE FROM setlists WHERE id = $1', [id]);
    res.status(200).json({ message: 'Repertorio eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar repertorio:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const reorderSetlistSongs = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { songs } = req.body; // Recibimos un arreglo de { song_id, sort_order, group_name }
  const user = (req as any).user as AuthUser;

  if (!songs || !Array.isArray(songs)) {
    res.status(400).json({ error: 'Formato de datos inválido para reordenar' });
    return;
  }

  try {
    // RBAC: Verificamos propiedad o si es Admin
    const setlistRes = await pool.query('SELECT user_id FROM setlists WHERE id = $1', [id]);
    if (setlistRes.rows.length === 0) {
      res.status(404).json({ error: 'Repertorio no encontrado' });
      return;
    }

    if (user.role !== 'Admin' && setlistRes.rows[0].user_id !== user.id) {
      res.status(403).json({ error: 'No tienes permisos para modificar este repertorio' });
      return;
    }

    // Usamos un cliente dedicado para la Transacción Masiva
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const song of songs) {
        await client.query(
          `UPDATE setlist_songs 
           SET sort_order = $1, group_name = $2 
           WHERE setlist_id = $3 AND song_id = $4`,
          [song.sort_order, song.group_name || null, id, song.song_id]
        );
      }

      await client.query('COMMIT');
      res.status(200).json({ message: 'Orden de canciones actualizado exitosamente' });
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error al reordenar el repertorio:', error);
    res.status(500).json({ error: 'Error interno del servidor al reordenar' });
  }
};