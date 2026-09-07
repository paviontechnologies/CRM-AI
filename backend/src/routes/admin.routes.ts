import { Hono } from 'hono';
import {
  getAllOrgs,
  getAllUsers,
  getSystemStats,
  getNicheTemplates,
  createNicheTemplate,
  updateNicheTemplate,
  deleteNicheTemplate,
  toggleFeature
} from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import type { AppBindings } from '../types';

const router = new Hono<AppBindings>();

router.use('*', authenticate, requireRole(['SUPERADMIN']));
router.get('/orgs', getAllOrgs);
router.get('/users', getAllUsers);
router.get('/stats', getSystemStats);
router.get('/templates', getNicheTemplates);
router.post('/templates', createNicheTemplate);
router.put('/templates/:id', updateNicheTemplate);
router.delete('/templates/:id', deleteNicheTemplate);
router.post('/features', toggleFeature);

export default router;
