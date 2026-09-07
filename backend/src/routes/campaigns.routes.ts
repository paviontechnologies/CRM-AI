import { Hono } from 'hono';
import {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  addStep,
  enrollLeads,
  getCampaignAnalytics,
  setCampaignStatus,
  trackOpen
} from '../controllers/campaigns.controller';
import { authenticate } from '../middleware/auth.middleware';
import type { AppBindings } from '../types';

const router = new Hono<AppBindings>();

// Public: hit by the recipient's mail client, so it must sit above authenticate.
router.get('/track/:messageId/open.gif', trackOpen);

router.use('*', authenticate);
router.get('/', getCampaigns);
router.get('/:id', getCampaign);
router.post('/', createCampaign);
router.put('/:id', updateCampaign);
router.patch('/:id/status', setCampaignStatus);
router.delete('/:id', deleteCampaign);
router.post('/:id/steps', addStep);
router.post('/:id/enroll', enrollLeads);
router.get('/:id/analytics', getCampaignAnalytics);

export default router;
