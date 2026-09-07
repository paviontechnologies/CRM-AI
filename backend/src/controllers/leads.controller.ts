import { prisma } from '../lib/prisma';
import { z } from 'zod';
import * as aiService from '../services/ai.service';
import { logActivity, getUserIdForMember, notify } from '../lib/notify';
import type { AppContext } from '../types';

const LeadSchema = z.object({
  companyName: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal('')).transform(v => v || null),
  industry: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  employeeSize: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  revenue: z.string().optional().nullable(),
  techStack: z.string().optional().nullable(),
  fundingStage: z.string().optional().nullable(),
  linkedinUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  priority: z.string().optional().nullable(),
  expectedRevenue: z.number().optional().nullable(),
  closeProbability: z.number().int().min(0).max(100).optional().nullable()
});

export const getLeads = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const status = c.req.query('status');
  const industry = c.req.query('industry');
  const city = c.req.query('city');
  const search = c.req.query('search');
  const page = c.req.query('page') || '1';
  const limit = c.req.query('limit') || '50';
  const sortBy = c.req.query('sortBy');
  const sortDir = c.req.query('sortDir');

  const sortField = sortBy && ['createdAt', 'intentScore', 'companyName', 'updatedAt'].includes(sortBy) ? sortBy : 'createdAt';
  const sortOrder = sortDir === 'asc' ? 'asc' : 'desc';

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const where: any = {
    organizationId: orgId,
    status: { not: 'DELETED' }
  };

  if (status) where.status = status;
  if (industry) where.industry = { contains: industry, mode: 'insensitive' };
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sortField]: sortOrder },
      include: {
        assignedTo: { include: { user: { select: { id: true, name: true, email: true } } } },
        scores: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    }),
    prisma.lead.count({ where })
  ]);

  return c.json({
    leads,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum)
  });
};

export const getLead = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;

  const lead = await prisma.lead.findFirst({
    where: { id, organizationId: orgId },
    include: {
      scores: { orderBy: { createdAt: 'desc' } },
      activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      messages: { orderBy: { createdAt: 'desc' }, take: 20 },
      assignedTo: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      deals: { include: { stage: true }, orderBy: { createdAt: 'desc' } },
      tasks: { orderBy: { createdAt: 'desc' } },
      noteEntries: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
      attachments: { orderBy: { createdAt: 'desc' } }
    }
  });

  if (!lead) return c.json({ error: 'Lead not found' }, 404);
  return c.json(lead);
};

export const createLead = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const body = LeadSchema.parse(await c.req.json());

  // Deduplicate by email + orgId
  if (body.email) {
    const existing = await prisma.lead.findFirst({
      where: { organizationId: orgId, email: body.email, status: { not: 'DELETED' } }
    });
    if (existing) {
      return c.json({ error: 'Lead with this email already exists', lead: existing }, 409);
    }
  }

  const lead = await prisma.lead.create({
    data: { ...body, organizationId: orgId }
  });

  await logActivity(lead.id, 'lead_created', `Lead created: ${lead.companyName}`, {
    source: lead.source
  });

  await prisma.usageLog.create({
    data: { organizationId: orgId, type: 'lead_import', amount: 1, metadata: JSON.stringify({ leadId: lead.id }) }
  });

  await prisma.organization.update({
    where: { id: orgId },
    data: { usedLeadCredits: { increment: 1 } }
  });

  return c.json(lead, 201);
};

// Fields a user is allowed to edit. Scores (intentScore/icpScore) are excluded on
// purpose — those are AI-owned and must not be settable from the client.
const UpdatableLeadSchema = LeadSchema.partial().extend({
  status: z.string().optional(),
  assignedToId: z.string().optional().nullable()
});

export const updateLead = async (c: AppContext) => {
  const id = c.req.param('id');
  const { userId, orgId } = c.get('user');

  const existing = await prisma.lead.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return c.json({ error: 'Lead not found' }, 404);

  const body = UpdatableLeadSchema.parse(await c.req.json());

  if (body.assignedToId) {
    const member = await prisma.teamMember.findFirst({
      where: { id: body.assignedToId, organizationId: orgId }
    });
    if (!member) return c.json({ error: 'Assignee not found in this organization' }, 404);
  }

  const lead = await prisma.lead.update({ where: { id }, data: body });

  if (body.status && body.status !== existing.status) {
    await logActivity(lead.id, 'status_change', `Status changed ${existing.status} → ${body.status}`, {
      from: existing.status,
      to: body.status
    });
  }

  if (body.assignedToId !== undefined && body.assignedToId !== existing.assignedToId) {
    await logActivity(lead.id, 'assignment', `Lead reassigned`, { assignedToId: body.assignedToId });

    if (body.assignedToId) {
      const assigneeUserId = await getUserIdForMember(body.assignedToId, orgId);
      if (assigneeUserId && assigneeUserId !== userId) {
        await notify({
          organizationId: orgId,
          userId: assigneeUserId,
          type: 'lead_assigned',
          title: 'A lead was assigned to you',
          body: lead.companyName,
          link: `/leads/${lead.id}`
        });
      }
    }
  }

  return c.json(lead);
};

