import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import songsRoutes from './routes/songs.routes';
import setlistsRoutes from './routes/setlists.routes';
import userRoutes from './routes/users.routes';


const app: Application = express();

app.use(cors());
app.use(express.json());

// Middleware para registrar las peticiones entrantes
app.use((req, res, next) => {
  console.log(`📡 Recibiendo petición: [${req.method}] ${req.url}`);
  next();
});

// Endpoint de prueba (Health Check)
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'API funcionando correctamente' });
});

// Importar nuestras nuevas rutas de autenticación
app.use('/api/auth', authRoutes);
app.use('/api/songs', songsRoutes);
app.use('/api/setlists', setlistsRoutes);
app.use('/api/users', userRoutes);

export default app;