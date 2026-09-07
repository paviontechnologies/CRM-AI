import { Hono } from 'hono';
import { getPipelines, createPipeline, getBoard } from '../controllers/pipeline.controller';
import { authenticate } from '../middleware/auth.middleware';
import type { AppBindings } from '../types';

const router = new Hono<AppBindings>();

router.use('*', authenticate);
router.get('/', getPipelines);
router.post('/', createPipeline);
router.get('/:id/board', getBoard);

export default router;
