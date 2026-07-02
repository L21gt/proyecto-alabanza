import { Router } from 'express';
import { verifyToken, verifyAdmin } from '../middlewares/auth.middleware';
import { createSong, getAllSongs, getSongById, updateSong, deleteSong, updateSongStatus } from '../controllers/songs.controller';

const router = Router();

// Rutas de Lectura (Músicos y Admin)
router.get('/', verifyToken, getAllSongs);
router.get('/:id', verifyToken, getSongById);

// Ruta de Creación (TODOS pueden proponer, el controlador decide si nace 'Pendiente' o 'Aprobada')
router.post('/', verifyToken, createSong);

// Rutas de Edición y Eliminación (SOLO Admin)
router.put('/:id', verifyToken, verifyAdmin, updateSong);
router.delete('/:id', verifyToken, verifyAdmin, deleteSong);

// NUEVA RUTA: Aprobar Canción (SOLO Admin)
router.patch('/:id/status', verifyToken, verifyAdmin, updateSongStatus);

export default router;