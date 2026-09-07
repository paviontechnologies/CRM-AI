import { Hono } from 'hono';
import {
  getDeals,
  createDeal,
  updateDeal,
  moveDeal,
  updateDealStatus,
  deleteDeal
} from '../controllers/deals.controller';
import { authenticate } from '../middleware/auth.middleware';
import type { AppBindings } from '../types';

const router = new Hono<AppBindings>();

router.use('*', authenticate);
router.get('/', getDeals);
router.post('/', createDeal);
router.put('/:id', updateDeal);
router.patch('/:id/move', moveDeal);
router.patch('/:id/status', updateDealStatus);
router.delete('/:id', deleteDeal);

export default router;
