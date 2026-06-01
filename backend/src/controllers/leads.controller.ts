import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as aiService from '../services/ai.service';

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

export const getLeads = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const { status, industry, city, search, page = '1', limit = '50' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      organizationId: orgId,
      status: { not: 'Deleted' }
    };

    if (status) where.status = status;
    if (industry) where.industry = { contains: industry };
    if (city) where.city = { contains: city };
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { contactName: { contains: search } },
        { email: { contains: search } },
        { city: { contains: search } }
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { include: { user: { select: { id: true, name: true, email: true } } } },
          scores: { orderBy: { createdAt: 'desc' }, take: 1 }
        }
      }),
      prisma.lead.count({ where })
    ]);

    res.status(200).json({
      leads,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const lead = await prisma.lead.findFirst({
      where: { id, organizationId: orgId },
      include: {
        scores: { orderBy: { createdAt: 'desc' } },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
        messages: { orderBy: { createdAt: 'desc' }, take: 20 },
        assignedTo: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        pipelineStageLeads: { include: { stage: { include: { pipeline: true } } } }
      }
    });

    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.status(200).json(lead);
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createLead = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const body = LeadSchema.parse(req.body);

    // Deduplicate by email + orgId
    if (body.email) {
      const existing = await prisma.lead.findFirst({
        where: { organizationId: orgId, email: body.email, status: { not: 'Deleted' } }
      });
      if (existing) {
        return res.status(409).json({ error: 'Lead with this email already exists', lead: existing });
      }
    }

    const lead = await prisma.lead.create({
      data: { ...body, organizationId: orgId }
    });

    await prisma.usageLog.create({
      data: { organizationId: orgId, type: 'lead_import', amount: 1, metadata: JSON.stringify({ leadId: lead.id }) }
    });

    await prisma.organization.update({
      where: { id: orgId },
      data: { usedLeadCredits: { increment: 1 } }
    });

    res.status(201).json(lead);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateLead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const existing = await prisma.lead.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return res.status(404).json({ error: 'Lead not found' });

    const lead = await prisma.lead.update({
      where: { id },
      data: { ...req.body, organizationId: undefined, id: undefined }
    });

    res.status(200).json(lead);
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteLead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const existing = await prisma.lead.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return res.status(404).json({ error: 'Lead not found' });

    await prisma.lead.update({ where: { id }, data: { status: 'Deleted' } });
    res.status(200).json({ message: 'Lead deleted' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const importLeads = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const { leads: rawLeads } = req.body;

    if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
      return res.status(400).json({ error: 'leads array is required' });
    }

    const existingEmails = await prisma.lead.findMany({
      where: { organizationId: orgId, status: { not: 'Deleted' }, email: { not: null } },
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

    res.status(200).json({ created: toCreate.length, duplicates: duplicates.length });
  } catch (error) {
    console.error('Import leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateLeadStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required' });

    const existing = await prisma.lead.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return res.status(404).json({ error: 'Lead not found' });

    const lead = await prisma.lead.update({ where: { id }, data: { status } });
    res.status(200).json(lead);
  } catch (error) {
    console.error('Update lead status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const scoreLeadAI = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const lead = await prisma.lead.findFirst({ where: { id, organizationId: orgId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const analysis = await aiService.scoreLeadIntent({
      companyName: lead.companyName,
      industry: lead.industry,
      city: lead.city,
      website: lead.website,
      source: lead.source,
      techStack: lead.techStack,
      employeeSize: lead.employeeSize
    });

    const scoreRecord = await prisma.leadScore.create({
      data: {
        leadId: lead.id,
        score: analysis.intentScore,
        icpScore: analysis.icpScore,
        urgency: analysis.urgency,
        budgetScore: analysis.budgetScore,
        reasons: Array.isArray(analysis.reasons) ? analysis.reasons.join(' | ') : String(analysis.reasons),
        recommendation: analysis.recommendation
      }
    });

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: { intentScore: analysis.intentScore, icpScore: analysis.icpScore }
    });

    await prisma.usageLog.create({
      data: { organizationId: orgId, type: 'ai_credit', amount: 1, metadata: JSON.stringify({ leadId: id }) }
    });

    await prisma.organization.update({
      where: { id: orgId },
      data: { usedAiCredits: { increment: 1 } }
    });

    res.status(200).json({ lead: updatedLead, score: scoreRecord, analysis });
  } catch (error) {
    console.error('Score lead AI error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const generateOutreach = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;
    const { channel = 'email', templateType } = req.body;

    const lead = await prisma.lead.findFirst({ where: { id, organizationId: orgId } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const result = await aiService.generateOutreach(
      {
        companyName: lead.companyName,
        industry: lead.industry,
        city: lead.city,
        contactName: lead.contactName,
        intentScore: lead.intentScore,
        website: lead.website,
      },
      channel as 'email' | 'whatsapp' | 'linkedin' | 'sms',
      templateType
    );

    await prisma.usageLog.create({
      data: { organizationId: orgId, type: 'ai_credit', amount: 1, metadata: JSON.stringify({ action: 'outreach', leadId: id, channel }) }
    });

    res.status(200).json({ subject: result.subject, body: result.body });
  } catch (error) {
    console.error('Generate outreach error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/leads/generate  — AI lead generator
export const generateLeadsAI = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const { industry, city, country, count = 10, employeeSize, keywords } = req.body;

    if (!industry || !city) {
      return res.status(400).json({ error: 'industry and city are required' });
    }

    const generated = await aiService.generateLeads({ industry, city, country, count, employeeSize, keywords });

    // Dedup against existing org leads by email
    const existingEmails = new Set(
      (await prisma.lead.findMany({
        where: { organizationId: orgId, status: { not: 'Deleted' }, email: { not: null } },
        select: { email: true },
      })).map(l => l.email)
    );

    const toCreate = generated.filter(l => !l.email || !existingEmails.has(l.email));
    let created = 0;
    const savedLeads: any[] = [];

    for (const lead of toCreate) {
      const saved = await prisma.lead.create({
        data: { ...lead, organizationId: orgId, status: 'New' }
      });
      savedLeads.push(saved);
      created++;
    }

    if (created > 0) {
      await prisma.usageLog.create({
        data: { organizationId: orgId, type: 'lead_import', amount: created }
      });
      await prisma.organization.update({
        where: { id: orgId },
        data: { usedLeadCredits: { increment: created } }
      });
    }

    res.status(200).json({
      message: `Generated ${created} new leads`,
      created,
      duplicatesSkipped: generated.length - created,
      leads: savedLeads,
    });
  } catch (error) {
    console.error('Generate leads AI error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
