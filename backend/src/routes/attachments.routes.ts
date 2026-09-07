import { Hono } from 'hono';
import {
  getAttachments,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment
} from '../controllers/attachments.controller';
import { authenticate } from '../middleware/auth.middleware';
import type { AppBindings } from '../types';

const router = new Hono<AppBindings>();

router.use('*', authenticate);
router.get('/', getAttachments);
router.post('/', uploadAttachment);
router.get('/:id/download', downloadAttachment);
router.delete('/:id', deleteAttachment);

export default router;
