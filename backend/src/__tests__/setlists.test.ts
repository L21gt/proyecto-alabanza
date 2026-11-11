import request from 'supertest';
import app from '../app';
import pool from '../config/database';

// 1. Inyectamos los Mocks del Pool
jest.mock('../config/database');
const mockedPool = pool as jest.Mocked<typeof pool>;

// 2. Inyectamos el Mock de Auth COMPLETO (Incluyendo verifyAdmin)
jest.mock('../middlewares/auth.middleware', () => ({
  verifyToken: (req: any, res: any, next: any) => {
    if (req.headers.authorization === 'Bearer TEST_TOKEN_ADMIN') {
      req.user = { id: 1, role: 'Admin' };
    } else if (req.headers.authorization === 'Bearer TEST_TOKEN_OWNER') {
      req.user = { id: 2, role: 'Musician' };
    } else if (req.headers.authorization === 'Bearer TEST_TOKEN_OTHER') {
      req.user = { id: 3, role: 'Musician' };
    } else {
      return res.status(401).json({ error: 'Token no válido' });
    }
    next();
  },
  // Faltaba simular esta función para que las rutas de canciones no exploten al cargar app.ts
  verifyAdmin: (req: any, res: any, next: any) => {
    if (req.user && req.user.role === 'Admin') {
      next();
    } else {
      return res.status(403).json({ error: 'Requiere rol de Administrador' });
    }
  }
}));

