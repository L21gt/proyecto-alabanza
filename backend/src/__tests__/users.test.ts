import request from 'supertest';
import app from '../app';
import pool from '../config/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

let adminToken: string;
let normalToken: string;
let pendingUserId1: number;
let pendingUserId2: number;

const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto_desarrollo';

beforeAll(async () => {
  // Limpieza inicial por si quedaron datos colgados
  await pool.query("DELETE FROM users WHERE email LIKE '%@userstest.com'");

  const hash = await bcrypt.hash('password123', 10);

  // 1. Creamos un Administrador
  const adminRes = await pool.query(
    `INSERT INTO users (email, password_hash, name, birth_date, role, status) 
     VALUES ('admin@userstest.com', $1, 'Admin Users', '1980-01-01', 'Admin', 'Aprobado') RETURNING id`,
    [hash]
  );
  adminToken = jwt.sign({ id: adminRes.rows[0].id, email: 'admin@userstest.com', role: 'Admin' }, JWT_SECRET, { expiresIn: '1h' });

  // 2. Creamos un Usuario normal (Para probar que NO pueda acceder al Dashboard)
  const normalRes = await pool.query(
    `INSERT INTO users (email, password_hash, name, birth_date, role, status) 
     VALUES ('normal@userstest.com', $1, 'Normal User', '1990-01-01', 'Usuario', 'Aprobado') RETURNING id`,
    [hash]
  );
  normalToken = jwt.sign({ id: normalRes.rows[0].id, email: 'normal@userstest.com', role: 'Usuario' }, JWT_SECRET, { expiresIn: '1h' });

  // 3. Creamos Usuarios en estado 'Pendiente'
  const p1 = await pool.query(
    `INSERT INTO users (email, password_hash, name, birth_date, role, status) 
     VALUES ('pending1@userstest.com', $1, 'Pending 1', '2000-01-01', 'Usuario', 'Pendiente') RETURNING id`,
    [hash]
  );
  pendingUserId1 = p1.rows[0].id;

  const p2 = await pool.query(
    `INSERT INTO users (email, password_hash, name, birth_date, role, status) 
     VALUES ('pending2@userstest.com', $1, 'Pending 2', '2000-01-01', 'Usuario', 'Pendiente') RETURNING id`,
    [hash]
  );
  pendingUserId2 = p2.rows[0].id;
});

afterAll(async () => {
  // Limpieza final de los datos de prueba
  await pool.query("DELETE FROM users WHERE email LIKE '%@userstest.com'");
});

describe('Módulo de Usuarios (Dashboard Admin)', () => {
  
  describe('GET /api/users/pending', () => {
    it('Debería denegar acceso si el usuario no es Admin (403)', async () => {
      const res = await request(app)
        .get('/api/users/pending')
        .set('Authorization', `Bearer ${normalToken}`);
      
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'Acceso denegado. Se requieren permisos de Administrador.');
    });

    it('Debería retornar la lista de usuarios pendientes al Admin (200)', async () => {
      const res = await request(app)
        .get('/api/users/pending')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('Debería retornar 500 en caso de error de base de datos al listar pendientes', async () => {
      const querySpy = (jest.spyOn(pool, 'query') as jest.Mock).mockRejectedValueOnce(new Error('Fallo simulado DB'));
      const res = await request(app)
        .get('/api/users/pending')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(500);
      querySpy.mockRestore();
    });
  });

  describe('PATCH /api/users/:id/status', () => {
    it('Debería denegar acceso si el usuario no es Admin (403)', async () => {
      const res = await request(app)
        .patch(`/api/users/${pendingUserId1}/status`)
        .set('Authorization', `Bearer ${normalToken}`)
        .send({ status: 'Aprobado' });
      
      expect(res.status).toBe(403);
    });

    it('Debería retornar 400 si el estado enviado es inválido', async () => {
      const res = await request(app)
        .patch(`/api/users/${pendingUserId1}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SuperAdmin' }); // Estado que no existe en el ENUM
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('Debería aprobar a un usuario pendiente (200)', async () => {
      const res = await request(app)
        .patch(`/api/users/${pendingUserId1}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Aprobado' });
      
      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('status', 'Aprobado');
    });

    it('Debería rechazar a un usuario pendiente (200)', async () => {
      const res = await request(app)
        .patch(`/api/users/${pendingUserId2}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Rechazado' });
      
      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('status', 'Rechazado');
    });

    it('Debería retornar 404 si el usuario no existe', async () => {
      const res = await request(app)
        .patch(`/api/users/999999/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Aprobado' });
      
      expect(res.status).toBe(404);
    });

    it('Debería retornar 500 en caso de error de base de datos al actualizar', async () => {
      const querySpy = (jest.spyOn(pool, 'query') as jest.Mock).mockRejectedValueOnce(new Error('Fallo simulado DB'));
      const res = await request(app)
        .patch(`/api/users/${pendingUserId1}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Aprobado' });
      
      expect(res.status).toBe(500);
      querySpy.mockRestore();
    });
  });

});