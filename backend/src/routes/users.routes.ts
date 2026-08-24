import { Router } from 'express';
import { 
  getPendingUsers, 
  getAllUsers, 
  updateUserStatus, 
  updateUserRole 
} from '../controllers/users.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas de usuarios requieren estar autenticado
router.use(verifyToken);

// Ruta para obtener la lista de espera (aprobaciones pendientes)
router.get('/pending', getPendingUsers);

// Ruta para obtener todos los usuarios registrados (Dashboard)
router.get('/', getAllUsers);

// Ruta para aprobar, rechazar o bloquear (ej. PATCH /api/users/5/status)
router.patch('/:id/status', updateUserStatus);

// Ruta para cambiar permisos/roles (ej. PATCH /api/users/5/role)
router.patch('/:id/role', updateUserRole);

export default router;