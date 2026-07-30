import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes';
import songsRoutes from './routes/songs.routes';
import setlistsRoutes from './routes/setlists.routes';
import userRoutes from './routes/users.routes';

const app: Application = express();

// Confiar en la primera capa del proxy (Necesario para Render/Heroku/Vercel y para express-rate-limit)
app.set('trust proxy', 1);

// 1. Hardening de Cabeceras HTTP: Oculta tecnologías usadas (ej. X-Powered-By) y previene inyecciones XSS
app.use(helmet());

// 2. Configuración Estricta de CORS: Lista blanca de orígenes permitidos
const allowedOrigins = [
  'http://localhost:5173', // Frontend local (Vite)
  'https://proyecto-alabanza.vercel.app', // Dominio de producción
];

app.use(cors({
  origin: (origin, callback) => {
    // Permite peticiones sin origen (como Postman o comunicación server-to-server) o si están en la lista blanca
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por la política de CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

// 3. Rate Limiting General: Prevención de ataques DoS
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // Límite de 300 peticiones por IP cada 15 min
  message: { error: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde.' },
  standardHeaders: true, // Devuelve información en cabeceras `RateLimit-*`
  legacyHeaders: false, // Deshabilita cabeceras `X-RateLimit-*`
});

// 4. Rate Limiting Estricto para Autenticación: Prevención de Fuerza Bruta en contraseñas
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // Solo 20 intentos de peticiones de auth por IP cada 15 min
  message: { error: 'Demasiados intentos de acceso, por favor intenta de nuevo en 15 minutos.' }
});

// Aplicar el limitador general a todas las rutas bajo /api
app.use('/api', generalLimiter);

// Middleware para registrar las peticiones entrantes
app.use((req, res, next) => {
  console.log(`📡 Recibiendo petición: [${req.method}] ${req.url}`);
  next();
});

// Endpoint de prueba (Health Check)
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'API funcionando y protegida correctamente' });
});

// Importar nuestras nuevas rutas de autenticación
app.use('/api/auth', authLimiter, authRoutes); // Inyectamos el limitador estricto ANTES de las rutas de auth
app.use('/api/songs', songsRoutes);
app.use('/api/setlists', setlistsRoutes);
app.use('/api/users', userRoutes);

export default app;