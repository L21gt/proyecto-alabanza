import { Router } from 'express';
import { 
  createSong, 
  getAllSongs, 
  getSongById, 
  updateSong, 
  deleteSong, 
  updateSongStatus, 
  getPendingSongs,
  getSongAuditHistory,
  getDeletedSongs,
  restoreSong
} from '../controllers/songs.controller';
import { verifyToken, verifyAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Catálogo público
router.get('/', verifyToken, getAllSongs);

// Rutas de administración especializadas (Deben ir ANTES de /:id)
router.get('/pending', verifyToken, verifyAdmin, getPendingSongs);
router.get('/deleted', verifyToken, verifyAdmin, getDeletedSongs); // <-- NUEVA

// Operaciones por ID específico
router.get('/:id', verifyToken, getSongById);
router.get('/:id/history', verifyToken, verifyAdmin, getSongAuditHistory);
router.post('/', verifyToken, createSong);
router.put('/:id', verifyToken, updateSong);
router.delete('/:id', verifyToken, deleteSong);
router.patch('/:id/status', verifyToken, verifyAdmin, updateSongStatus);
router.patch('/:id/restore', verifyToken, verifyAdmin, restoreSong); // <-- NUEVA

export default router;