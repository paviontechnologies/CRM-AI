import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { logActivity } from '../lib/notify';
import type { AppContext } from '../types';

const StepSchema = z.object({
  type: z.string(),
  dayOffset: z.number().int().default(1),
  subject: z.string().optional().nullable(),
  content: z.string(),
  channel: z.string().default('email'),
  condition: z.string().optional().nullable(),
  orderIndex: z.number().int().default(0)
});

const CampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  targetNiche: z.string().optional().nullable(),
  targetCity: z.string().optional().nullable(),
  targetIndustry: z.string().optional().nullable(),
  steps: z.array(StepSchema).optional().default([])
});

export const getCampaigns = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: orgId },
    include: {
      steps: { orderBy: { orderIndex: 'asc' } },
      _count: { select: { enrollments: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  return c.json(campaigns);
};

export const getCampaign = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;

  const campaign = await prisma.campaign.findFirst({
    where: { id, organizationId: orgId },
    include: {
      steps: { orderBy: { orderIndex: 'asc' } },
      _count: { select: { enrollments: true } }
    }
  });

  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);
  return c.json(campaign);
};

export const createCampaign = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const { steps, ...campaignData } = CampaignSchema.parse(await c.req.json());

  const campaign = await prisma.campaign.create({
    data: {
      ...campaignData,
      organizationId: orgId,
      steps: {
        create: steps.map((s, i) => ({ ...s, orderIndex: s.orderIndex ?? i }))
      }
    },
    include: { steps: { orderBy: { orderIndex: 'asc' } } }
  });

  return c.json(campaign, 201);
};

export const updateCampaign = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;

  const existing = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return c.json({ error: 'Campaign not found' }, 404);

  const body = await c.req.json();
  const allowed = ['name', 'description', 'status', 'targetNiche', 'targetCity', 'targetIndustry'];
  const data: any = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const campaign = await prisma.campaign.update({ where: { id }, data });
  return c.json(campaign);
};

export const deleteCampaign = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;

  const existing = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return c.json({ error: 'Campaign not found' }, 404);

  await prisma.campaign.delete({ where: { id } });
  return c.json({ message: 'Campaign deleted' });
};

export const addStep = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;

  const existing = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return c.json({ error: 'Campaign not found' }, 404);

  const stepData = StepSchema.parse(await c.req.json());
  const step = await prisma.campaignStep.create({ data: { ...stepData, campaignId: existing.id } });
  return c.json(step, 201);
};

export const enrollLeads = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;
  const { leadIds } = await c.req.json();

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return c.json({ error: 'leadIds array is required' }, 400);
  }

  const campaign = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);

  // Security: verify ALL leadIds belong to this org before enrolling.
  // Prevents cross-tenant IDOR — a user from org A cannot enroll org B's leads.
  const orgLeads = await prisma.lead.findMany({
    where: { id: { in: leadIds }, organizationId: orgId },
    select: { id: true }
  });
  const validLeadIds = new Set(orgLeads.map((l) => l.id));
  const crossTenantIds = leadIds.filter((lid: string) => !validLeadIds.has(lid));
  if (crossTenantIds.length > 0) {
    return c.json(
      {
        error: 'Some leads do not belong to your organization',
        invalidIds: crossTenantIds
      },
      403
    );
  }

  const existingEnrollments = await prisma.campaignEnrollment.findMany({
    where: { campaignId: id, leadId: { in: leadIds } },
    select: { leadId: true }
  });
  const alreadyEnrolled = new Set(existingEnrollments.map((e) => e.leadId));
  const newLeadIds = leadIds.filter((lid: string) => !alreadyEnrolled.has(lid));

  if (newLeadIds.length > 0) {
    await prisma.campaignEnrollment.createMany({
      data: newLeadIds.map((leadId: string) => ({
        campaignId: campaign.id,
        leadId,
        status: 'active',
        currentStep: 0,
        nextRunAt: new Date()
      }))
    });

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { totalLeads: { increment: newLeadIds.length } }
    });
  }

  return c.json({
    enrolled: newLeadIds.length,
    alreadyEnrolled: alreadyEnrolled.size,
    total: leadIds.length
  });
};

// 1x1 transparent GIF served by the open-tracking pixel.
const TRACKING_PIXEL = Uint8Array.from(
  atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
  (ch) => ch.charCodeAt(0)
);

/** GET /api/campaigns/track/:messageId/open.gif — public, no auth (runs in the recipient's mail client). */
export const trackOpen = async (c: AppContext) => {
  try {
    const messageId = c.req.param('messageId');
    const message = await prisma.message.findUnique({ where: { id: messageId } });

    // Count each message once — repeat opens shouldn't inflate the rate.
    if (message?.campaignId && message.status === 'sent') {
      await prisma.message.update({ where: { id: messageId }, data: { status: 'opened' } });
      await prisma.campaign.update({
        where: { id: message.campaignId },
        data: { openCount: { increment: 1 } }
      });
      await logActivity(message.leadId, 'email_opened', `Opened: ${message.subject || '(no subject)'}`, {
        messageId,
        campaignId: message.campaignId
      });
    }
  } catch (error) {
    // Always return the pixel, whatever happens, so mail clients never show a
    // broken image — swallowing here is deliberate.
    console.error('Track open error:', error);
  }

  return c.body(TRACKING_PIXEL, 200, {
    'Content-Type': 'image/gif',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    Pragma: 'no-cache'
  });
};

/** PATCH /api/campaigns/:id/status — activate/pause a campaign so the scheduler picks it up. */
export const setCampaignStatus = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;
  const { status } = await c.req.json();

  if (!['draft', 'active', 'paused', 'completed'].includes(status)) {
    return c.json({ error: 'status must be draft, active, paused or completed' }, 400);
  }

  const existing = await prisma.campaign.findFirst({
    where: { id, organizationId: orgId },
    include: { _count: { select: { steps: true } } }
  });
  if (!existing) return c.json({ error: 'Campaign not found' }, 404);

  // A campaign with no steps would activate and silently do nothing.
  if (status === 'active' && existing._count.steps === 0) {
    return c.json({ error: 'Add at least one step before activating' }, 400);
  }

  const campaign = await prisma.campaign.update({ where: { id }, data: { status } });
  return c.json(campaign);
};

export const getCampaignAnalytics = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;

  const campaign = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);

  const enrollments = await prisma.campaignEnrollment.count({ where: { campaignId: id } });
  const activeEnrollments = await prisma.campaignEnrollment.count({
    where: { campaignId: id, status: 'active' }
  });

  const replyRate = campaign.sentCount > 0
    ? Math.round((campaign.replyCount / campaign.sentCount) * 100 * 10) / 10
    : 0;
  const openRate = campaign.sentCount > 0
    ? Math.round((campaign.openCount / campaign.sentCount) * 100 * 10) / 10
    : 0;

  return c.json({
    sent: campaign.sentCount,
    replies: campaign.replyCount,
    opens: campaign.openCount,
    enrollments,
    activeEnrollments,
    replyRate,
    openRate
  });
};
