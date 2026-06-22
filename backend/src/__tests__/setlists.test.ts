import request from 'supertest';
import app from '../app';
import pool from '../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

describe('Módulo de Repertorios (Setlists)', () => {
  let adminToken: string;
  let musico1Token: string;
  let musico2Token: string;
  
  let adminId: number;
  let musico1Id: number;
  let musico2Id: number;
  
  let testSong1Id: number;
  let testSong2Id: number;
  let musico1SetlistId: number;

  const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_desarrollo';

  beforeAll(async () => {
    // Database cleanup prior to test execution to prevent constraints collision
    await pool.query('DELETE FROM setlist_songs');
    await pool.query('DELETE FROM setlists');
    await pool.query("DELETE FROM users WHERE email LIKE '%@setlist-test.com'");
    await pool.query("DELETE FROM songs WHERE title LIKE 'Cancion Setlist%'");

    // Mock Users Generation (Admin, Usuario 1, Usuario 2)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('password123', saltRounds);

    const insertUserQuery = `
      INSERT INTO users (email, password_hash, name, birth_date, role, status) 
      VALUES ($1, $2, $3, $4, $5, 'Aprobado') RETURNING id
    `;

    const adminRes = await pool.query(insertUserQuery, ['admin@setlist-test.com', passwordHash, 'Admin Test', '1980-01-01', 'Admin']);
    adminId = adminRes.rows[0].id;
    adminToken = jwt.sign({ id: adminId, email: 'admin@setlist-test.com', role: 'Admin' }, JWT_SECRET, { expiresIn: '1h' });

    const m1Res = await pool.query(insertUserQuery, ['m1@setlist-test.com', passwordHash, 'Usuario Uno', '1995-05-05', 'Usuario']);
    musico1Id = m1Res.rows[0].id;
    musico1Token = jwt.sign({ id: musico1Id, email: 'm1@setlist-test.com', role: 'Usuario' }, JWT_SECRET, { expiresIn: '1h' });

    const m2Res = await pool.query(insertUserQuery, ['m2@setlist-test.com', passwordHash, 'Usuario Dos', '1998-08-08', 'Usuario']);
    musico2Id = m2Res.rows[0].id;
    musico2Token = jwt.sign({ id: musico2Id, email: 'm2@setlist-test.com', role: 'Usuario' }, JWT_SECRET, { expiresIn: '1h' });

    // Mock Songs Generation
    const insertSongQuery = `
      INSERT INTO songs (title, author, original_key, tempo, category, content)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `;
    const song1Res = await pool.query(insertSongQuery, ['Cancion Setlist A', 'Autor A', 'C', 120, 'Alabanza', 'Letra A']);
    testSong1Id = song1Res.rows[0].id;
    
    const song2Res = await pool.query(insertSongQuery, ['Cancion Setlist B', 'Autor B', 'G', 80, 'Adoracion', 'Letra B']);
    testSong2Id = song2Res.rows[0].id;
  });

  afterAll(async () => {
    // Teardown logic: Cleanup test artifacts to prevent DB constraints collision
    await pool.query('DELETE FROM setlist_songs');
    await pool.query('DELETE FROM setlists');
    await pool.query("DELETE FROM users WHERE email LIKE '%@setlist-test.com'");
    await pool.query("DELETE FROM songs WHERE title LIKE 'Cancion Setlist%'");
    
    // Termina la instancia del pool de conexiones asignada a esta suite de pruebas
    await pool.end();
  });

  describe('1. Creación de Repertorios (POST /api/setlists)', () => {
    it('Debería denegar el acceso sin token (401)', async () => {
      const res = await request(app).post('/api/setlists').send({ name: 'Domingo AM' });
      expect(res.status).toBe(401);
    });

    it('Debería retornar 400 si falta el nombre del repertorio', async () => {
      const res = await request(app)
        .post('/api/setlists')
        .set('Authorization', `Bearer ${musico1Token}`)
        .send({ event_date: '2026-10-10' });
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('Debería permitir a un Músico crear un repertorio (201)', async () => {
      const res = await request(app)
        .post('/api/setlists')
        .set('Authorization', `Bearer ${musico1Token}`)
        .send({ name: 'Ensayo Músico 1', event_date: '2026-10-10' });
      
      expect(res.status).toBe(201);
      expect(res.body.setlist).toHaveProperty('id');
      expect(res.body.setlist).toHaveProperty('name', 'Ensayo Músico 1');
      expect(res.body.setlist).toHaveProperty('user_id', musico1Id);
      
      musico1SetlistId = res.body.setlist.id;
    });
  });

  describe('2. Lectura de Repertorios (GET /api/setlists)', () => {
    it('Debería listar todos los repertorios (200)', async () => {
      const res = await request(app)
        .get('/api/setlists')
        .set('Authorization', `Bearer ${musico2Token}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('Debería retornar los detalles de un repertorio específico (200)', async () => {
      const res = await request(app)
        .get(`/api/setlists/${musico1SetlistId}`)
        .set('Authorization', `Bearer ${musico1Token}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', musico1SetlistId);
      expect(res.body).toHaveProperty('songs'); // Expected to be an array, even if empty
      expect(Array.isArray(res.body.songs)).toBeTruthy();
    });

    it('Debería retornar 404 si el repertorio no existe', async () => {
      const res = await request(app)
        .get('/api/setlists/999999')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(404);
    });

    it('Debería retornar 500 si ocurre un error interno al listar los repertorios', async () => {
      const querySpy = (jest.spyOn(pool, 'query') as jest.Mock).mockRejectedValueOnce(new Error('Fallo simulado en BD al leer repertorios'));
      
      const res = await request(app)
        .get('/api/setlists')
        .set('Authorization', `Bearer ${musico1Token}`);
      
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
      
      querySpy.mockRestore();
    });
  });

  describe('3. Modificación de Repertorios (POST /api/setlists/:id/songs)', () => {
    it('Debería denegar agregar canción si el usuario no es Admin ni Creador (403)', async () => {
      const res = await request(app)
        .post(`/api/setlists/${musico1SetlistId}/songs`)
        .set('Authorization', `Bearer ${musico2Token}`)
        .send({ song_id: testSong1Id, transposed_key: 'D', sort_order: 1 });
      
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });

    it('Debería permitir al creador agregar una canción al repertorio (201)', async () => {
      const res = await request(app)
        .post(`/api/setlists/${musico1SetlistId}/songs`)
        .set('Authorization', `Bearer ${musico1Token}`)
        .send({ song_id: testSong1Id, transposed_key: 'D', sort_order: 1 });
      
      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Canción agregada al repertorio');
    });

    it('Debería permitir al Admin agregar una canción al repertorio de otro usuario (201)', async () => {
      const res = await request(app)
        .post(`/api/setlists/${musico1SetlistId}/songs`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ song_id: testSong2Id, transposed_key: 'A', sort_order: 2 });
      
      expect(res.status).toBe(201);
    });
  });

  describe('4. Eliminación en Repertorios (DELETE)', () => {
    it('Debería denegar quitar canción si el usuario no es Admin ni Creador (403)', async () => {
      const res = await request(app)
        .delete(`/api/setlists/${musico1SetlistId}/songs/${testSong1Id}`)
        .set('Authorization', `Bearer ${musico2Token}`);
      
      expect(res.status).toBe(403);
    });

    it('Debería permitir al creador quitar una canción (200)', async () => {
      const res = await request(app)
        .delete(`/api/setlists/${musico1SetlistId}/songs/${testSong1Id}`)
        .set('Authorization', `Bearer ${musico1Token}`);
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Canción removida del repertorio');
    });

    it('Debería denegar eliminar el repertorio completo si no es Admin ni Creador (403)', async () => {
      const res = await request(app)
        .delete(`/api/setlists/${musico1SetlistId}`)
        .set('Authorization', `Bearer ${musico2Token}`);
      
      expect(res.status).toBe(403);
    });

    it('Debería permitir al Admin eliminar un repertorio de otro usuario (200)', async () => {
      const res = await request(app)
        .delete(`/api/setlists/${musico1SetlistId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Repertorio eliminado exitosamente');
    });
  });
});