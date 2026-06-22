import { Router } from 'express';
import { getPendingUsers, updateUserStatus } from '../controllers/users.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas de usuarios requieren estar autenticado
router.use(verifyToken);

// Ruta para obtener la lista de espera
router.get('/pending', getPendingUsers);

// Ruta para aprobar o rechazar (ej. PATCH /api/users/5/status)
router.patch('/:id/status', updateUserStatus);

export default router;