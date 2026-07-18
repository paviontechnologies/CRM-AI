import { Router } from 'express';
import {
  getDeals,
  createDeal,
  updateDeal,
  moveDeal,
  updateDealStatus,
  deleteDeal
} from '../controllers/deals.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getDeals);
router.post('/', createDeal);
router.put('/:id', updateDeal);
router.patch('/:id/move', moveDeal);
router.patch('/:id/status', updateDealStatus);
router.delete('/:id', deleteDeal);

export default router;
