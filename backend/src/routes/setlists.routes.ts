import { Router } from 'express';
import {
  createSetlist,
  getSetlists,
  getSetlistById,
  addSongToSetlist,
  removeSongFromSetlist,
  deleteSetlist
} from '../controllers/setlists.controller';

// CORRECCIÓN: Importamos 'verifyToken' exactamente como está exportado en auth.middleware.ts
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

// Endpoint protection: All setlist routes require a valid JWT
router.use(verifyToken);

router.post('/', createSetlist);
router.get('/', getSetlists);
router.get('/:id', getSetlistById);
router.post('/:id/songs', addSongToSetlist);
router.delete('/:id/songs/:songId', removeSongFromSetlist);
router.delete('/:id', deleteSetlist);

export default router;