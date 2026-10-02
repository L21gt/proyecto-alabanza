import { Router } from 'express';
import { getThemes } from '../controllers/themes.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

// Middleware global (todos deben estar logueados para ver los temas)
router.use(verifyToken);

// Ruta: GET /api/themes
router.get('/', getThemes);

export default router;