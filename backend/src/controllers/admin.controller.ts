import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';

const templateSchema = z.object({
  name: z.string().min(1),
  niche: z.string().min(1),
  channel: z.string().min(1),
  subject: z.string().optional().nullable(),
  content: z.string().min(1),
  isDefault: z.boolean().default(true)
});

export const getAllOrgs = async (_req: AuthRequest, res: Response) => {
  try {
    const orgs = await prisma.organization.findMany({
      include: {
        _count: { select: { members: true, leads: true, campaigns: true } },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(orgs);
  } catch (error) {
    console.error('Get all orgs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllUsers = async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        teamMembers: {
          include: { organization: { select: { id: true, name: true, slug: true, subscription: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const sanitized = users.map(({ passwordHash, refreshToken, otpCode, ...u }) => u);
    res.status(200).json(sanitized);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSystemStats = async (_req: AuthRequest, res: Response) => {
  try {
    const [totalUsers, totalOrgs, totalLeads, totalCampaigns, totalMessages] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.lead.count({ where: { status: { not: 'Deleted' } } }),
      prisma.campaign.count(),
      prisma.message.count()
    ]);

    const recentLeads = await prisma.lead.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
    });

    const recentUsers = await prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
    });

    res.status(200).json({
      totalUsers,
      totalOrgs,
      totalLeads,
      totalCampaigns,
      totalMessages,
      recentLeads,
      recentUsers
    });
  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getNicheTemplates = async (_req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.nicheTemplate.findMany({
      orderBy: [{ niche: 'asc' }, { channel: 'asc' }]
    });
    res.status(200).json(templates);
  } catch (error) {
    console.error('Get niche templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createNicheTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const data = templateSchema.parse(req.body);
    const template = await prisma.nicheTemplate.create({ data });
    res.status(201).json(template);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateNicheTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.nicheTemplate.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Template not found' });

    const data = templateSchema.partial().parse(req.body);
    const template = await prisma.nicheTemplate.update({ where: { id }, data });
    res.status(200).json(template);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteNicheTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.nicheTemplate.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Template not found' });

    await prisma.nicheTemplate.delete({ where: { id } });
    res.status(200).json({ message: 'Template deleted' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleFeature = async (req: AuthRequest, res: Response) => {
  try {
    const { feature, enabled } = req.body;
    if (!feature) return res.status(400).json({ error: 'feature is required' });

    const key = `FEATURE_${feature.toString().toUpperCase()}`;
    process.env[key] = enabled ? 'true' : 'false';

    res.status(200).json({ feature, enabled, key });
  } catch (error) {
    console.error('Toggle feature error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
