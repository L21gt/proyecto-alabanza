import { Router } from 'express';
import {
  createSetlist,
  getSetlists,
  getSetlistById,
  addSongToSetlist,
  removeSongFromSetlist,
  deleteSetlist,
  reorderSetlistSongs
} from '../controllers/setlists.controller';

import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

// Middleware de autenticación global para este enrutador
router.use(verifyToken);

// Rutas de Repertorios
router.post('/', createSetlist);
router.get('/', getSetlists);
router.get('/:id', getSetlistById);
router.delete('/:id', deleteSetlist); // <-- RUTA RESTAURADA

// Rutas de Canciones dentro de un Repertorio
router.post('/:id/songs', addSongToSetlist);
router.delete('/:id/songs/:songId', removeSongFromSetlist);
router.put('/:id/songs/order', reorderSetlistSongs);

export default router;