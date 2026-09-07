import { Hono } from 'hono';
import {
  getSubscription,
  getPlans,
  createCheckoutSession,
  getUsage
} from '../controllers/billing.controller';
import { authenticate } from '../middleware/auth.middleware';
import type { AppBindings } from '../types';

const router = new Hono<AppBindings>();

// Public route must be declared before the authenticate middleware below.
router.get('/plans', getPlans);

router.use('*', authenticate);
router.get('/subscription', getSubscription);
router.post('/checkout', createCheckoutSession);
router.get('/usage', getUsage);

export default router;
