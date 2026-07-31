import { prisma } from '../lib/prisma';
import * as aiService from '../services/ai.service';
import { logActivity } from '../lib/notify';
import { getTeamMemberId } from '../lib/notify';

export interface ToolContext {
  orgId: string;
  userId: string;
  role: string;
}

export interface ToolResult {
  ok: boolean;
  /** Human-readable summary the model can relay to the user. */
  summary: string;
  /** Structured payload so the model can answer follow-ups. */
  data?: unknown;
  /** A frontend deep-link to the thing that was created/changed, if any. */
  link?: string;
}

const LEAD_STATUSES = [
  'NEW', 'QUALIFIED', 'CONTACTED', 'REPLIED',
  'MEETING_BOOKED', 'PROPOSAL_SENT', 'CLOSED_WON', 'CLOSED_LOST'
];

// ─── Anthropic tool schema ────────────────────────────────────────────────────
// Names/shapes the model sees. Keep descriptions action-oriented.

export const toolDefinitions = [
  {
    name: 'search_leads',
    description: 'Search and list leads in the CRM. Use to answer questions about leads or to find a lead before acting on it.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Free text — matches company name, contact, email or city.' },
        status: { type: 'string', enum: LEAD_STATUSES, description: 'Filter by pipeline status.' },
        industry: { type: 'string' },
        limit: { type: 'number', description: 'Max results, default 10, max 25.' }
      }
    }
  },
  {
    name: 'get_lead_details',
    description: 'Get full details of one lead including scores, recent activity, open tasks and deals. Accepts a lead id or a company name.',
    input_schema: {
      type: 'object' as const,
      properties: {
        leadId: { type: 'string' },
        companyName: { type: 'string', description: 'Used if leadId is not provided.' }
      }
    }
  },
  {
    name: 'create_lead',
    description: 'Create a new lead. Requires at least a company name.',
    input_schema: {
      type: 'object' as const,
      properties: {
        companyName: { type: 'string' },
        contactName: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        industry: { type: 'string' },
        city: { type: 'string' },
        website: { type: 'string' },
        notes: { type: 'string' }
      },
      required: ['companyName']
    }
  },
  {
    name: 'update_lead_status',
    description: 'Move a lead to a different pipeline status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        leadId: { type: 'string' },
        companyName: { type: 'string', description: 'Used if leadId is not provided.' },
        status: { type: 'string', enum: LEAD_STATUSES }
      },
      required: ['status']
    }
  },
  {
    name: 'score_lead',
    description: 'Run AI intent scoring on a lead. Returns intent score, ICP score and a recommended next action.',
    input_schema: {
      type: 'object' as const,
      properties: {
        leadId: { type: 'string' },
        companyName: { type: 'string', description: 'Used if leadId is not provided.' }
      }
    }
  },
  {
    name: 'draft_outreach',
    description: 'Draft a personalized outreach message for a lead. Returns the draft; it is saved as a draft message on the lead.',
    input_schema: {
      type: 'object' as const,
      properties: {
        leadId: { type: 'string' },
        companyName: { type: 'string', description: 'Used if leadId is not provided.' },
        channel: { type: 'string', enum: ['email', 'whatsapp', 'linkedin', 'sms'], description: 'Default email.' }
      }
    }
  },
  {
    name: 'add_note',
    description: 'Add a note to a lead.',
    input_schema: {
      type: 'object' as const,
      properties: {
        leadId: { type: 'string' },
        companyName: { type: 'string', description: 'Used if leadId is not provided.' },
        body: { type: 'string' }
      },
      required: ['body']
    }
  },
  {
    name: 'create_task',
    description: 'Create a follow-up task, optionally linked to a lead and with a due date.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        dueDate: { type: 'string', description: 'ISO date or natural language like "tomorrow", "in 3 days".' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        leadId: { type: 'string' },
        companyName: { type: 'string', description: 'Link the task to this lead if leadId not given.' }
      },
      required: ['title']
    }
  },
  {
    name: 'list_tasks',
    description: 'List tasks. Use scope to filter to what is due today, overdue, or assigned to the current user.',
    input_schema: {
      type: 'object' as const,
      properties: {
        scope: { type: 'string', enum: ['all', 'mine', 'today', 'overdue'] }
      }
    }
  },
  {
    name: 'complete_task',
    description: 'Mark a task as completed. Accepts a task id or a task title to match.',
    input_schema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string' },
        title: { type: 'string', description: 'Used if taskId not provided — matches an open task by title.' }
      }
    }
  },
  {
    name: 'create_deal',
    description: 'Create a deal in the pipeline, optionally linked to a lead.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        value: { type: 'number', description: 'Deal value in the org currency.' },
        leadId: { type: 'string' },
        companyName: { type: 'string', description: 'Link to this lead if leadId not given.' },
        stageName: { type: 'string', description: 'Target stage name; defaults to the first stage.' }
      },
      required: ['title']
    }
  },
  {
    name: 'move_deal',
    description: 'Move a deal to a different pipeline stage, or mark it won/lost.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dealTitle: { type: 'string', description: 'Match a deal by title.' },
        dealId: { type: 'string' },
        stageName: { type: 'string', description: 'Target stage name.' },
        status: { type: 'string', enum: ['won', 'lost'], description: 'Alternatively close the deal.' }
      }
    }
  },
  {
    name: 'get_pipeline_summary',
    description: 'Summarize the sales pipeline: deals and total value per stage, plus open/won/lost counts.',
    input_schema: { type: 'object' as const, properties: {} }
  },
  {
    name: 'get_analytics_summary',
    description: 'High-level CRM metrics: total leads, leads by status, this-week new leads, active campaigns.',
    input_schema: { type: 'object' as const, properties: {} }
  }
];

