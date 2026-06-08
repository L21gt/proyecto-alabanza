import { Router } from 'express';
import { verifyToken, verifyAdmin } from '../middlewares/auth.middleware';
import { createSong, getAllSongs, getSongById, updateSong, deleteSong } from '../controllers/songs.controller';

const router = Router();

// Rutas de Lectura (Músicos y Admin)
router.get('/', verifyToken, getAllSongs);
router.get('/:id', verifyToken, getSongById);

// Rutas de Escritura y Eliminación (SOLO Admin)
router.post('/', verifyToken, verifyAdmin, createSong);
router.put('/:id', verifyToken, verifyAdmin, updateSong);
router.delete('/:id', verifyToken, verifyAdmin, deleteSong);

export default router;