import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';

const router = Router();

// Definimos que cuando hagan POST a /register, se ejecute nuestro controlador
router.post('/register', register);
router.post('/login', login);

export default router;