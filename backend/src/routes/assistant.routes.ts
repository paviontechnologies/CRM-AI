import { Router } from 'express';
import { chat } from '../controllers/assistant.controller';
import { authenticate } from '../middleware/auth.middleware';
import { aiLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

router.use(authenticate);
router.post('/chat', aiLimiter, chat);

export default router;
