import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';

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

export const getPipelines = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const pipelines = await prisma.pipeline.findMany({
      where: { organizationId: orgId },
      include: {
        stages: { orderBy: { orderIndex: 'asc' }, include: { _count: { select: { leads: true } } } }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.status(200).json(pipelines);
  } catch (error) {
    console.error('Get pipelines error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPipeline = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const { name = 'Sales Pipeline', isDefault = false } = req.body;

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

    res.status(201).json(pipeline);
  } catch (error) {
    console.error('Create pipeline error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const moveLead = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const { leadId, stageId } = req.body;

    if (!leadId || !stageId) {
      return res.status(400).json({ error: 'leadId and stageId are required' });
    }

    // Verify lead belongs to org
    const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId: orgId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Verify stage belongs to org
    const stage = await prisma.pipelineStage.findFirst({
      where: { id: stageId },
      include: { pipeline: true }
    });
    if (!stage || stage.pipeline.organizationId !== orgId) {
      return res.status(404).json({ error: 'Stage not found' });
    }

    const stageLead = await prisma.pipelineStageLead.upsert({
      where: { leadId },
      update: { stageId, movedAt: new Date() },
      create: { leadId, stageId }
    });

    await prisma.activity.create({
      data: {
        leadId,
        type: 'stage_change',
        notes: `Moved to "${stage.name}"`,
        metadata: JSON.stringify({ stageId, stageName: stage.name, pipelineId: stage.pipelineId })
      }
    });

    res.status(200).json(stageLead);
  } catch (error) {
    console.error('Move lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPipelineLeads = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const pipeline = await prisma.pipeline.findFirst({ where: { id, organizationId: orgId } });
    if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });

    const stages = await prisma.pipelineStage.findMany({
      where: { pipelineId: id },
      orderBy: { orderIndex: 'asc' },
      include: {
        leads: {
          include: {
            lead: {
              include: {
                assignedTo: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
                scores: { orderBy: { createdAt: 'desc' }, take: 1 }
              }
            }
          }
        }
      }
    });

    const kanban = stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      orderIndex: stage.orderIndex,
      leads: stage.leads.map((sl) => sl.lead)
    }));

    res.status(200).json({ pipeline, stages: kanban });
  } catch (error) {
    console.error('Get pipeline leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createDefaultPipeline = async (organizationId: string): Promise<void> => {
  await prisma.pipeline.create({
    data: {
      organizationId,
      name: 'Sales Pipeline',
      isDefault: true,
      stages: { create: DEFAULT_STAGES }
    }
  });
};
