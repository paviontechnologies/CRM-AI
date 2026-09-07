import { prisma } from '../lib/prisma';
import { z } from 'zod';
import type { AppContext } from '../types';

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

export const getDeals = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const status = c.req.query('status');
  const stageId = c.req.query('stageId');
  const leadId = c.req.query('leadId');
  const search = c.req.query('search');

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

  return c.json(deals);
};

export const createDeal = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const body = DealSchema.parse(await c.req.json());

  let stageId = body.stageId;
  if (stageId) {
    const stage = await verifyStage(stageId, orgId);
    if (!stage) return c.json({ error: 'Stage not found' }, 404);
  } else {
    // Default: first stage of the default (or first) pipeline
    const pipeline = await prisma.pipeline.findFirst({
      where: { organizationId: orgId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: { stages: { orderBy: { orderIndex: 'asc' }, take: 1 } }
    });
    if (!pipeline || pipeline.stages.length === 0) {
      return c.json({ error: 'No pipeline found. Create a pipeline first.' }, 400);
    }
    stageId = pipeline.stages[0].id;
  }

  if (body.leadId) {
    const lead = await prisma.lead.findFirst({ where: { id: body.leadId, organizationId: orgId } });
    if (!lead) return c.json({ error: 'Lead not found' }, 404);
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

  return c.json(deal, 201);
};

export const updateDeal = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;

  const existing = await prisma.deal.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return c.json({ error: 'Deal not found' }, 404);

  const body = DealSchema.partial().parse(await c.req.json());
  if (body.stageId) {
    const stage = await verifyStage(body.stageId, orgId);
    if (!stage) return c.json({ error: 'Stage not found' }, 404);
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

  return c.json(deal);
};

export const moveDeal = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;
  const { stageId } = await c.req.json();

  if (!stageId) return c.json({ error: 'stageId is required' }, 400);

  const existing = await prisma.deal.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return c.json({ error: 'Deal not found' }, 404);

  const stage = await verifyStage(stageId, orgId);
  if (!stage) return c.json({ error: 'Stage not found' }, 404);

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

  return c.json(deal);
};

export const updateDealStatus = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;
  const { status, lostReason } = await c.req.json();

  if (!['open', 'won', 'lost'].includes(status)) {
    return c.json({ error: 'status must be open, won or lost' }, 400);
  }

  const existing = await prisma.deal.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return c.json({ error: 'Deal not found' }, 404);

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

  return c.json(deal);
};

export const deleteDeal = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;

  const existing = await prisma.deal.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return c.json({ error: 'Deal not found' }, 404);

  await prisma.deal.delete({ where: { id } });
  return c.json({ message: 'Deal deleted' });
};