export const deleteLead = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;

  const existing = await prisma.lead.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return c.json({ error: 'Lead not found' }, 404);

  await prisma.lead.update({ where: { id }, data: { status: 'DELETED' } });
  return c.json({ message: 'Lead deleted' });
};

export const importLeads = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const { leads: rawLeads } = await c.req.json();

  if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
    return c.json({ error: 'leads array is required' }, 400);
  }

  const existingEmails = await prisma.lead.findMany({
    where: { organizationId: orgId, status: { not: 'DELETED' }, email: { not: null } },
    select: { email: true }
  });
  const emailSet = new Set(existingEmails.map((l) => l.email));

  const toCreate: any[] = [];
  const duplicates: any[] = [];

  for (const raw of rawLeads) {
    const parsed = LeadSchema.safeParse(raw);
    if (!parsed.success) continue;
    const data = parsed.data;
    if (data.email && emailSet.has(data.email)) {
      duplicates.push(data.email);
      continue;
    }
    toCreate.push({ ...data, organizationId: orgId });
    if (data.email) emailSet.add(data.email);
  }

  if (toCreate.length > 0) {
    await prisma.lead.createMany({ data: toCreate });
    await prisma.usageLog.create({
      data: { organizationId: orgId, type: 'lead_import', amount: toCreate.length }
    });
    await prisma.organization.update({
      where: { id: orgId },
      data: { usedLeadCredits: { increment: toCreate.length } }
    });
  }

  return c.json({ created: toCreate.length, duplicates: duplicates.length });
};

export const updateLeadStatus = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;
  const { status } = await c.req.json();

  if (!status) return c.json({ error: 'Status is required' }, 400);

  const existing = await prisma.lead.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return c.json({ error: 'Lead not found' }, 404);

  const lead = await prisma.lead.update({ where: { id }, data: { status } });

  if (status !== existing.status) {
    await logActivity(lead.id, 'status_change', `Status changed ${existing.status} → ${status}`, {
      from: existing.status,
      to: status
    });
  }

  return c.json(lead);
};

export const scoreLeadAI = async (c: AppContext) => {
  const id = c.req.param('id')!;
  const orgId = c.get('user').orgId;

  const lead = await prisma.lead.findFirst({ where: { id, organizationId: orgId } });
  if (!lead) return c.json({ error: 'Lead not found' }, 404);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { aiQualificationPrompt: true }
  });

  // Firmographics go to the model; engagement history is scored deterministically
  // on top, so the same behaviour always moves the number the same way.
  const [base, behavior] = await Promise.all([
    aiService.scoreLeadIntent(
      {
        companyName: lead.companyName,
        industry: lead.industry,
        city: lead.city,
        website: lead.website,
        source: lead.source,
        techStack: lead.techStack,
        employeeSize: lead.employeeSize
      },
      org?.aiQualificationPrompt
    ),
    aiService.collectLeadBehavior(id, orgId)
  ]);

  const baseReasons: string[] = Array.isArray(base.reasons)
    ? base.reasons
    : [String(base.reasons)];

  const adjusted = behavior
    ? aiService.applyBehavioralSignals(base.intentScore, behavior)
    : { intentScore: base.intentScore, reasons: [] };

  const analysis = {
    ...base,
    intentScore: adjusted.intentScore,
    reasons: [...baseReasons, ...adjusted.reasons],
    behavior
  };

  const scoreRecord = await prisma.leadScore.create({
    data: {
      leadId: lead.id,
      score: analysis.intentScore,
      icpScore: analysis.icpScore,
      urgency: analysis.urgency,
      budgetScore: analysis.budgetScore,
      reasons: analysis.reasons.join(' | '),
      recommendation: analysis.recommendation
    }
  });

  const updatedLead = await prisma.lead.update({
    where: { id },
    data: { intentScore: analysis.intentScore, icpScore: analysis.icpScore }
  });

  await logActivity(
    lead.id,
    'ai_scored',
    `AI scored this lead ${analysis.intentScore}/100`,
    { intentScore: analysis.intentScore, icpScore: analysis.icpScore }
  );

  await prisma.usageLog.create({
    data: { organizationId: orgId, type: 'ai_credit', amount: 1, metadata: JSON.stringify({ leadId: id }) }
  });

  await prisma.organization.update({
    where: { id: orgId },
    data: { usedAiCredits: { increment: 1 } }
  });

  return c.json({ lead: updatedLead, score: scoreRecord, analysis });
};

