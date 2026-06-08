import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';

// Guardia 1: Verifica que exista un token válido
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Acceso denegado. Token no proporcionado o inválido.' });
      return;
    }

    // Extraemos el token quitando la palabra "Bearer "
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'secret_de_respaldo';

    // Desencriptamos el token y guardamos los datos del usuario en la petición
    const decoded = jwt.verify(token, secret) as { id: number; role: string; status: string };
    req.user = decoded;
    
    // Todo está en orden, dejamos pasar a la siguiente función
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

// Guardia 2: Verifica que el usuario sea Admin (Debe usarse DESPUÉS de verifyToken)
export const verifyAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'Admin') {
    res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de Administrador.' });
    return;
  }
  next();
};