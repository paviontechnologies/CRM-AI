import { Router } from 'express';
import {
  getTeam,
  inviteMember,
  acceptInvite,
  updateMemberRole,
  removeMember
} from '../controllers/team.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.post('/accept/:token', acceptInvite);
router.use(authenticate);
router.get('/', getTeam);
router.post('/invite', requireRole(['ADMIN', 'SUPERADMIN']), inviteMember);
router.patch('/:memberId/role', requireRole(['ADMIN', 'SUPERADMIN']), updateMemberRole);
router.delete('/:memberId', requireRole(['ADMIN', 'SUPERADMIN']), removeMember);

export default router;
