import { Hono } from 'hono';
import {
  getDashboardStats,
  getLeadsBySource,
  getLeadsByStatus,
  getLeadsByIndustry,
  getCampaignPerformance,
  getActivityTimeline,
  getWeeklyLeads
} from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';
import type { AppBindings } from '../types';

const router = new Hono<AppBindings>();

router.use('*', authenticate);
router.get('/dashboard', getDashboardStats);
router.get('/leads/source', getLeadsBySource);
router.get('/leads/status', getLeadsByStatus);
router.get('/leads/industry', getLeadsByIndustry);
router.get('/leads/weekly', getWeeklyLeads);
router.get('/campaigns', getCampaignPerformance);
router.get('/activities', getActivityTimeline);

export default router;
