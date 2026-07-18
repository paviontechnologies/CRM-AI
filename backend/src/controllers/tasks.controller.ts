import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import { getTeamMemberId, getUserIdForMember, notify, logActivity } from '../lib/notify';

const TaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assignedToId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable()
});

const taskInclude = {
  assignedTo: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
  lead: { select: { id: true, companyName: true } },
  deal: { select: { id: true, title: true } }
};

/** Verify lead/deal belong to the caller's org before linking a task to them. */
const verifyLinks = async (
  orgId: string,
  leadId?: string | null,
  dealId?: string | null
): Promise<string | null> => {
  if (leadId) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId: orgId } });
    if (!lead) return 'Lead not found';
  }
  if (dealId) {
    const deal = await prisma.deal.findFirst({ where: { id: dealId, organizationId: orgId } });
    if (!deal) return 'Deal not found';
  }
  return null;
};

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const { status, priority, assignedToId, leadId, dealId, scope } = req.query as Record<string, string>;

    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (leadId) where.leadId = leadId;
    if (dealId) where.dealId = dealId;

    if (assignedToId) {
      where.assignedToId = assignedToId;
    } else if (scope === 'mine') {
      const memberId = await getTeamMemberId(req.user!.userId, orgId);
      where.assignedToId = memberId;
    }

    if (scope === 'overdue') {
      where.status = 'open';
      where.dueDate = { lt: new Date() };
    } else if (scope === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.dueDate = { gte: start, lt: end };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: taskInclude,
      // Undated tasks sort last so the agenda reads chronologically.
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }]
    });

    res.status(200).json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, organizationId: req.user!.orgId },
      include: taskInclude
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.status(200).json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const body = TaskSchema.parse(req.body);

    const linkError = await verifyLinks(orgId, body.leadId, body.dealId);
    if (linkError) return res.status(404).json({ error: linkError });

    // Unassigned tasks default to their creator so nothing falls through the cracks.
    const assignedToId = body.assignedToId || (await getTeamMemberId(req.user!.userId, orgId));

    if (body.assignedToId) {
      const member = await prisma.teamMember.findFirst({
        where: { id: body.assignedToId, organizationId: orgId }
      });
      if (!member) return res.status(404).json({ error: 'Assignee not found in this organization' });
    }

    const task = await prisma.task.create({
      data: {
        organizationId: orgId,
        title: body.title,
        description: body.description ?? null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        priority: body.priority,
        assignedToId,
        leadId: body.leadId ?? null,
        dealId: body.dealId ?? null,
        createdById: req.user!.userId
      },
      include: taskInclude
    });

    await logActivity(task.leadId, 'task_created', `Task created: ${task.title}`, { taskId: task.id });

    // Only ping the assignee when somebody else assigned it to them.
    if (assignedToId) {
      const assigneeUserId = await getUserIdForMember(assignedToId, orgId);
      if (assigneeUserId && assigneeUserId !== req.user!.userId) {
        await notify({
          organizationId: orgId,
          userId: assigneeUserId,
          type: 'task_assigned',
          title: 'New task assigned to you',
          body: task.title,
          link: '/tasks'
        });
      }
    }

    res.status(201).json(task);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const existing = await prisma.task.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const body = TaskSchema.partial().parse(req.body);

    const linkError = await verifyLinks(orgId, body.leadId, body.dealId);
    if (linkError) return res.status(404).json({ error: linkError });

    if (body.assignedToId) {
      const member = await prisma.teamMember.findFirst({
        where: { id: body.assignedToId, organizationId: orgId }
      });
      if (!member) return res.status(404).json({ error: 'Assignee not found in this organization' });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.assignedToId !== undefined && { assignedToId: body.assignedToId }),
        ...(body.leadId !== undefined && { leadId: body.leadId }),
        ...(body.dealId !== undefined && { dealId: body.dealId }),
        // A rescheduled task should be able to remind again.
        ...(body.dueDate !== undefined && { reminded: false })
      },
      include: taskInclude
    });

    // Reassignment is worth a notification; other edits are not.
    if (body.assignedToId && body.assignedToId !== existing.assignedToId) {
      const assigneeUserId = await getUserIdForMember(body.assignedToId, orgId);
      if (assigneeUserId && assigneeUserId !== req.user!.userId) {
        await notify({
          organizationId: orgId,
          userId: assigneeUserId,
          type: 'task_assigned',
          title: 'A task was assigned to you',
          body: task.title,
          link: '/tasks'
        });
      }
    }

    res.status(200).json(task);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleTaskStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;
    const { status } = req.body;

    if (!['open', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'status must be open or completed' });
    }

    const existing = await prisma.task.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const task = await prisma.task.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'completed' ? new Date() : null
      },
      include: taskInclude
    });

    if (status === 'completed') {
      await logActivity(task.leadId, 'task_completed', `Task completed: ${task.title}`, { taskId: task.id });
    }

    res.status(200).json(task);
  } catch (error) {
    console.error('Toggle task status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const existing = await prisma.task.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    await prisma.task.delete({ where: { id } });
    res.status(200).json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
