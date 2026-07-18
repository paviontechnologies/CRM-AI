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

const router = Router();

router.use(authenticate);
router.get('/', getLeads);
router.post('/import', importLeads);
router.post('/generate', generateLeadsAI);   // AI lead generator
router.post('/outreach/preview', previewOutreach); // draft without saving a lead
router.get('/:id', getLead);
router.post('/', createLead);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);
router.patch('/:id/status', updateLeadStatus);
router.post('/:id/score', scoreLeadAI);
router.post('/:id/outreach', generateOutreach);

export default router;
