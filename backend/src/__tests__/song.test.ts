import request from 'supertest';
import app from '../app';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

describe('Módulo de Canciones', () => {
  const secret = process.env.JWT_SECRET || 'secret_de_respaldo';
  const tokenMusico = jwt.sign({ id: 1, role: 'Musico', status: 'Aprobado' }, secret);
  const tokenAdmin = jwt.sign({ id: 2, role: 'Admin', status: 'Aprobado' }, secret);

  // Setup: Preparamos la base de datos creando los usuarios de prueba y los temas
  beforeAll(async () => {
    // 1. Limpiamos las tablas hijas primero para no violar restricciones de Foreign Key
    await pool.query('DELETE FROM song_audit_logs');
    await pool.query('DELETE FROM song_themes');
    await pool.query('DELETE FROM themes');
    await pool.query('DELETE FROM songs');
    await pool.query('DELETE FROM users WHERE id IN (1, 2)');

    // 2. INSERTAMOS USUARIOS CON LAS COLUMNAS EXACTAS DE init.sql (password_hash, birth_date, user_role)
    await pool.query(`
      INSERT INTO users (id, name, email, password_hash, birth_date, role, status)
      VALUES 
        (1, 'Músico Test', 'musico@test.com', 'hashpass', '1995-01-01', 'Usuario', 'Aprobado'),
        (2, 'Admin Test', 'admin@test.com', 'hashpass', '1990-01-01', 'Admin', 'Aprobado')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3. Insertamos los temas de prueba
    await pool.query(`INSERT INTO themes (name) VALUES ('adoracion'), ('fe')`);
  });

  afterAll(async () => {
    // Limpiamos los datos generados durante la ejecución de las pruebas
    await pool.query('DELETE FROM song_audit_logs');
    await pool.query('DELETE FROM song_themes');
    await pool.query('DELETE FROM themes');
    await pool.query('DELETE FROM songs');
    await pool.query('DELETE FROM users WHERE id IN (1, 2)');
    
    // Cerramos la conexión al terminar para evitar procesos "colgados" (memory leaks)
    await pool.end();
  });

  describe('1. Seguridad y Permisos', () => {
    it('Debería denegar acceso si no se envía token (401)', async () => {
      const res = await request(app).get('/api/songs');
      expect(res.status).toBe(401);
    });

    it('Debería permitir acceso a GET /api/songs con un token válido (200)', async () => {
      const res = await request(app)
        .get('/api/songs')
        .set('Authorization', `Bearer ${tokenMusico}`);
      expect(res.status).toBe(200);
    });

    it('Debería permitir a un Músico proponer una canción en estado Pendiente (201)', async () => {
      const res = await request(app)
        .post('/api/songs')
        .set('Authorization', `Bearer ${tokenMusico}`)
        .send({
          title: 'Nueva Canción Propuesta',
          author: 'Músico Local',
          original_key: 'D',
          tempo: 90,
          category: 'Alabanza',
          content: 'D\nLetra propuesta'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Canción propuesta enviada a revisión');
      expect(res.body.song).toHaveProperty('status', 'Pendiente');
    });
  });

  describe('2. Creación de Canciones (Transacciones)', () => {
    it('Debería retornar 400 si faltan campos obligatorios', async () => {
      const res = await request(app)
        .post('/api/songs')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          title: 'Canción Incompleta'
          // Faltan author, original_key, content, etc.
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Faltan campos obligatorios');
    });

    it('Debería crear la canción, enlazar los temas (COMMIT) y retornar 201', async () => {
      const res = await request(app)
        .post('/api/songs')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          title: 'Cuan Grande Es El',
          author: 'Tradicional',
          original_key: 'G',
          tempo: 72,
          category: 'Adoracion',
          content: 'G\nCuan grande es El',
          themes: ['Adoracion', 'Fe', 'Nuevo Tema']
        });

      // Validamos la respuesta HTTP
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Canción creada y publicada exitosamente');
      expect(res.body.song).toHaveProperty('id');
      expect(res.body.song).toHaveProperty('title', 'Cuan Grande Es El');

      // Validamos directamente en la base de datos que la transacción funcionó
      const result = await pool.query('SELECT * FROM song_themes WHERE song_id = $1', [res.body.song.id]);
      expect(result.rows.length).toBe(3); // Debe tener 3 temas enlazados
    });

    it('Debería retornar 500 si la base de datos rechaza una categoría inválida', async () => {
      const res = await request(app)
        .post('/api/songs')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          title: 'Canción Inválida',
          author: 'Autor',
          original_key: 'C',
          category: 'CategoriaFalsa', // PostgreSQL rechazará esto por su restricción ENUM
          content: 'Letra'
        });

      expect(res.status).toBe(500);
    });
  });

  describe('3. Lectura de Canciones (GET)', () => {
    let testSongId: number;

    // Preparamos una canción específica para asegurar que las búsquedas funcionen
    beforeAll(async () => {
      const result = await pool.query(`
        INSERT INTO songs (title, author, original_key, tempo, category, content, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, ['Bueno es Alabarte', 'Danilo Montero', 'G', 120, 'Alabanza', 'G\\nBueno es alabarte oh Señor', 1]);
      
      testSongId = result.rows[0].id;
    });

    it('Debería retornar la lista de todas las canciones (200)', async () => {
      const res = await request(app)
        .get('/api/songs')
        .set('Authorization', `Bearer ${tokenMusico}`); // Un Músico tiene permisos para leer

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.songs)).toBe(true);
      expect(res.body.songs.length).toBeGreaterThan(0);
      expect(res.body.pagination).toBeDefined();
    });

    it('Debería filtrar canciones por parámetro de búsqueda (200)', async () => {
      const res = await request(app)
        .get('/api/songs?search=Bueno es')
        .set('Authorization', `Bearer ${tokenMusico}`);

      expect(res.status).toBe(200);
      expect(res.body.songs.length).toBeGreaterThan(0);
      expect(res.body.songs[0].title).toContain('Bueno es Alabarte');
    });

    it('Debería retornar el detalle de una canción por ID (200)', async () => {
      const res = await request(app)
        .get(`/api/songs/${testSongId}`)
        .set('Authorization', `Bearer ${tokenMusico}`);

      expect(res.status).toBe(200);
      expect(res.body.song).toHaveProperty('id', testSongId);
      expect(res.body.song).toHaveProperty('content', 'G\\nBueno es alabarte oh Señor');
    });

    it('Debería retornar 404 si el ID de la canción no existe', async () => {
      const res = await request(app)
        .get('/api/songs/999999')
        .set('Authorization', `Bearer ${tokenMusico}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Canción no encontrada');
    });

    it('Debería retornar la canción transpuesta (+2 semitonos) si se incluye en la URL', async () => {
      const res = await request(app)
        .get(`/api/songs/${testSongId}?transpose=2`)
        .set('Authorization', `Bearer ${tokenMusico}`);

      expect(res.status).toBe(200);
      expect(res.body.song).toHaveProperty('original_key', 'A');
      expect(res.body.song.content).toContain('A\nBueno es alabarte oh Señor');
    });

    it('Debería retornar 200 e ignorar la transposición si la clave es inválida', async () => {
      const res = await request(app)
        .get(`/api/songs/${testSongId}?transpose=H#`)
        .set('Authorization', `Bearer ${tokenMusico}`);

      expect(res.status).toBe(200);
      expect(res.body.song).toHaveProperty('content');
    });
  });

  describe('4. Actualización y Eliminación (PUT / DELETE)', () => {
    let updateSongId: number;

    beforeAll(async () => {
      const result = await pool.query(`
        INSERT INTO songs (title, author, original_key, tempo, category, content, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, ['Cancion Temporal', 'Autor Test', 'C', 100, 'Adoracion', 'C\\nTest', 2]);
      updateSongId = result.rows[0].id;
    });

    it('Debería denegar la actualización si no es Admin (403)', async () => {
      const res = await request(app)
        .put(`/api/songs/${updateSongId}`)
        .set('Authorization', `Bearer ${tokenMusico}`)
        .send({ title: 'Intento de Hackeo' });

      expect(res.status).toBe(403);
    });

    it('Debería actualizar la canción y reemplazar temas (200)', async () => {
      const res = await request(app)
        .put(`/api/songs/${updateSongId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          title: 'Cancion Editada',
          author: 'Autor Test',
          original_key: 'D',
          tempo: 105,
          category: 'Alabanza',
          content: 'D\\nTest Editado',
          themes: ['restauracion']
        });

      expect(res.status).toBe(200);
      expect(res.body.song).toHaveProperty('title', 'Cancion Editada');
      expect(res.body.song).toHaveProperty('original_key', 'D');
    });

    it('Debería eliminar la canción exitosamente (200)', async () => {
      const res = await request(app)
        .delete(`/api/songs/${updateSongId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Canción eliminada exitosamente');
    });

    it('Debería retornar 404 al buscar la canción que acabamos de eliminar', async () => {
      const res = await request(app)
        .get(`/api/songs/${updateSongId}`)
        .set('Authorization', `Bearer ${tokenMusico}`);

      expect(res.status).toBe(404);
    });

    it('Debería retornar 400 si intentamos actualizar con campos incompletos', async () => {
      const res = await request(app)
        .put(`/api/songs/${updateSongId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          title: '', 
          original_key: 'D'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('5. Manejo de Errores Internos (500) y Casos Límite', () => {
    it('Debería retornar 500 al fallar la creación de canción', async () => {
      const connectSpy = (jest.spyOn(pool, 'connect') as jest.Mock).mockRejectedValueOnce(new Error('Fallo DB'));
      
      const res = await request(app)
        .post('/api/songs')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ title: 'Test', author: 'Test', original_key: 'C', tempo: 100, category: 'Alabanza', content: 'C' });
      
      expect(res.status).toBe(500);
      connectSpy.mockRestore();
    });

    it('Debería retornar 500 al fallar la obtención de todas las canciones', async () => {
      const querySpy = (jest.spyOn(pool, 'query') as jest.Mock).mockRejectedValueOnce(new Error('Fallo DB'));
      const res = await request(app).get('/api/songs').set('Authorization', `Bearer ${tokenMusico}`);
      expect(res.status).toBe(500);
      querySpy.mockRestore();
    });

    it('Debería retornar 500 al fallar la obtención de una canción por ID', async () => {
      const querySpy = (jest.spyOn(pool, 'query') as jest.Mock).mockRejectedValueOnce(new Error('Fallo DB'));
      const res = await request(app).get('/api/songs/1').set('Authorization', `Bearer ${tokenMusico}`);
      expect(res.status).toBe(500);
      querySpy.mockRestore();
    });

    it('Debería retornar 404 al intentar actualizar una canción que no existe', async () => {
      const res = await request(app)
        .put('/api/songs/99999')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ title: 'Test', author: 'Test', original_key: 'C', tempo: 100, category: 'Alabanza', content: 'C' });
      expect(res.status).toBe(404);
    });

    it('Debería retornar 500 al fallar la actualización', async () => {
      const connectSpy = (jest.spyOn(pool, 'connect') as jest.Mock).mockRejectedValueOnce(new Error('Fallo DB'));
      const res = await request(app)
        .put('/api/songs/1')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ title: 'Test', author: 'Test', original_key: 'C', tempo: 100, category: 'Alabanza', content: 'C' });
      expect(res.status).toBe(500);
      connectSpy.mockRestore();
    });

    it('Debería retornar 404 al intentar eliminar una canción que no existe', async () => {
      const res = await request(app)
        .delete('/api/songs/99999')
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(404);
    });

    it('Debería retornar 500 al fallar la eliminación', async () => {
      const querySpy = (jest.spyOn(pool, 'query') as jest.Mock).mockRejectedValueOnce(new Error('Fallo DB'));
      const res = await request(app).delete('/api/songs/1').set('Authorization', `Bearer ${tokenAdmin}`);
      expect(res.status).toBe(500);
      querySpy.mockRestore();
    });
  });

  describe('6. Flujo Editorial (Aprobación de Canciones)', () => {
    let pendingSongId: number;

    beforeAll(async () => {
      const result = await pool.query(`
        INSERT INTO songs (title, author, original_key, tempo, category, content, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, ['Cancion Para Revisar', 'Autor', 'C', 100, 'Alabanza', 'C\\nLetra', 'Pendiente', 1]);
      pendingSongId = result.rows[0].id;
    });

    it('Debería denegar la aprobación si no es Admin (403)', async () => {
      const res = await request(app)
        .patch(`/api/songs/${pendingSongId}/status`)
        .set('Authorization', `Bearer ${tokenMusico}`)
        .send({ status: 'Aprobado' });

      expect(res.status).toBe(403);
    });

    it('Debería retornar 400 si el estado enviado es inválido', async () => {
      const res = await request(app)
        .patch(`/api/songs/${pendingSongId}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'Invalido' });

      expect(res.status).toBe(400);
    });

    it('Debería permitir al Admin aprobar una canción (200)', async () => {
      const res = await request(app)
        .patch(`/api/songs/${pendingSongId}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'Aprobado' });

      expect(res.status).toBe(200);
      expect(res.body.song).toHaveProperty('status', 'Aprobado');
    });
  });

  describe('7. Trazabilidad y Auditoría (Sprint 2)', () => {
    it('Debería retornar el historial de cambios de una canción existente (200)', async () => {
      const songsRes = await request(app)
        .get('/api/songs')
        .set('Authorization', `Bearer ${tokenMusico}`);
      
      const songId = songsRes.body.songs[0].id;

      const res = await request(app)
        .get(`/api/songs/${songId}/history`)
        .set('Authorization', `Bearer ${tokenMusico}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('history');
      expect(Array.isArray(res.body.history)).toBe(true);
    });
  });
});