import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const orgId = req.user!.orgId;
    const { unreadOnly, limit = '30' } = req.query as Record<string, string>;

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

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Scoped by userId so one user can't mark another's notifications read.
    const result = await prisma.notification.updateMany({
      where: { id, userId: req.user!.userId, organizationId: req.user!.orgId },
      data: { read: true }
    });

    if (result.count === 0) return res.status(404).json({ error: 'Notification not found' });
    res.status(200).json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const markAllRead = async (req: AuthRequest, res: Response) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user!.userId, organizationId: req.user!.orgId, read: false },
      data: { read: true }
    });
    res.status(200).json({ message: 'All marked as read', count: result.count });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const result = await prisma.notification.deleteMany({
      where: { id: req.params.id, userId: req.user!.userId, organizationId: req.user!.orgId }
    });
    if (result.count === 0) return res.status(404).json({ error: 'Notification not found' });
    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
