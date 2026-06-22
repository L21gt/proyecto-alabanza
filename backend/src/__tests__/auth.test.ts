import request from 'supertest';
import app from '../app';
import pool from '../config/database';
import bcrypt from 'bcrypt';

// ==========================================
// CICLO DE VIDA GLOBAL
// ==========================================

beforeAll(async () => {
  // Garantizamos una bóveda 100% limpia antes de empezar CUALQUIER prueba
  await pool.query('TRUNCATE TABLE setlist_songs, setlists, users CASCADE');
});

afterAll(async () => {
  // Limpieza profunda al finalizar para no contaminar a song.test.ts o setlists.test.ts
  await pool.query('TRUNCATE TABLE setlist_songs, setlists, users CASCADE');
  await pool.end();
});

// ==========================================
// MÓDULO 1: REGISTRO (ONBOARDING)
// ==========================================
describe('Módulo de Autenticación', () => {
  
  it('Debería registrar un nuevo usuario y retornar status 201', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@iglesia.com',
        password: 'Password123!',
        name: 'Usuario Prueba',
        birth_date: '1990-01-01',
        phone: '12345678',
        area: 'Musico'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'Usuario registrado exitosamente');
    expect(res.body.user).toHaveProperty('email', 'test@iglesia.com');
    
    // Como hicimos TRUNCATE al inicio, este es el primer usuario, por ende nace Admin y Aprobado
    expect(res.body.user).toHaveProperty('role', 'Admin'); 
    expect(res.body.user).toHaveProperty('status', 'Aprobado'); 
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('Debería retornar status 400 si faltan campos obligatorios', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'incompleto@iglesia.com',
        password: 'Password123!'
        // Faltan name y birth_date intencionalmente
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Email, contraseña, nombre y fecha de nacimiento son obligatorios');
  });

  it('Debería retornar status 409 si el correo ya está registrado', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@iglesia.com', // Ya registrado en la primera prueba
        password: 'Password123!',
        name: 'Clon Prueba',
        birth_date: '1995-01-01'
      });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error', 'El correo ya está registrado');
  });

  it('Debería retornar status 500 si ocurre un error interno en el servidor', async () => {
    const querySpy = (jest.spyOn(pool, 'query') as jest.Mock).mockRejectedValueOnce(new Error('Fallo simulado de base de datos'));

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'error500@iglesia.com',
        password: 'Password123!',
        name: 'Usuario Error',
        birth_date: '2000-01-01'
      });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Error interno del servidor');

    querySpy.mockRestore();
  });
});

// ==========================================
// MÓDULO 2: LOGIN Y SEGURIDAD ZERO TRUST
// ==========================================
describe('Módulo de Login y Seguridad (Zero Trust)', () => {
  
  beforeAll(async () => {
    const hash = await bcrypt.hash('Password123!', 10);
    
    // Inyectamos 3 perfiles distintos para poner a prueba la aduana de seguridad
    await pool.query(
      `INSERT INTO users (email, password_hash, name, birth_date, role, status) 
       VALUES ('login@iglesia.com', $1, 'Admin Login', '1980-01-01', 'Admin', 'Aprobado')`,
      [hash]
    );

    await pool.query(
      `INSERT INTO users (email, password_hash, name, birth_date, role, status) 
       VALUES ('pendiente@iglesia.com', $1, 'Usuario Pendiente', '1990-01-01', 'Usuario', 'Pendiente')`,
      [hash]
    );

    await pool.query(
      `INSERT INTO users (email, password_hash, name, birth_date, role, status) 
       VALUES ('rechazado@iglesia.com', $1, 'Usuario Rechazado', '1990-01-01', 'Usuario', 'Rechazado')`,
      [hash]
    );
  });

  it('Debería iniciar sesión exitosamente y retornar un token si está aprobado', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@iglesia.com',
        password: 'Password123!'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', 'login@iglesia.com');
  });

  it('Debería retornar 403 si el usuario está en estado Pendiente', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'pendiente@iglesia.com',
        password: 'Password123!'
      });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'Tu cuenta está en revisión. Un administrador debe aprobarla para que puedas ingresar.');
  });

  it('Debería retornar 403 si el usuario está en estado Rechazado', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'rechazado@iglesia.com',
        password: 'Password123!'
      });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'Tu acceso a la plataforma ha sido denegado.');
  });

  it('Debería retornar 401 si la contraseña es incorrecta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@iglesia.com',
        password: 'passwordEquivocada'
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Contraseña incorrecta');
  });

  it('Debería retornar 404 si el usuario no existe', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'noexiste@iglesia.com',
        password: 'Password123!'
      });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Usuario no encontrado');
  });

  it('Debería retornar status 500 si ocurre un error interno al iniciar sesión', async () => {
    const querySpy = (jest.spyOn(pool, 'query') as jest.Mock).mockRejectedValueOnce(new Error('Fallo simulado DB en login'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@iglesia.com',
        password: 'Password123!'
      });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Error interno del servidor');

    querySpy.mockRestore();
  });

  it('Debería retornar status 400 si la contraseña no cumple los requisitos de seguridad', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'debil@iglesia.com',
        password: 'clave', // Contraseña débil
        name: 'Usuario Débil',
        birth_date: '2000-01-01',
        phone: '12345678',
        area: 'Musico'
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('La contraseña debe tener al menos 8 caracteres');
  });
});