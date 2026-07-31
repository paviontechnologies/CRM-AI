import { Router } from 'express';
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
} from '../controllers/leads.controller';
import { authenticate } from '../middleware/auth.middleware';
import { aiLimiter } from '../middleware/rateLimit.middleware';
import { enforceLimit, enforceDynamicLimit } from '../middleware/planLimit.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getLeads);
router.post(
  '/import',
  enforceDynamicLimit('lead', (req) => (Array.isArray(req.body?.leads) ? req.body.leads.length : 1)),
  importLeads
);
router.post(
  '/generate',
  aiLimiter,
  enforceDynamicLimit('lead', (req) => Number(req.body?.count) || 10),
  enforceLimit('ai'),
  generateLeadsAI
);   // AI lead generator
router.post('/outreach/preview', aiLimiter, enforceLimit('ai'), previewOutreach); // draft without saving a lead
router.get('/:id', getLead);
router.post('/', enforceLimit('lead'), createLead);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);
router.patch('/:id/status', updateLeadStatus);
router.post('/:id/score', aiLimiter, enforceLimit('ai'), scoreLeadAI);
router.post('/:id/outreach', aiLimiter, enforceLimit('ai'), generateOutreach);

export default router;
