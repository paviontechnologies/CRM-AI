import { Router } from 'express';
import {
  getSubscription,
  getPlans,
  createCheckoutSession,
  handleWebhook,
  getUsage
} from '../controllers/billing.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/plans', getPlans);
router.post('/webhook', handleWebhook as any);
router.use(authenticate);
router.get('/subscription', getSubscription);
router.post('/checkout', createCheckoutSession);
router.get('/usage', getUsage);

export default router;
