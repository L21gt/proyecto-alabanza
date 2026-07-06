import { Router } from 'express';
import {
  createSetlist,
  getSetlists,
  getSetlistById,
  addSongToSetlist,
  removeSongFromSetlist,
  deleteSetlist,
  reorderSetlistSongs // <-- NUEVA IMPORTACIÓN
} from '../controllers/setlists.controller';

import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(verifyToken);

router.post('/', createSetlist);
router.get('/', getSetlists);
router.get('/:id', getSetlistById);
router.post('/:id/songs', addSongToSetlist);
router.delete('/:id/songs/:songId', removeSongFromSetlist);
router.put('/:id/songs/order', reorderSetlistSongs); // <-- NUEVA RUTA DE REORDEN MASIVO

export default router;