describe('Setlists Controller', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSetlist', () => {
    it('Debe devolver 400 si falta el nombre', async () => {
      const response = await request(app)
        .post('/api/setlists')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN')
        .send({});
      expect(response.status).toBe(400);
    });

    it('Debe crear un repertorio exitosamente como Borrador', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test Setlist', status: 'Borrador' }] } as never);
      const response = await request(app)
        .post('/api/setlists')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN')
        .send({ name: 'Test Setlist' });
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Repertorio creado exitosamente');
    });

    it('Debe capturar errores de base de datos en createSetlist', async () => {
      mockedPool.query.mockRejectedValueOnce(new Error('Fallo DB') as never);
      const response = await request(app)
        .post('/api/setlists')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN')
        .send({ name: 'Test Setlist' });
      expect(response.status).toBe(500);
    });
  });

  describe('getSetlists', () => {
    it('Debe retornar la lista de repertorios', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test Setlist' }] } as never);
      const response = await request(app)
        .get('/api/setlists')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('Debe manejar error en getSetlists', async () => {
      mockedPool.query.mockRejectedValueOnce(new Error('Fallo DB') as never);
      const response = await request(app)
        .get('/api/setlists')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN');
      expect(response.status).toBe(500);
    });
  });

  describe('getSetlistById', () => {
    it('Debe retornar 404 si el repertorio no existe', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never);
      const response = await request(app)
        .get('/api/setlists/1')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN');
      expect(response.status).toBe(404);
    });

    it('Debe retornar 403 si el repertorio es Borrador y lo intenta ver otro usuario', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ id: 1, user_id: 2, status: 'Borrador' }] } as never);
      const response = await request(app)
        .get('/api/setlists/1')
        .set('Authorization', 'Bearer TEST_TOKEN_OTHER'); 
      expect(response.status).toBe(403);
    });

    it('Debe retornar 200 si es Borrador y lo ve el dueño', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ id: 1, user_id: 2, status: 'Borrador' }] } as never); 
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never); 
      const response = await request(app)
        .get('/api/setlists/1')
        .set('Authorization', 'Bearer TEST_TOKEN_OWNER'); 
      expect(response.status).toBe(200);
    });

    it('Debe manejar errores de DB en getSetlistById', async () => {
      mockedPool.query.mockRejectedValueOnce(new Error('Fallo DB') as never);
      const response = await request(app)
        .get('/api/setlists/1')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN');
      expect(response.status).toBe(500);
    });
  });

  describe('addSongToSetlist', () => {
    it('Debe retornar 400 si no se envia song_id', async () => {
      const response = await request(app)
        .post('/api/setlists/1/songs')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN')
        .send({});
      expect(response.status).toBe(400);
    });

    it('Debe retornar 404 si el setlist no existe al agregar', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never);
      const response = await request(app)
        .post('/api/setlists/1/songs')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN')
        .send({ song_id: 1 });
      expect(response.status).toBe(404);
    });

    it('Debe retornar 403 si un extraño intenta agregar canciones', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ user_id: 2 }] } as never);
      const response = await request(app)
        .post('/api/setlists/1/songs')
        .set('Authorization', 'Bearer TEST_TOKEN_OTHER') 
        .send({ song_id: 1 });
      expect(response.status).toBe(403);
    });

    it('Debe permitir a un admin agregar canciones al repertorio de otro', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ user_id: 2 }] } as never); 
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never); 
      const response = await request(app)
        .post('/api/setlists/1/songs')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN') 
        .send({ song_id: 1 });
      expect(response.status).toBe(201);
    });

    it('Debe manejar error interno al agregar canción', async () => {
      mockedPool.query.mockRejectedValueOnce(new Error('Fallo DB') as never);
      const response = await request(app)
        .post('/api/setlists/1/songs')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN')
        .send({ song_id: 1 });
      expect(response.status).toBe(500);
    });
  });

  describe('removeSongFromSetlist', () => {
    it('Debe retornar 404 si el setlist no existe', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never);
      const response = await request(app)
        .delete('/api/setlists/1/songs/1')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN');
      expect(response.status).toBe(404);
    });

    it('Debe retornar 403 si alguien no autorizado intenta borrar', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ user_id: 2 }] } as never);
      const response = await request(app)
        .delete('/api/setlists/1/songs/1')
        .set('Authorization', 'Bearer TEST_TOKEN_OTHER');
      expect(response.status).toBe(403);
    });

    it('Debe permitir al creador borrar la canción', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ user_id: 2 }] } as never);
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never); 
      const response = await request(app)
        .delete('/api/setlists/1/songs/1')
        .set('Authorization', 'Bearer TEST_TOKEN_OWNER');
      expect(response.status).toBe(200);
    });

    it('Debe capturar error DB al remover canción', async () => {
      mockedPool.query.mockRejectedValueOnce(new Error('Fallo DB') as never);
      const response = await request(app)
        .delete('/api/setlists/1/songs/1')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN');
      expect(response.status).toBe(500);
    });
  });

  describe('deleteSetlist', () => {
    it('Debe retornar 404 al borrar setlist inexistente', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never);
      const response = await request(app)
        .delete('/api/setlists/1')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN');
      expect(response.status).toBe(404);
    });

    it('Debe retornar 403 si no es admin ni owner', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ user_id: 2 }] } as never);
      const response = await request(app)
        .delete('/api/setlists/1')
        .set('Authorization', 'Bearer TEST_TOKEN_OTHER');
      expect(response.status).toBe(403);
    });

    it('Debe borrar el setlist exitosamente', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ user_id: 1 }] } as never);
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never);
      const response = await request(app)
        .delete('/api/setlists/1')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN');
      expect(response.status).toBe(200);
    });

    it('Debe atrapar error en deleteSetlist', async () => {
      mockedPool.query.mockRejectedValueOnce(new Error('Fallo DB') as never);
      const response = await request(app)
        .delete('/api/setlists/1')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN');
      expect(response.status).toBe(500);
    });
  });

  describe('updateSetlistTheme', () => {
    it('Debe devolver 404 si el repertorio no existe', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never);
      const response = await request(app)
        .put('/api/setlists/1/theme')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN')
        .send({ theme_id: 1 });
      expect(response.status).toBe(404);
    });

    it('Debe devolver 403 si un usuario intenta cambiar el tema de otro', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ user_id: 2 }] } as never);
      const response = await request(app)
        .put('/api/setlists/1/theme')
        .set('Authorization', 'Bearer TEST_TOKEN_OTHER')
        .send({ theme_id: 1 });
      expect(response.status).toBe(403);
    });

    it('Debe permitir al creador cambiar el tema', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ user_id: 2 }] } as never);
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never);
      const response = await request(app)
        .put('/api/setlists/1/theme')
        .set('Authorization', 'Bearer TEST_TOKEN_OWNER')
        .send({ theme_id: 1 });
      expect(response.status).toBe(200);
    });

    it('Debe manejar errores de DB al actualizar tema', async () => {
      mockedPool.query.mockRejectedValueOnce(new Error('Fallo DB') as never);
      const response = await request(app)
        .put('/api/setlists/1/theme')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN')
        .send({ theme_id: 1 });
      expect(response.status).toBe(500);
    });
  });

  describe('reorderSetlistSongs', () => {
    it('Debe fallar si no envia array de songs', async () => {
      const response = await request(app)
        .put('/api/setlists/1/songs/order')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN')
        .send({ songs: 'invalid' });
      expect(response.status).toBe(400);
    });

    it('Debe regresar 404 si no encuentra el setlist', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never);
      const response = await request(app)
        .put('/api/setlists/1/songs/order')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN')
        .send({ songs: [] });
      expect(response.status).toBe(404);
    });

    it('Debe regresar 403 si se intenta reordenar setlist de otro', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ user_id: 2 }] } as never);
      const response = await request(app)
        .put('/api/setlists/1/songs/order')
        .set('Authorization', 'Bearer TEST_TOKEN_OTHER')
        .send({ songs: [] });
      expect(response.status).toBe(403);
    });

    it('Debe ejecutar la transacción para reordenar', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ user_id: 2 }] } as never);
      
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      mockedPool.connect.mockResolvedValueOnce(mockClient as never);
      
      const response = await request(app)
        .put('/api/setlists/1/songs/order')
        .set('Authorization', 'Bearer TEST_TOKEN_OWNER')
        .send({ songs: [{ song_id: 1, sort_order: 1 }] });
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(response.status).toBe(200);
    });

    it('Debe hacer ROLLBACK si la transacción falla', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ user_id: 2 }] } as never);
      const mockClient = {
        query: jest.fn().mockImplementation((q) => {
          if (q.includes('UPDATE')) throw new Error('Fallo en update');
          return Promise.resolve();
        }),
        release: jest.fn(),
      };
      mockedPool.connect.mockResolvedValueOnce(mockClient as never);
      
      const response = await request(app)
        .put('/api/setlists/1/songs/order')
        .set('Authorization', 'Bearer TEST_TOKEN_OWNER')
        .send({ songs: [{ song_id: 1, sort_order: 1 }] });
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(response.status).toBe(500);
    });

    it('Debe manejar errores de DB de la validacion inicial en reordenar', async () => {
      mockedPool.query.mockRejectedValueOnce(new Error('Fallo DB inicial') as never);
      const response = await request(app)
        .put('/api/setlists/1/songs/order')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN')
        .send({ songs: [] });
      expect(response.status).toBe(500);
    });
  });

  describe('publishSetlist', () => {
    it('Debe regresar 404 si el setlist no existe al publicar', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never);
      const response = await request(app)
        .patch('/api/setlists/1/publish')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN');
      expect(response.status).toBe(404);
    });

    it('Debe retornar 403 si alguien más intenta publicar', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ user_id: 2, status: 'Borrador' }] } as never);
      const response = await request(app)
        .patch('/api/setlists/1/publish')
        .set('Authorization', 'Bearer TEST_TOKEN_OTHER');
      expect(response.status).toBe(403);
    });

    it('Debe retornar 400 si ya esta publicado', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ user_id: 2, status: 'Publicado' }] } as never);
      const response = await request(app)
        .patch('/api/setlists/1/publish')
        .set('Authorization', 'Bearer TEST_TOKEN_OWNER');
      expect(response.status).toBe(400);
    });

    it('Debe publicar el repertorio correctamente', async () => {
      mockedPool.query.mockResolvedValueOnce({ rows: [{ user_id: 2, status: 'Borrador' }] } as never);
      mockedPool.query.mockResolvedValueOnce({ rows: [] } as never);
      const response = await request(app)
        .patch('/api/setlists/1/publish')
        .set('Authorization', 'Bearer TEST_TOKEN_OWNER');
      expect(response.status).toBe(200);
    });

    it('Debe manejar error interno de la BD al publicar', async () => {
      mockedPool.query.mockRejectedValueOnce(new Error('Fallo DB al publicar') as never);
      const response = await request(app)
        .patch('/api/setlists/1/publish')
        .set('Authorization', 'Bearer TEST_TOKEN_ADMIN');
      expect(response.status).toBe(500);
    });
  });
});