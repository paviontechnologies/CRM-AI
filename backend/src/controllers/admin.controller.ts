import { prisma } from '../lib/prisma';
import { z } from 'zod';
import type { AppContext } from '../types';

const templateSchema = z.object({
  name: z.string().min(1),
  niche: z.string().min(1),
  channel: z.string().min(1),
  subject: z.string().optional().nullable(),
  content: z.string().min(1),
  isDefault: z.boolean().default(true)
});

export const getAllOrgs = async (c: AppContext) => {
  const orgs = await prisma.organization.findMany({
    include: {
      _count: { select: { members: true, leads: true, campaigns: true } },
      subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 }
    },
    orderBy: { createdAt: 'desc' }
  });
  return c.json(orgs);
};

export const getAllUsers = async (c: AppContext) => {
  const users = await prisma.user.findMany({
    include: {
      teamMembers: {
        include: { organization: { select: { id: true, name: true, slug: true, subscription: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Nothing secret is stored on User any more — only the Supabase identity id,
  // which is an internal join key and not something the admin panel needs.
  const sanitized = users.map(({ supabaseId, ...u }) => u);
  return c.json(sanitized);
};

export const getSystemStats = async (c: AppContext) => {
  const [totalUsers, totalOrgs, totalLeads, totalCampaigns, totalMessages] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.lead.count({ where: { status: { not: 'DELETED' } } }),
    prisma.campaign.count(),
    prisma.message.count()
  ]);

  const recentLeads = await prisma.lead.count({
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
  });

  const recentUsers = await prisma.user.count({
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
  });

  return c.json({
    totalUsers,
    totalOrgs,
    totalLeads,
    totalCampaigns,
    totalMessages,
    recentLeads,
    recentUsers
  });
};

export const getNicheTemplates = async (c: AppContext) => {
  const templates = await prisma.nicheTemplate.findMany({
    orderBy: [{ niche: 'asc' }, { channel: 'asc' }]
  });
  return c.json(templates);
};

export const createNicheTemplate = async (c: AppContext) => {
  const data = templateSchema.parse(await c.req.json());
  const template = await prisma.nicheTemplate.create({ data });
  return c.json(template, 201);
};

export const updateNicheTemplate = async (c: AppContext) => {
  const id = c.req.param('id');
  const existing = await prisma.nicheTemplate.findUnique({ where: { id } });
  if (!existing) return c.json({ error: 'Template not found' }, 404);

  const data = templateSchema.partial().parse(await c.req.json());
  const template = await prisma.nicheTemplate.update({ where: { id }, data });
  return c.json(template);
};

export const deleteNicheTemplate = async (c: AppContext) => {
  const id = c.req.param('id');
  const existing = await prisma.nicheTemplate.findUnique({ where: { id } });
  if (!existing) return c.json({ error: 'Template not found' }, 404);

  await prisma.nicheTemplate.delete({ where: { id } });
  return c.json({ message: 'Template deleted' });
};

/**
 * POST /api/admin/features — not implemented.
 *
 * This used to write `process.env[FEATURE_X]` in the Express build, which never
 * really worked: the value was lost on restart and invisible to every other
 * instance. On Workers `env` is read-only per request, so there is nowhere to
 * put it at all. A real implementation needs a FeatureFlag table or a KV
 * namespace — returning 501 rather than pretending the toggle stuck.
 */
export const toggleFeature = async (c: AppContext) => {
  const { feature } = await c.req.json();
  if (!feature) return c.json({ error: 'feature is required' }, 400);

  return c.json(
    {
      error: 'Feature toggles are not implemented. Flags need durable storage (DB or KV).',
      feature
    },
    501
  );
};
