import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { getTeamMemberId, getUserIdForMember, notify, logActivity } from '../lib/notify';
import type { AppContext } from '../types';

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

export const getTasks = async (c: AppContext) => {
  const { userId, orgId } = c.get('user');
  const status = c.req.query('status');
  const priority = c.req.query('priority');
  const assignedToId = c.req.query('assignedToId');
  const leadId = c.req.query('leadId');
  const dealId = c.req.query('dealId');
  const scope = c.req.query('scope');

  const where: any = { organizationId: orgId };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (leadId) where.leadId = leadId;
  if (dealId) where.dealId = dealId;

  if (assignedToId) {
    where.assignedToId = assignedToId;
  } else if (scope === 'mine') {
    const memberId = await getTeamMemberId(userId, orgId);
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

  return c.json(tasks);
};

export const getTask = async (c: AppContext) => {
  const task = await prisma.task.findFirst({
    where: { id: c.req.param('id'), organizationId: c.get('user').orgId },
    include: taskInclude
  });
  if (!task) return c.json({ error: 'Task not found' }, 404);
  return c.json(task);
};

export const createTask = async (c: AppContext) => {
  const { userId, orgId } = c.get('user');
  const body = TaskSchema.parse(await c.req.json());

  const linkError = await verifyLinks(orgId, body.leadId, body.dealId);
  if (linkError) return c.json({ error: linkError }, 404);

  // Unassigned tasks default to their creator so nothing falls through the cracks.
  const assignedToId = body.assignedToId || (await getTeamMemberId(userId, orgId));

  if (body.assignedToId) {
    const member = await prisma.teamMember.findFirst({
      where: { id: body.assignedToId, organizationId: orgId }
    });
    if (!member) return c.json({ error: 'Assignee not found in this organization' }, 404);
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
      createdById: userId
    },
    include: taskInclude
  });

  await logActivity(task.leadId, 'task_created', `Task created: ${task.title}`, { taskId: task.id });

  // Only ping the assignee when somebody else assigned it to them.
  if (assignedToId) {
    const assigneeUserId = await getUserIdForMember(assignedToId, orgId);
    if (assigneeUserId && assigneeUserId !== userId) {
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

  return c.json(task, 201);
};

export const updateTask = async (c: AppContext) => {
  const id = c.req.param('id');
  const { userId, orgId } = c.get('user');

  const existing = await prisma.task.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return c.json({ error: 'Task not found' }, 404);

  const body = TaskSchema.partial().parse(await c.req.json());

  const linkError = await verifyLinks(orgId, body.leadId, body.dealId);
  if (linkError) return c.json({ error: linkError }, 404);

  if (body.assignedToId) {
    const member = await prisma.teamMember.findFirst({
      where: { id: body.assignedToId, organizationId: orgId }
    });
    if (!member) return c.json({ error: 'Assignee not found in this organization' }, 404);
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
    if (assigneeUserId && assigneeUserId !== userId) {
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

  return c.json(task);
};

export const toggleTaskStatus = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;
  const { status } = await c.req.json();

  if (!['open', 'completed'].includes(status)) {
    return c.json({ error: 'status must be open or completed' }, 400);
  }

  const existing = await prisma.task.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return c.json({ error: 'Task not found' }, 404);

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

  return c.json(task);
};

export const deleteTask = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;

  const existing = await prisma.task.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return c.json({ error: 'Task not found' }, 404);

  await prisma.task.delete({ where: { id } });
  return c.json({ message: 'Task deleted' });
};
