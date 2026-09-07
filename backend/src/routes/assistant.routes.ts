import { Hono } from 'hono';
import { chat } from '../controllers/assistant.controller';
import { authenticate } from '../middleware/auth.middleware';
import { aiLimiter } from '../middleware/rateLimit.middleware';
import type { AppBindings } from '../types';

const router = new Hono<AppBindings>();

router.use('*', authenticate);
router.post('/chat', aiLimiter, chat);

export default router;
