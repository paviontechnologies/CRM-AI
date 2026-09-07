import { Hono } from 'hono';
import { getNotes, createNote, updateNote, deleteNote } from '../controllers/notes.controller';
import { authenticate } from '../middleware/auth.middleware';
import type { AppBindings } from '../types';

const router = new Hono<AppBindings>();

router.use('*', authenticate);
router.get('/', getNotes);
router.post('/', createNote);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);

export default router;