export const generateOutreach = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;
  const { channel = 'email', templateType } = await c.req.json();

  const lead = await prisma.lead.findFirst({ where: { id, organizationId: orgId } });
  if (!lead) return c.json({ error: 'Lead not found' }, 404);

  const result = await aiService.generateOutreach(
    {
      companyName: lead.companyName,
      industry: lead.industry,
      city: lead.city,
      contactName: lead.contactName,
      intentScore: lead.intentScore,
      website: lead.website,
    },
    channel as 'email' | 'linkedin' | 'sms',
    templateType
  );

  // Persist the draft so it shows on the lead timeline and can be sent later.
  const message = await prisma.message.create({
    data: {
      leadId: lead.id,
      direction: 'outbound',
      channel,
      subject: result.subject ?? null,
      body: result.body,
      status: 'draft'
    }
  });

  await logActivity(lead.id, 'outreach_drafted', `AI drafted a ${channel} message`, {
    messageId: message.id,
    channel
  });

  await prisma.usageLog.create({
    data: { organizationId: orgId, type: 'ai_credit', amount: 1, metadata: JSON.stringify({ action: 'outreach', leadId: id, channel }) }
  });

  await prisma.organization.update({
    where: { id: orgId },
    data: { usedAiCredits: { increment: 1 } }
  });

  return c.json({ id: message.id, subject: result.subject, body: result.body });
};

// POST /api/leads/outreach/preview — draft outreach for an ad-hoc company without
// persisting a lead. Used by the AI Templates playground.
export const previewOutreach = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const { companyName, contactName, city, industry, channel = 'email', templateType } = await c.req.json();

  if (!companyName) return c.json({ error: 'companyName is required' }, 400);

  const result = await aiService.generateOutreach(
    { companyName, industry, city, contactName, intentScore: null, website: null },
    channel as 'email' | 'linkedin' | 'sms',
    templateType
  );

  await prisma.usageLog.create({
    data: {
      organizationId: orgId,
      type: 'ai_credit',
      amount: 1,
      metadata: JSON.stringify({ action: 'outreach_preview', channel })
    }
  });

  await prisma.organization.update({
    where: { id: orgId },
    data: { usedAiCredits: { increment: 1 } }
  });

  return c.json({ subject: result.subject, body: result.body });
};

// POST /api/leads/generate  — AI lead suggestions (NOT real leads)
// These are AI-hinted suggestions that the user must review/approve before saving.
export const generateLeadsAI = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const { industry, city, country, count = 10, employeeSize, keywords } = await c.req.json();

  if (!industry || !city) {
    return c.json({ error: 'industry and city are required' }, 400);
  }

  const generated = await aiService.generateLeads({ industry, city, country, count, employeeSize, keywords });

  await prisma.usageLog.create({
    data: {
      organizationId: orgId,
      type: 'ai_credit',
      amount: 1,
      metadata: JSON.stringify({ action: 'lead_suggestions', industry, city, count: generated.length })
    }
  });
  await prisma.organization.update({
    where: { id: orgId },
    data: { usedAiCredits: { increment: 1 } }
  });

  // Suggestions only — nothing is persisted as a Lead here. The model invents
  // these companies, so a human picks which (if any) become real records.
  return c.json({
    suggestions: generated,
    total: generated.length,
    unverified: true
  });
};

// POST /api/leads/suggestions/approve — save approved AI suggestions as real leads
export const approveSuggestions = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const { leads: suggestions } = await c.req.json();

  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return c.json({ error: 'leads array is required' }, 400);
  }

  const existingEmails = new Set(
    (await prisma.lead.findMany({
      where: { organizationId: orgId, status: { not: 'DELETED' }, email: { not: null } },
      select: { email: true },
    })).map(l => l.email)
  );

  const toCreate: any[] = [];
  const duplicates: string[] = [];

  for (const raw of suggestions) {
    const parsed = LeadSchema.safeParse(raw);
    if (!parsed.success) continue;
    const data = parsed.data;
    if (data.email && existingEmails.has(data.email)) {
      duplicates.push(data.email);
      continue;
    }
    toCreate.push({ ...data, organizationId: orgId, status: 'NEW' });
    if (data.email) existingEmails.add(data.email);
  }

  let createdLeads: any[] = [];
  if (toCreate.length > 0) {
    createdLeads = await Promise.all(
      toCreate.map((data) => prisma.lead.create({ data }))
    );
    await prisma.usageLog.create({
      data: { organizationId: orgId, type: 'lead_import', amount: toCreate.length }
    });
    await prisma.organization.update({
      where: { id: orgId },
      data: { usedLeadCredits: { increment: toCreate.length } }
    });

    // Log activity for each new lead
    for (const lead of createdLeads) {
      await logActivity(lead.id, 'lead_created', `Lead created: ${lead.companyName}`, {
        source: lead.source
      });
    }
  }

  return c.json({
    created: createdLeads.length,
    duplicates: duplicates.length,
    leads: createdLeads,
  }, 201);
};
