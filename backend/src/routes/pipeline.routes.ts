import { Router } from 'express';
import {
  getPipelines,
  createPipeline,
  moveLead,
  getPipelineLeads
} from '../controllers/pipeline.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getPipelines);
router.post('/', createPipeline);
router.get('/:id/leads', getPipelineLeads);
router.post('/move', moveLead);

export default router;
