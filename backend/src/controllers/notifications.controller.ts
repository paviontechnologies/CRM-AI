import { prisma } from '../lib/prisma';
import type { AppContext } from '../types';

export const getNotifications = async (c: AppContext) => {
  const { userId, orgId } = c.get('user');
  const unreadOnly = c.req.query('unreadOnly');
  const limit = c.req.query('limit') || '30';

  const where = {
    userId,
    organizationId: orgId,
    ...(unreadOnly === 'true' && { read: false })
  };

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, Math.max(1, parseInt(limit, 10) || 30))
    }),
    prisma.notification.count({ where: { userId, organizationId: orgId, read: false } })
  ]);

  return c.json({ notifications, unreadCount });
};

export const markRead = async (c: AppContext) => {
  const { userId, orgId } = c.get('user');

  // Scoped by userId so one user can't mark another's notifications read.
  const result = await prisma.notification.updateMany({
    where: { id: c.req.param('id'), userId, organizationId: orgId },
    data: { read: true }
  });

  if (result.count === 0) return c.json({ error: 'Notification not found' }, 404);
  return c.json({ message: 'Marked as read' });
};

export const markAllRead = async (c: AppContext) => {
  const { userId, orgId } = c.get('user');
  const result = await prisma.notification.updateMany({
    where: { userId, organizationId: orgId, read: false },
    data: { read: true }
  });
  return c.json({ message: 'All marked as read', count: result.count });
};

export const deleteNotification = async (c: AppContext) => {
  const { userId, orgId } = c.get('user');
  const result = await prisma.notification.deleteMany({
    where: { id: c.req.param('id'), userId, organizationId: orgId }
  });
  if (result.count === 0) return c.json({ error: 'Notification not found' }, 404);
  return c.json({ message: 'Notification deleted' });
};
