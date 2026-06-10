import { Request, Response } from 'express';
import pool from '../config/database';
import { transposeChord, transposeSongContent } from '../utils/transposer';

export const createSong = async (req: Request, res: Response): Promise<void> => {
  const { title, author, original_key, tempo, category, content, themes } = req.body;

  // 1. Validación de campos obligatorios para cumplir con nuestra prueba
  if (!title || !author || !original_key || !category || !content) {
    res.status(400).json({ error: 'Faltan campos obligatorios' });
    return;
  }

  // 2. Solicitamos un "cliente" dedicado del pool para asegurar la transacción
  const client = await pool.connect();

  try {
    // Iniciamos la Transacción
    await client.query('BEGIN');

    // 3. Insertar la Canción
    const insertSongQuery = `
      INSERT INTO songs (title, author, original_key, tempo, category, content)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title
    `;
    const songResult = await client.query(insertSongQuery, [title, author, original_key, tempo, category, content]);
    const newSong = songResult.rows[0];

    // 4. Lógica "Buscar o Crear" para los Temas
    if (themes && Array.isArray(themes) && themes.length > 0) {
      for (const themeName of themes) {
        // Estandarizamos el texto (ej. "  Guerra Espiritual  " -> "guerra espiritual")
        const normalizedTheme = themeName.trim().toLowerCase();

        let themeId: number;

        // Intentamos insertar el tema. Si ya existe (ON CONFLICT), no hace nada (DO NOTHING)
        const insertThemeQuery = `
          INSERT INTO themes (name) VALUES ($1)
          ON CONFLICT (name) DO NOTHING
          RETURNING id
        `;
        const themeResult = await client.query(insertThemeQuery, [normalizedTheme]);

        if (themeResult.rows.length > 0) {
          // El tema era nuevo y se creó
          themeId = themeResult.rows[0].id;
        } else {
          // El tema ya existía, lo buscamos para obtener su ID
          const selectThemeQuery = `SELECT id FROM themes WHERE name = $1`;
          const existingTheme = await client.query(selectThemeQuery, [normalizedTheme]);
          themeId = existingTheme.rows[0].id;
        }

        // 5. Enlazamos la canción con el tema en la tabla intermedia
        await client.query(
          `INSERT INTO song_themes (song_id, theme_id) VALUES ($1, $2)`,
          [newSong.id, themeId]
        );
      }
    }

    // Si llegamos hasta aquí sin errores, confirmamos todos los cambios permanentemente
    await client.query('COMMIT');

    res.status(201).json({
      message: 'Canción creada exitosamente',
      song: newSong
    });

  } catch (error) {
    // Si algo falló (ej. error de sintaxis SQL), revertimos todo para no dejar datos a medias
    await client.query('ROLLBACK');
    console.error('Error al crear la canción:', error);
    res.status(500).json({ error: 'Error interno al guardar la canción' });
  } finally {
    // Siempre devolvemos el cliente al pool, haya fallado o no
    client.release();
  }
};

export const getAllSongs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    
    // Seleccionamos campos específicos para no saturar la red enviando todo el bloque de texto
    let query = 'SELECT id, title, author, original_key, category FROM songs';
    const queryParams: any[] = [];

    // Si enviaron un parámetro de búsqueda, filtramos usando ILIKE (no distingue mayúsculas/minúsculas)
    if (search) {
      query += ' WHERE title ILIKE $1';
      queryParams.push(`%${search}%`);
    }

    query += ' ORDER BY title ASC';

    const result = await pool.query(query, queryParams);
    res.status(200).json({ songs: result.rows });

  } catch (error) {
    console.error('Error al obtener catálogo de canciones:', error);
    res.status(500).json({ error: 'Error interno al obtener las canciones' });
  }
};

export const getSongById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // CORRECCIÓN 1: Leemos "transpose" en lugar de "semitones" porque así lo envía el frontend
    const { transpose } = req.query; 

    const songResult = await pool.query('SELECT * FROM songs WHERE id = $1', [id]);
    
    if (songResult.rows.length === 0) {
      res.status(404).json({ error: 'Canción no encontrada' });
      return;
    }

    const song = songResult.rows[0];

    // Buscamos los temas
    const themesResult = await pool.query(`
      SELECT t.name 
      FROM themes t
      INNER JOIN song_themes st ON t.id = st.theme_id
      WHERE st.song_id = $1
    `, [id]);
    song.themes = themesResult.rows.map(row => row.name);

    // ============================================
    // LÓGICA DE TRANSPOSICIÓN AL VUELO
    // ============================================
    
    // CORRECCIÓN 2: Evaluamos "transpose"
    if (transpose && !isNaN(Number(transpose))) {
      const steps = Number(transpose);
      
      // CORRECCIÓN 3: Sobrescribimos original_key para que el frontend lo lea y cambie la insignia visual
      song.original_key = transposeChord(song.original_key, steps);
      
      // Transponemos todo el bloque de texto
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
  const { title, author, original_key, tempo, category, content, themes } = req.body;

  // 1. Validar campos
  if (!title || !author || !original_key || !category || !content) {
    res.status(400).json({ error: 'Faltan campos obligatorios' });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 2. Actualizar los datos base de la canción
    const updateSongQuery = `
      UPDATE songs 
      SET title = $1, author = $2, original_key = $3, tempo = $4, category = $5, content = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    const songResult = await client.query(updateSongQuery, [title, author, original_key, tempo, category, content, id]);

    // Si la canción no existe, cancelamos la transacción y respondemos 404
    if (songResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Canción no encontrada' });
      return;
    }

    const updatedSong = songResult.rows[0];

    // 3. Patrón "Limpiar y Reemplazar" para los temas
    // Borramos las relaciones anteriores sin tocar la tabla maestra de 'themes'
    await client.query('DELETE FROM song_themes WHERE song_id = $1', [id]);

    // 4. Volvemos a aplicar la lógica dinámica de Buscar o Crear con las nuevas etiquetas
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
    
    // Al eliminar la canción, PostgreSQL limpiará la tabla song_themes automáticamente
    // gracias a la restricción ON DELETE CASCADE que configuramos en la base de datos.
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