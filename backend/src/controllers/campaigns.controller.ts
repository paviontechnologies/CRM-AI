import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import { logActivity } from '../lib/notify';

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

export const getCampaigns = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: orgId },
      include: {
        steps: { orderBy: { orderIndex: 'asc' } },
        _count: { select: { enrollments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(campaigns);
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId: orgId },
      include: {
        steps: { orderBy: { orderIndex: 'asc' } },
        _count: { select: { enrollments: true } }
      }
    });

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.status(200).json(campaign);
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const { steps, ...campaignData } = CampaignSchema.parse(req.body);

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

    res.status(201).json(campaign);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const existing = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });

    const allowed = ['name', 'description', 'status', 'targetNiche', 'targetCity', 'targetIndustry'];
    const data: any = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    const campaign = await prisma.campaign.update({ where: { id }, data });
    res.status(200).json(campaign);
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const existing = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });

    await prisma.campaign.delete({ where: { id } });
    res.status(200).json({ message: 'Campaign deleted' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addStep = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const existing = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });

    const stepData = StepSchema.parse(req.body);
    const step = await prisma.campaignStep.create({ data: { ...stepData, campaignId: id } });
    res.status(201).json(step);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Add step error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const enrollLeads = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;
    const { leadIds } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds array is required' });
    }

    const campaign = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const existingEnrollments = await prisma.campaignEnrollment.findMany({
      where: { campaignId: id, leadId: { in: leadIds } },
      select: { leadId: true }
    });
    const alreadyEnrolled = new Set(existingEnrollments.map((e) => e.leadId));
    const newLeadIds = leadIds.filter((lid: string) => !alreadyEnrolled.has(lid));

    if (newLeadIds.length > 0) {
      await prisma.campaignEnrollment.createMany({
        data: newLeadIds.map((leadId: string) => ({
          campaignId: id,
          leadId,
          status: 'active',
          currentStep: 0,
          nextRunAt: new Date()
        }))
      });

      await prisma.campaign.update({
        where: { id },
        data: { totalLeads: { increment: newLeadIds.length } }
      });
    }

    res.status(200).json({
      enrolled: newLeadIds.length,
      alreadyEnrolled: alreadyEnrolled.size,
      total: leadIds.length
    });
  } catch (error) {
    console.error('Enroll leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 1x1 transparent GIF served by the open-tracking pixel.
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/** GET /api/campaigns/track/:messageId/open.gif — public, no auth (runs in the recipient's mail client). */
export const trackOpen = async (req: Request, res: Response) => {
  // Always return the pixel, whatever happens, so mail clients never show a broken image.
  const respond = () => {
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.status(200).end(TRACKING_PIXEL);
  };

  try {
    const { messageId } = req.params;
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
    console.error('Track open error:', error);
  }

  respond();
};

/** PATCH /api/campaigns/:id/status — activate/pause a campaign so the scheduler picks it up. */
export const setCampaignStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;
    const { status } = req.body;

    if (!['draft', 'active', 'paused', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'status must be draft, active, paused or completed' });
    }

    const existing = await prisma.campaign.findFirst({
      where: { id, organizationId: orgId },
      include: { _count: { select: { steps: true } } }
    });
    if (!existing) return res.status(404).json({ error: 'Campaign not found' });

    // A campaign with no steps would activate and silently do nothing.
    if (status === 'active' && existing._count.steps === 0) {
      return res.status(400).json({ error: 'Add at least one step before activating' });
    }

    const campaign = await prisma.campaign.update({ where: { id }, data: { status } });
    res.status(200).json(campaign);
  } catch (error) {
    console.error('Set campaign status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCampaignAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const campaign = await prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

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

    res.status(200).json({
      sent: campaign.sentCount,
      replies: campaign.replyCount,
      opens: campaign.openCount,
      enrollments,
      activeEnrollments,
      replyRate,
      openRate
    });
  } catch (error) {
    console.error('Campaign analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
