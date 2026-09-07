import { Hono } from 'hono';
import {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification
} from '../controllers/notifications.controller';
import { authenticate } from '../middleware/auth.middleware';
import type { AppBindings } from '../types';

const router = new Hono<AppBindings>();

router.use('*', authenticate);
router.get('/', getNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);
router.delete('/:id', deleteNotification);

export default router;
