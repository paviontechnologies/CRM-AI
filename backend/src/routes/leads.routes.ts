import { Hono } from 'hono';
import {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  importLeads,
  updateLeadStatus,
  scoreLeadAI,
  generateOutreach,
  generateLeadsAI,
  previewOutreach,
  approveSuggestions,
} from '../controllers/leads.controller';
import { logReply } from '../controllers/replies.controller';
import { authenticate } from '../middleware/auth.middleware';
import { aiLimiter } from '../middleware/rateLimit.middleware';
import { enforceLimit, enforceDynamicLimit } from '../middleware/planLimit.middleware';
import type { AppBindings } from '../types';

const router = new Hono<AppBindings>();

router.use('*', authenticate);
router.get('/', getLeads);
router.post(
  '/import',
  enforceDynamicLimit('lead', (body) => (Array.isArray(body?.leads) ? body.leads.length : 1)),
  importLeads
);
// Suggestions cost an AI credit but no lead credits — nothing is saved yet.
router.post('/generate', aiLimiter, enforceLimit('ai'), generateLeadsAI);
// Lead credits are charged here, where rows are actually created.
router.post(
  '/suggestions/approve',
  enforceDynamicLimit('lead', (body) => (Array.isArray(body?.leads) ? body.leads.length : 1)),
  approveSuggestions
);
router.post('/outreach/preview', aiLimiter, enforceLimit('ai'), previewOutreach); // draft without saving a lead
router.get('/:id', getLead);
router.post('/', enforceLimit('lead'), createLead);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);
router.patch('/:id/status', updateLeadStatus);
router.post('/:id/score', aiLimiter, enforceLimit('ai'), scoreLeadAI);
router.post('/:id/outreach', aiLimiter, enforceLimit('ai'), generateOutreach);
router.post('/:id/reply', logReply); // log a reply received outside the system

export default router;
