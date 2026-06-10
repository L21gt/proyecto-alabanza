import pool from '../config/database';

const seedSongs = async () => {
  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insertamos una canción de adoración
      const song1 = await client.query(`
        INSERT INTO songs (title, author, original_key, tempo, category, content) 
        VALUES (
          'Cuan Grande es Él', 
          'Himno Tradicional', 
          'G', 
          65, 
          'Adoracion', 
          'G\\nSeñor mi Dios, al contemplar los cielos\\nC\\nEl firmamento y las estrellas mil'
        ) RETURNING id;
      `);

      // Insertamos una canción de alabanza
      const song2 = await client.query(`
        INSERT INTO songs (title, author, original_key, tempo, category, content) 
        VALUES (
          'Bueno es Alabarte', 
          'Danilo Montero', 
          'D', 
          120, 
          'Alabanza', 
          'D                  G\\nBueno es alabarte oh Señor\\n        A                D\\nTu nombre dar gloria y honor'
        ) RETURNING id;
      `);

      // Insertamos temas (asegurándonos de que no se dupliquen)
      await client.query(`INSERT INTO themes (name) VALUES ('majestad'), ('gratitud'), ('gozo') ON CONFLICT DO NOTHING;`);

      // Obtenemos los IDs de los temas
      const themes = await client.query(`SELECT id, name FROM themes WHERE name IN ('majestad', 'gratitud', 'gozo');`);
      const majestadId = themes.rows.find(t => t.name === 'majestad')?.id;
      const gratitudId = themes.rows.find(t => t.name === 'gratitud')?.id;
      const gozoId = themes.rows.find(t => t.name === 'gozo')?.id;

      // Vinculamos temas a las canciones
      if (majestadId) await client.query(`INSERT INTO song_themes (song_id, theme_id) VALUES ($1, $2)`, [song1.rows[0].id, majestadId]);
      if (gratitudId) await client.query(`INSERT INTO song_themes (song_id, theme_id) VALUES ($1, $2)`, [song1.rows[0].id, gratitudId]);
      if (gozoId) await client.query(`INSERT INTO song_themes (song_id, theme_id) VALUES ($1, $2)`, [song2.rows[0].id, gozoId]);
      if (gratitudId) await client.query(`INSERT INTO song_themes (song_id, theme_id) VALUES ($1, $2)`, [song2.rows[0].id, gratitudId]);

      await client.query('COMMIT');
      console.log('✅ Canciones de prueba insertadas exitosamente');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error al insertar canciones:', error);
  } finally {
    pool.end();
  }
};

seedSongs();