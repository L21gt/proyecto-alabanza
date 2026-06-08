import { Request } from 'express';

// Extendemos la interfaz Request de Express para que acepte nuestra propiedad 'user'
export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
    status: string;
  };
}