// Tools that change data. Blocked for the VIEWER role.
const WRITE_TOOLS = new Set([
  'create_lead', 'update_lead_status', 'score_lead', 'draft_outreach',
  'add_note', 'create_task', 'complete_task', 'create_deal', 'move_deal'
]);

export const isWriteTool = (name: string) => WRITE_TOOLS.has(name);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve a lead by id or a fuzzy company-name match, scoped to the org. */
const resolveLead = async (orgId: string, leadId?: string, companyName?: string) => {
  if (leadId) {
    return prisma.lead.findFirst({ where: { id: leadId, organizationId: orgId } });
  }
  if (companyName) {
    return prisma.lead.findFirst({
      where: {
        organizationId: orgId,
        status: { not: 'DELETED' },
        companyName: { contains: companyName, mode: 'insensitive' }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }
  return null;
};

/** Best-effort natural-language date parsing for "tomorrow", "in N days", "next week". */
const parseDueDate = (input?: string): Date | null => {
  if (!input) return null;
  const text = input.trim().toLowerCase();
  const now = new Date();

  if (text === 'today') return now;
  if (text === 'tomorrow') return new Date(now.getTime() + 86_400_000);
  if (text === 'next week') return new Date(now.getTime() + 7 * 86_400_000);

  const inDays = text.match(/in (\d+) days?/);
  if (inDays) return new Date(now.getTime() + parseInt(inDays[1], 10) * 86_400_000);

  const parsed = new Date(input);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// ─── Tool handlers ──────────────────────────────────────────────────────────

type Handler = (input: any, ctx: ToolContext) => Promise<ToolResult>;

const handlers: Record<string, Handler> = {
  search_leads: async (input, ctx) => {
    const limit = Math.min(25, Math.max(1, Number(input.limit) || 10));
    const where: any = { organizationId: ctx.orgId, status: { not: 'DELETED' } };
    if (input.status) where.status = input.status;
    if (input.industry) where.industry = { contains: input.industry, mode: 'insensitive' };
    if (input.query) {
      where.OR = [
        { companyName: { contains: input.query, mode: 'insensitive' } },
        { contactName: { contains: input.query, mode: 'insensitive' } },
        { email: { contains: input.query, mode: 'insensitive' } },
        { city: { contains: input.query, mode: 'insensitive' } }
      ];
    }
    const leads = await prisma.lead.findMany({
      where, take: limit, orderBy: { updatedAt: 'desc' },
      select: { id: true, companyName: true, contactName: true, email: true, city: true, industry: true, status: true, intentScore: true }
    });
    return {
      ok: true,
      summary: `Found ${leads.length} lead(s).`,
      data: leads
    };
  },

  get_lead_details: async (input, ctx) => {
    const lead = await resolveLead(ctx.orgId, input.leadId, input.companyName);
    if (!lead) return { ok: false, summary: 'No matching lead found.' };
    const full = await prisma.lead.findUnique({
      where: { id: lead.id },
      include: {
        scores: { orderBy: { createdAt: 'desc' }, take: 1 },
        activities: { orderBy: { createdAt: 'desc' }, take: 5 },
        tasks: { where: { status: 'open' }, take: 5 },
        deals: { include: { stage: { select: { name: true } } } }
      }
    });
    return {
      ok: true,
      summary: `Details for ${lead.companyName}.`,
      data: full,
      link: `/leads/${lead.id}`
    };
  },

  create_lead: async (input, ctx) => {
    if (!input.companyName) return { ok: false, summary: 'A company name is required.' };
    // Dedup by email like the REST path does.
    if (input.email) {
      const existing = await prisma.lead.findFirst({
        where: { organizationId: ctx.orgId, email: input.email, status: { not: 'DELETED' } }
      });
      if (existing) {
        return { ok: false, summary: `A lead with email ${input.email} already exists (${existing.companyName}).`, link: `/leads/${existing.id}` };
      }
    }
    const lead = await prisma.lead.create({
      data: {
        organizationId: ctx.orgId,
        companyName: input.companyName,
        contactName: input.contactName || null,
        email: input.email || null,
        phone: input.phone || null,
        industry: input.industry || null,
        city: input.city || null,
        website: input.website || null,
        notes: input.notes || null,
        source: 'assistant',
        status: 'NEW'
      }
    });
    await logActivity(lead.id, 'lead_created', `Lead created via AI assistant: ${lead.companyName}`);
    await prisma.organization.update({ where: { id: ctx.orgId }, data: { usedLeadCredits: { increment: 1 } } });
    return { ok: true, summary: `Created lead “${lead.companyName}”.`, data: { id: lead.id }, link: `/leads/${lead.id}` };
  },

  update_lead_status: async (input, ctx) => {
    const lead = await resolveLead(ctx.orgId, input.leadId, input.companyName);
    if (!lead) return { ok: false, summary: 'No matching lead found.' };
    if (!LEAD_STATUSES.includes(input.status)) return { ok: false, summary: `Invalid status "${input.status}".` };
    await prisma.lead.update({ where: { id: lead.id }, data: { status: input.status } });
    if (input.status !== lead.status) {
      await logActivity(lead.id, 'status_change', `Status changed ${lead.status} → ${input.status} (AI assistant)`, { from: lead.status, to: input.status });
    }
    return { ok: true, summary: `Moved ${lead.companyName} to ${input.status.replace(/_/g, ' ')}.`, link: `/leads/${lead.id}` };
  },

  score_lead: async (input, ctx) => {
    const lead = await resolveLead(ctx.orgId, input.leadId, input.companyName);
    if (!lead) return { ok: false, summary: 'No matching lead found.' };
    const org = await prisma.organization.findUnique({ where: { id: ctx.orgId }, select: { aiQualificationPrompt: true } });
    const analysis = await aiService.scoreLeadIntent(
      { companyName: lead.companyName, industry: lead.industry, city: lead.city, website: lead.website, source: lead.source, techStack: lead.techStack, employeeSize: lead.employeeSize },
      org?.aiQualificationPrompt
    );
    await prisma.leadScore.create({
      data: {
        leadId: lead.id, score: analysis.intentScore, icpScore: analysis.icpScore,
        urgency: analysis.urgency, budgetScore: analysis.budgetScore,
        reasons: Array.isArray(analysis.reasons) ? analysis.reasons.join(' | ') : String(analysis.reasons),
        recommendation: analysis.recommendation
      }
    });
    await prisma.lead.update({ where: { id: lead.id }, data: { intentScore: analysis.intentScore, icpScore: analysis.icpScore } });
    await logActivity(lead.id, 'ai_scored', `AI scored ${lead.companyName} ${analysis.intentScore}/100 (assistant)`);
    await prisma.organization.update({ where: { id: ctx.orgId }, data: { usedAiCredits: { increment: 1 } } });
    return {
      ok: true,
      summary: `${lead.companyName} scored ${analysis.intentScore}/100 intent. ${analysis.recommendation || ''}`.trim(),
      data: analysis,
      link: `/leads/${lead.id}`
    };
  },

  draft_outreach: async (input, ctx) => {
    const lead = await resolveLead(ctx.orgId, input.leadId, input.companyName);
    if (!lead) return { ok: false, summary: 'No matching lead found.' };
    const channel = input.channel || 'email';
    const result = await aiService.generateOutreach(
      { companyName: lead.companyName, industry: lead.industry, city: lead.city, contactName: lead.contactName, intentScore: lead.intentScore, website: lead.website },
      channel
    );
    const message = await prisma.message.create({
      data: { leadId: lead.id, direction: 'outbound', channel, subject: result.subject || null, body: result.body, status: 'draft' }
    });
    await logActivity(lead.id, 'outreach_drafted', `AI drafted a ${channel} message (assistant)`, { messageId: message.id });
    await prisma.organization.update({ where: { id: ctx.orgId }, data: { usedAiCredits: { increment: 1 } } });
    return {
      ok: true,
      summary: `Drafted a ${channel} message for ${lead.companyName}.`,
      data: { subject: result.subject, body: result.body },
      link: `/leads/${lead.id}`
    };
  },

  add_note: async (input, ctx) => {
    const lead = await resolveLead(ctx.orgId, input.leadId, input.companyName);
    if (!lead) return { ok: false, summary: 'No matching lead found.' };
    if (!input.body?.trim()) return { ok: false, summary: 'The note is empty.' };
    await prisma.note.create({
      data: { organizationId: ctx.orgId, body: input.body.trim(), leadId: lead.id, authorId: ctx.userId }
    });
    await logActivity(lead.id, 'note_added', input.body.length > 120 ? `${input.body.slice(0, 120)}…` : input.body);
    return { ok: true, summary: `Added a note to ${lead.companyName}.`, link: `/leads/${lead.id}` };
  },

  create_task: async (input, ctx) => {
    if (!input.title?.trim()) return { ok: false, summary: 'A task title is required.' };
    const lead = await resolveLead(ctx.orgId, input.leadId, input.companyName);
    const memberId = await getTeamMemberId(ctx.userId, ctx.orgId);
    const task = await prisma.task.create({
      data: {
        organizationId: ctx.orgId,
        title: input.title.trim(),
        dueDate: parseDueDate(input.dueDate),
        priority: ['low', 'medium', 'high'].includes(input.priority) ? input.priority : 'medium',
        assignedToId: memberId,
        leadId: lead?.id || null,
        createdById: ctx.userId
      }
    });
    if (lead) await logActivity(lead.id, 'task_created', `Task created: ${task.title} (assistant)`, { taskId: task.id });
    const due = task.dueDate ? ` (due ${task.dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})` : '';
    return { ok: true, summary: `Created task “${task.title}”${due}${lead ? ` for ${lead.companyName}` : ''}.`, link: '/tasks' };
  },

  list_tasks: async (input, ctx) => {
    const where: any = { organizationId: ctx.orgId };
    const scope = input.scope || 'all';
    if (scope === 'mine') where.assignedToId = await getTeamMemberId(ctx.userId, ctx.orgId);
    if (scope === 'overdue') { where.status = 'open'; where.dueDate = { lt: new Date() }; }
    else if (scope === 'today') {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      where.dueDate = { gte: start, lt: end };
    } else where.status = 'open';

    const tasks = await prisma.task.findMany({
      where, take: 25, orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }],
      include: { lead: { select: { companyName: true } } }
    });
    return { ok: true, summary: `${tasks.length} task(s) ${scope === 'all' ? 'open' : scope}.`, data: tasks, link: '/tasks' };
  },

  complete_task: async (input, ctx) => {
    let task = input.taskId
      ? await prisma.task.findFirst({ where: { id: input.taskId, organizationId: ctx.orgId } })
      : input.title
        ? await prisma.task.findFirst({ where: { organizationId: ctx.orgId, status: 'open', title: { contains: input.title, mode: 'insensitive' } }, orderBy: { createdAt: 'desc' } })
        : null;
    if (!task) return { ok: false, summary: 'No matching task found.' };
    await prisma.task.update({ where: { id: task.id }, data: { status: 'completed', completedAt: new Date() } });
    return { ok: true, summary: `Completed “${task.title}”.`, link: '/tasks' };
  },

  create_deal: async (input, ctx) => {
    if (!input.title?.trim()) return { ok: false, summary: 'A deal title is required.' };
    const lead = await resolveLead(ctx.orgId, input.leadId, input.companyName);

    const pipeline = await prisma.pipeline.findFirst({
      where: { organizationId: ctx.orgId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: { stages: { orderBy: { orderIndex: 'asc' } } }
    });
    if (!pipeline || pipeline.stages.length === 0) return { ok: false, summary: 'No pipeline exists yet. Create one first.' };

    const stage = input.stageName
      ? pipeline.stages.find((s) => s.name.toLowerCase() === String(input.stageName).toLowerCase()) || pipeline.stages[0]
      : pipeline.stages[0];

    const deal = await prisma.deal.create({
      data: {
        organizationId: ctx.orgId, title: input.title.trim(),
        value: Number(input.value) || 0, stageId: stage.id, leadId: lead?.id || null
      }
    });
    if (lead) await logActivity(lead.id, 'deal_created', `Deal created: ${deal.title} (assistant)`, { dealId: deal.id });
    return { ok: true, summary: `Created deal “${deal.title}” in ${stage.name}.`, link: '/pipeline' };
  },

  move_deal: async (input, ctx) => {
    const deal = input.dealId
      ? await prisma.deal.findFirst({ where: { id: input.dealId, organizationId: ctx.orgId } })
      : input.dealTitle
        ? await prisma.deal.findFirst({ where: { organizationId: ctx.orgId, title: { contains: input.dealTitle, mode: 'insensitive' } }, orderBy: { updatedAt: 'desc' } })
        : null;
    if (!deal) return { ok: false, summary: 'No matching deal found.' };

    if (input.status === 'won' || input.status === 'lost') {
      await prisma.deal.update({ where: { id: deal.id }, data: { status: input.status, closedAt: new Date() } });
      if (deal.leadId) await logActivity(deal.leadId, 'deal_status', `Deal "${deal.title}" marked ${input.status} (assistant)`);
      return { ok: true, summary: `Marked “${deal.title}” as ${input.status}.`, link: '/pipeline' };
    }

    if (!input.stageName) return { ok: false, summary: 'Provide a target stage name or a won/lost status.' };
    const stage = await prisma.pipelineStage.findFirst({
      where: { pipeline: { organizationId: ctx.orgId }, name: { equals: input.stageName, mode: 'insensitive' } }
    });
    if (!stage) return { ok: false, summary: `No stage named "${input.stageName}".` };
    await prisma.deal.update({ where: { id: deal.id }, data: { stageId: stage.id } });
    if (deal.leadId) await logActivity(deal.leadId, 'stage_change', `Deal "${deal.title}" moved to ${stage.name} (assistant)`);
    return { ok: true, summary: `Moved “${deal.title}” to ${stage.name}.`, link: '/pipeline' };
  },

  get_pipeline_summary: async (_input, ctx) => {
    const stages = await prisma.pipelineStage.findMany({
      where: { pipeline: { organizationId: ctx.orgId } },
      orderBy: { orderIndex: 'asc' },
      include: { deals: { where: { status: 'open' }, select: { value: true } } }
    });
    const byStage = stages.map((s) => ({
      stage: s.name,
      openDeals: s.deals.length,
      value: s.deals.reduce((sum, d) => sum + d.value, 0)
    }));
    const [won, lost] = await Promise.all([
      prisma.deal.count({ where: { organizationId: ctx.orgId, status: 'won' } }),
      prisma.deal.count({ where: { organizationId: ctx.orgId, status: 'lost' } })
    ]);
    const totalOpenValue = byStage.reduce((sum, s) => sum + s.value, 0);
    return {
      ok: true,
      summary: `Pipeline: ₹${totalOpenValue.toLocaleString('en-IN')} in open deals across ${byStage.length} stages. Won ${won}, lost ${lost}.`,
      data: { byStage, won, lost, totalOpenValue },
      link: '/pipeline'
    };
  },

  get_analytics_summary: async (_input, ctx) => {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000);
    const [total, byStatus, thisWeek, activeCampaigns] = await Promise.all([
      prisma.lead.count({ where: { organizationId: ctx.orgId, status: { not: 'DELETED' } } }),
      prisma.lead.groupBy({ by: ['status'], where: { organizationId: ctx.orgId, status: { not: 'DELETED' } }, _count: true }),
      prisma.lead.count({ where: { organizationId: ctx.orgId, createdAt: { gte: weekAgo }, status: { not: 'DELETED' } } }),
      prisma.campaign.count({ where: { organizationId: ctx.orgId, status: 'active' } })
    ]);
    return {
      ok: true,
      summary: `${total} leads total, ${thisWeek} new this week, ${activeCampaigns} active campaign(s).`,
      data: { total, thisWeek, activeCampaigns, byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })) },
      link: '/analytics'
    };
  }
};

export const executeTool = async (name: string, input: any, ctx: ToolContext): Promise<ToolResult> => {
  const handler = handlers[name];
  if (!handler) return { ok: false, summary: `Unknown tool: ${name}` };

  // Role gate: viewers get read-only access.
  if (isWriteTool(name) && ctx.role === 'VIEWER') {
    return { ok: false, summary: 'Your role is read-only, so I can look things up but not make changes.' };
  }

  try {
    return await handler(input, ctx);
  } catch (error) {
    console.error(`Assistant tool "${name}" failed:`, error);
    return { ok: false, summary: 'That action failed due to an internal error.' };
  }
};
