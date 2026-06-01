import { Router } from 'express';
import { scoreLead } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/score/:leadId', scoreLead);

export default router;
