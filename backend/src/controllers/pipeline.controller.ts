import { prisma } from '../lib/prisma';
import type { AppContext } from '../types';

const DEFAULT_STAGES = [
  { name: 'New', color: '#6b7280', orderIndex: 0 },
  { name: 'Qualified', color: '#3b82f6', orderIndex: 1 },
  { name: 'Contacted', color: '#8b5cf6', orderIndex: 2 },
  { name: 'Replied', color: '#f59e0b', orderIndex: 3 },
  { name: 'Meeting Booked', color: '#ec4899', orderIndex: 4 },
  { name: 'Proposal Sent', color: '#06b6d4', orderIndex: 5 },
  { name: 'Closed Won', color: '#10b981', orderIndex: 6 },
  { name: 'Closed Lost', color: '#ef4444', orderIndex: 7 }
];

export const getPipelines = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const pipelines = await prisma.pipeline.findMany({
    where: { organizationId: orgId },
    include: {
      stages: { orderBy: { orderIndex: 'asc' }, include: { _count: { select: { deals: true } } } }
    },
    orderBy: { createdAt: 'asc' }
  });
  return c.json(pipelines);
};

export const createPipeline = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const body = await c.req.json();
  const { name = 'Sales Pipeline', isDefault = false } = body;

  const pipeline = await prisma.pipeline.create({
    data: {
      organizationId: orgId,
      name,
      isDefault,
      stages: {
        create: DEFAULT_STAGES
      }
    },
    include: { stages: { orderBy: { orderIndex: 'asc' } } }
  });

  return c.json(pipeline, 201);
};

// GET /api/pipeline/:id/board — kanban of open deals grouped by stage
export const getBoard = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;

  const pipeline = await prisma.pipeline.findFirst({ where: { id, organizationId: orgId } });
  if (!pipeline) return c.json({ error: 'Pipeline not found' }, 404);

  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId: id },
    orderBy: { orderIndex: 'asc' },
    include: {
      deals: {
        where: { status: 'open' },
        orderBy: { createdAt: 'desc' },
        include: {
          lead: { select: { id: true, companyName: true, contactName: true, intentScore: true } },
          assignedTo: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } }
        }
      }
    }
  });

  const board = stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    color: stage.color,
    orderIndex: stage.orderIndex,
    totalValue: stage.deals.reduce((sum, d) => sum + d.value, 0),
    deals: stage.deals
  }));

  return c.json({ pipeline, stages: board });
};
