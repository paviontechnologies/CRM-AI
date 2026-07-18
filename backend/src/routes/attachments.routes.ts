import { Router } from 'express';
import {
  upload,
  getAttachments,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment
} from '../controllers/attachments.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getAttachments);
router.post('/', upload.single('file'), uploadAttachment);
router.get('/:id/download', downloadAttachment);
router.delete('/:id', deleteAttachment);

export default router;
