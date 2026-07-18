import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';

const DealSchema = z.object({
  title: z.string().min(1),
  value: z.number().min(0).default(0),
  currency: z.string().default('INR'),
  expectedCloseDate: z.string().datetime().optional().nullable(),
  stageId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable()
});

const dealInclude = {
  stage: { include: { pipeline: { select: { id: true, name: true } } } },
  lead: { select: { id: true, companyName: true, contactName: true, email: true } },
  assignedTo: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } }
};

const verifyStage = async (stageId: string, orgId: string) => {
  const stage = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipeline: { organizationId: orgId } }
  });
  return stage;
};

export const getDeals = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const { status, stageId, leadId, search } = req.query as Record<string, string>;

    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (stageId) where.stageId = stageId;
    if (leadId) where.leadId = leadId;
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const deals = await prisma.deal.findMany({
      where,
      include: dealInclude,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(deals);
  } catch (error) {
    console.error('Get deals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createDeal = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const body = DealSchema.parse(req.body);

    let stageId = body.stageId;
    if (stageId) {
      const stage = await verifyStage(stageId, orgId);
      if (!stage) return res.status(404).json({ error: 'Stage not found' });
    } else {
      // Default: first stage of the default (or first) pipeline
      const pipeline = await prisma.pipeline.findFirst({
        where: { organizationId: orgId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        include: { stages: { orderBy: { orderIndex: 'asc' }, take: 1 } }
      });
      if (!pipeline || pipeline.stages.length === 0) {
        return res.status(400).json({ error: 'No pipeline found. Create a pipeline first.' });
      }
      stageId = pipeline.stages[0].id;
    }

    if (body.leadId) {
      const lead = await prisma.lead.findFirst({ where: { id: body.leadId, organizationId: orgId } });
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
    }

    const deal = await prisma.deal.create({
      data: {
        organizationId: orgId,
        title: body.title,
        value: body.value,
        currency: body.currency,
        expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
        stageId,
        leadId: body.leadId || null,
        assignedToId: body.assignedToId || null
      },
      include: dealInclude
    });

    if (deal.leadId) {
      await prisma.activity.create({
        data: {
          leadId: deal.leadId,
          type: 'deal_created',
          notes: `Deal "${deal.title}" created (${deal.currency} ${deal.value.toLocaleString()})`,
          metadata: JSON.stringify({ dealId: deal.id })
        }
      });
    }

    res.status(201).json(deal);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Create deal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDeal = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const existing = await prisma.deal.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return res.status(404).json({ error: 'Deal not found' });

    const body = DealSchema.partial().parse(req.body);
    if (body.stageId) {
      const stage = await verifyStage(body.stageId, orgId);
      if (!stage) return res.status(404).json({ error: 'Stage not found' });
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.value !== undefined && { value: body.value }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.expectedCloseDate !== undefined && {
          expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null
        }),
        ...(body.stageId !== undefined && body.stageId && { stageId: body.stageId }),
        ...(body.assignedToId !== undefined && { assignedToId: body.assignedToId }),
        ...(body.leadId !== undefined && { leadId: body.leadId })
      },
      include: dealInclude
    });

    res.status(200).json(deal);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Update deal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const moveDeal = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;
    const { stageId } = req.body;

    if (!stageId) return res.status(400).json({ error: 'stageId is required' });

    const existing = await prisma.deal.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return res.status(404).json({ error: 'Deal not found' });

    const stage = await verifyStage(stageId, orgId);
    if (!stage) return res.status(404).json({ error: 'Stage not found' });

    const deal = await prisma.deal.update({
      where: { id },
      data: { stageId },
      include: dealInclude
    });

    if (deal.leadId) {
      await prisma.activity.create({
        data: {
          leadId: deal.leadId,
          type: 'stage_change',
          notes: `Deal "${deal.title}" moved to "${stage.name}"`,
          metadata: JSON.stringify({ dealId: deal.id, stageId, stageName: stage.name })
        }
      });
    }

    res.status(200).json(deal);
  } catch (error) {
    console.error('Move deal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDealStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;
    const { status, lostReason } = req.body;

    if (!['open', 'won', 'lost'].includes(status)) {
      return res.status(400).json({ error: 'status must be open, won or lost' });
    }

    const existing = await prisma.deal.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return res.status(404).json({ error: 'Deal not found' });

    const deal = await prisma.deal.update({
      where: { id },
      data: {
        status,
        lostReason: status === 'lost' ? lostReason || null : null,
        closedAt: status === 'open' ? null : new Date()
      },
      include: dealInclude
    });

    if (deal.leadId) {
      await prisma.activity.create({
        data: {
          leadId: deal.leadId,
          type: 'deal_status',
          notes:
            status === 'won'
              ? `Deal "${deal.title}" marked WON 🎉`
              : status === 'lost'
                ? `Deal "${deal.title}" marked lost${lostReason ? `: ${lostReason}` : ''}`
                : `Deal "${deal.title}" reopened`,
          metadata: JSON.stringify({ dealId: deal.id, status })
        }
      });
    }

    res.status(200).json(deal);
  } catch (error) {
    console.error('Update deal status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDeal = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const existing = await prisma.deal.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return res.status(404).json({ error: 'Deal not found' });

    await prisma.deal.delete({ where: { id } });
    res.status(200).json({ message: 'Deal deleted' });
  } catch (error) {
    console.error('Delete deal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
