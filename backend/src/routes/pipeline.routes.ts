import { Router } from 'express';
import { getPipelines, createPipeline, getBoard } from '../controllers/pipeline.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getPipelines);
router.post('/', createPipeline);
router.get('/:id/board', getBoard);

export default router;
