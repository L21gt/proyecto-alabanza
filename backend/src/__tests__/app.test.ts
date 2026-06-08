import request from 'supertest';
import app from '../app';

describe('App Health Check', () => {
  it('Debería responder con un status 200 y un mensaje de ok en /api/health', async () => {
    const response = await request(app).get('/api/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('message', 'API funcionando correctamente');
  });
});