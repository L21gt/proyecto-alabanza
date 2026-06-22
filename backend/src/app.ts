import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import songsRoutes from './routes/songs.routes';
import setlistsRoutes from './routes/setlists.routes';

const app: Application = express();

app.use(cors());
app.use(express.json());

// Endpoint de prueba (Health Check)
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'API funcionando correctamente' });
});

// Importar nuestras nuevas rutas de autenticación
app.use('/api/auth', authRoutes);
app.use('/api/songs', songsRoutes);
app.use('/api/setlists', setlistsRoutes);
export default app;