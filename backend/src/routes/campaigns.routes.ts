import { Router } from 'express';
import {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  addStep,
  enrollLeads,
  getCampaignAnalytics
} from '../controllers/campaigns.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getCampaigns);
router.get('/:id', getCampaign);
router.post('/', createCampaign);
router.put('/:id', updateCampaign);
router.delete('/:id', deleteCampaign);
router.post('/:id/steps', addStep);
router.post('/:id/enroll', enrollLeads);
router.get('/:id/analytics', getCampaignAnalytics);

export default router;
