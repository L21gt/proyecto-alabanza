import request from 'supertest';
import app from '../app';
import pool from '../config/database';

// Limpiamos la base de datos al terminar todas las pruebas
afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email = 'test@iglesia.com'");
  await pool.end();
});

describe('Módulo de Autenticación', () => {
  
  it('Debería registrar un nuevo usuario y retornar status 201', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@iglesia.com',
        password: 'password123'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'Usuario registrado exitosamente');
    expect(res.body.user).toHaveProperty('email', 'test@iglesia.com');
    expect(res.body.user).toHaveProperty('role', 'Musico');
    expect(res.body.user).toHaveProperty('status', 'Pendiente');
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  // Cubre las líneas 11-12 (Datos incompletos)
  it('Debería retornar status 400 si falta el email o password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@iglesia.com' // Omitimos el password intencionalmente
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Email y password son requeridos');
  });

  // Cubre las líneas 38-43 (Correo duplicado)
  it('Debería retornar status 409 si el correo ya está registrado', async () => {
    // Intentamos registrar el MISMO correo de la primera prueba
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@iglesia.com',
        password: 'nuevapassword'
      });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error', 'El correo electrónico ya está registrado');
  });

  // Cubre las líneas 42-43 (Error interno 500)
  it('Debería retornar status 500 si ocurre un error interno en el servidor', async () => {
    // 1. Espiamos el método 'query' del pool y forzamos a que falle esta única vez
    const querySpy = (jest.spyOn(pool, 'query') as jest.Mock).mockRejectedValueOnce(new Error('Fallo simulado de base de datos'));

    // 2. Hacemos la petición
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'error500@iglesia.com',
        password: 'password123'
      });

    // 3. Validamos que el controlador atrapó el error y respondió con 500
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Error interno del servidor');

    // 4. Restauramos el comportamiento normal de la base de datos para futuras pruebas
    querySpy.mockRestore();
  });

});

describe('Módulo de Login', () => {
  // Antes de probar el login, necesitamos asegurar que el usuario existe
  beforeAll(async () => {
    // Hasheamos una contraseña para inyectar un usuario de prueba directamente en la BD
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('password123', 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, role, status) 
       VALUES ('login@iglesia.com', $1, 'Admin', 'Aprobado')`,
      [hash]
    );
  });

  afterAll(async () => {
    await pool.query("DELETE FROM users WHERE email = 'login@iglesia.com'");
  });

  it('Debería iniciar sesión exitosamente y retornar un token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@iglesia.com',
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', 'login@iglesia.com');
  });

  it('Debería retornar 401 si la contraseña es incorrecta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@iglesia.com',
        password: 'passwordEquivocada'
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Credenciales inválidas');
  });

  it('Debería retornar 404 si el usuario no existe', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'noexiste@iglesia.com',
        password: 'password123'
      });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Usuario no encontrado');
  });
});