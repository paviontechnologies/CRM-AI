"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLeadsAI = exports.generateOutreach = exports.scoreLeadAI = exports.updateLeadStatus = exports.importLeads = exports.deleteLead = exports.updateLead = exports.createLead = exports.getLead = exports.getLeads = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const aiService = __importStar(require("../services/ai.service"));
const LeadSchema = zod_1.z.object({
    companyName: zod_1.z.string().min(1),
    email: zod_1.z.string().email().optional().nullable(),
    phone: zod_1.z.string().optional().nullable(),
    website: zod_1.z.string().url().optional().nullable().or(zod_1.z.literal('')).transform(v => v || null),
    industry: zod_1.z.string().optional().nullable(),
    city: zod_1.z.string().optional().nullable(),
    country: zod_1.z.string().optional().nullable(),
    employeeSize: zod_1.z.string().optional().nullable(),
    contactName: zod_1.z.string().optional().nullable(),
    source: zod_1.z.string().optional().nullable(),
    revenue: zod_1.z.string().optional().nullable(),
    techStack: zod_1.z.string().optional().nullable(),
    fundingStage: zod_1.z.string().optional().nullable(),
    linkedinUrl: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
    tags: zod_1.z.string().optional().nullable(),
    priority: zod_1.z.string().optional().nullable(),
    expectedRevenue: zod_1.z.number().optional().nullable(),
    closeProbability: zod_1.z.number().int().min(0).max(100).optional().nullable()
});
const getLeads = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const { status, industry, city, search, page = '1', limit = '50' } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
        const skip = (pageNum - 1) * limitNum;
        const where = {
            organizationId: orgId,
            status: { not: 'Deleted' }
        };
        if (status)
            where.status = status;
        if (industry)
            where.industry = { contains: industry };
        if (city)
            where.city = { contains: city };
        if (search) {
            where.OR = [
                { companyName: { contains: search } },
                { contactName: { contains: search } },
                { email: { contains: search } },
                { city: { contains: search } }
            ];
        }
        const [leads, total] = await Promise.all([
            prisma_1.prisma.lead.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                include: {
                    assignedTo: { include: { user: { select: { id: true, name: true, email: true } } } },
                    scores: { orderBy: { createdAt: 'desc' }, take: 1 }
                }
            }),
            prisma_1.prisma.lead.count({ where })
        ]);
        res.status(200).json({
            leads,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum)
        });
    }
    catch (error) {
        console.error('Get leads error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getLeads = getLeads;
const getLead = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.orgId;
        const lead = await prisma_1.prisma.lead.findFirst({
            where: { id, organizationId: orgId },
            include: {
                scores: { orderBy: { createdAt: 'desc' } },
                activities: { orderBy: { createdAt: 'desc' }, take: 20 },
                messages: { orderBy: { createdAt: 'desc' }, take: 20 },
                assignedTo: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
                pipelineStageLeads: { include: { stage: { include: { pipeline: true } } } }
            }
        });
        if (!lead)
            return res.status(404).json({ error: 'Lead not found' });
        res.status(200).json(lead);
    }
    catch (error) {
        console.error('Get lead error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getLead = getLead;
const createLead = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const body = LeadSchema.parse(req.body);
        // Deduplicate by email + orgId
        if (body.email) {
            const existing = await prisma_1.prisma.lead.findFirst({
                where: { organizationId: orgId, email: body.email, status: { not: 'Deleted' } }
            });
            if (existing) {
                return res.status(409).json({ error: 'Lead with this email already exists', lead: existing });
            }
        }
        const lead = await prisma_1.prisma.lead.create({
            data: { ...body, organizationId: orgId }
        });
        await prisma_1.prisma.usageLog.create({
            data: { organizationId: orgId, type: 'lead_import', amount: 1, metadata: JSON.stringify({ leadId: lead.id }) }
        });
        await prisma_1.prisma.organization.update({
            where: { id: orgId },
            data: { usedLeadCredits: { increment: 1 } }
        });
        res.status(201).json(lead);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return res.status(400).json({ error: error.errors });
        console.error('Create lead error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createLead = createLead;
const updateLead = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.orgId;
        const existing = await prisma_1.prisma.lead.findFirst({ where: { id, organizationId: orgId } });
        if (!existing)
            return res.status(404).json({ error: 'Lead not found' });
        const lead = await prisma_1.prisma.lead.update({
            where: { id },
            data: { ...req.body, organizationId: undefined, id: undefined }
        });
        res.status(200).json(lead);
    }
    catch (error) {
        console.error('Update lead error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateLead = updateLead;
const deleteLead = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.orgId;
        const existing = await prisma_1.prisma.lead.findFirst({ where: { id, organizationId: orgId } });
        if (!existing)
            return res.status(404).json({ error: 'Lead not found' });
        await prisma_1.prisma.lead.update({ where: { id }, data: { status: 'Deleted' } });
        res.status(200).json({ message: 'Lead deleted' });
    }
    catch (error) {
        console.error('Delete lead error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteLead = deleteLead;
const importLeads = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const { leads: rawLeads } = req.body;
        if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
            return res.status(400).json({ error: 'leads array is required' });
        }
        const existingEmails = await prisma_1.prisma.lead.findMany({
            where: { organizationId: orgId, status: { not: 'Deleted' }, email: { not: null } },
            select: { email: true }
        });
        const emailSet = new Set(existingEmails.map((l) => l.email));
        const toCreate = [];
        const duplicates = [];
        for (const raw of rawLeads) {
            const parsed = LeadSchema.safeParse(raw);
            if (!parsed.success)
                continue;
            const data = parsed.data;
            if (data.email && emailSet.has(data.email)) {
                duplicates.push(data.email);
                continue;
            }
            toCreate.push({ ...data, organizationId: orgId });
            if (data.email)
                emailSet.add(data.email);
        }
        if (toCreate.length > 0) {
            await prisma_1.prisma.lead.createMany({ data: toCreate });
            await prisma_1.prisma.usageLog.create({
                data: { organizationId: orgId, type: 'lead_import', amount: toCreate.length }
            });
            await prisma_1.prisma.organization.update({
                where: { id: orgId },
                data: { usedLeadCredits: { increment: toCreate.length } }
            });
        }
        res.status(200).json({ created: toCreate.length, duplicates: duplicates.length });
    }
    catch (error) {
        console.error('Import leads error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.importLeads = importLeads;
const updateLeadStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.orgId;
        const { status } = req.body;
        if (!status)
            return res.status(400).json({ error: 'Status is required' });
        const existing = await prisma_1.prisma.lead.findFirst({ where: { id, organizationId: orgId } });
        if (!existing)
            return res.status(404).json({ error: 'Lead not found' });
        const lead = await prisma_1.prisma.lead.update({ where: { id }, data: { status } });
        res.status(200).json(lead);
    }
    catch (error) {
        console.error('Update lead status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateLeadStatus = updateLeadStatus;
const scoreLeadAI = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.orgId;
        const lead = await prisma_1.prisma.lead.findFirst({ where: { id, organizationId: orgId } });
        if (!lead)
            return res.status(404).json({ error: 'Lead not found' });
        const analysis = await aiService.scoreLeadIntent({
            companyName: lead.companyName,
            industry: lead.industry,
            city: lead.city,
            website: lead.website,
            source: lead.source,
            techStack: lead.techStack,
            employeeSize: lead.employeeSize
        });
        const scoreRecord = await prisma_1.prisma.leadScore.create({
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
        const updatedLead = await prisma_1.prisma.lead.update({
            where: { id },
            data: { intentScore: analysis.intentScore, icpScore: analysis.icpScore }
        });
        await prisma_1.prisma.usageLog.create({
            data: { organizationId: orgId, type: 'ai_credit', amount: 1, metadata: JSON.stringify({ leadId: id }) }
        });
        await prisma_1.prisma.organization.update({
            where: { id: orgId },
            data: { usedAiCredits: { increment: 1 } }
        });
        res.status(200).json({ lead: updatedLead, score: scoreRecord, analysis });
    }
    catch (error) {
        console.error('Score lead AI error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.scoreLeadAI = scoreLeadAI;
const generateOutreach = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.orgId;
        const { channel = 'email', templateType } = req.body;
        const lead = await prisma_1.prisma.lead.findFirst({ where: { id, organizationId: orgId } });
        if (!lead)
            return res.status(404).json({ error: 'Lead not found' });
        const result = await aiService.generateOutreach({
            companyName: lead.companyName,
            industry: lead.industry,
            city: lead.city,
            contactName: lead.contactName,
            intentScore: lead.intentScore,
            website: lead.website,
        }, channel, templateType);
        await prisma_1.prisma.usageLog.create({
            data: { organizationId: orgId, type: 'ai_credit', amount: 1, metadata: JSON.stringify({ action: 'outreach', leadId: id, channel }) }
        });
        res.status(200).json({ subject: result.subject, body: result.body });
    }
    catch (error) {
        console.error('Generate outreach error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.generateOutreach = generateOutreach;
// POST /api/leads/generate  — AI lead generator
const generateLeadsAI = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const { industry, city, country, count = 10, employeeSize, keywords } = req.body;
        if (!industry || !city) {
            return res.status(400).json({ error: 'industry and city are required' });
        }
        const generated = await aiService.generateLeads({ industry, city, country, count, employeeSize, keywords });
        // Dedup against existing org leads by email
        const existingEmails = new Set((await prisma_1.prisma.lead.findMany({
            where: { organizationId: orgId, status: { not: 'Deleted' }, email: { not: null } },
            select: { email: true },
        })).map(l => l.email));
        const toCreate = generated.filter(l => !l.email || !existingEmails.has(l.email));
        let created = 0;
        const savedLeads = [];
        for (const lead of toCreate) {
            const saved = await prisma_1.prisma.lead.create({
                data: { ...lead, organizationId: orgId, status: 'New' }
            });
            savedLeads.push(saved);
            created++;
        }
        if (created > 0) {
            await prisma_1.prisma.usageLog.create({
                data: { organizationId: orgId, type: 'lead_import', amount: created }
            });
            await prisma_1.prisma.organization.update({
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
    }
    catch (error) {
        console.error('Generate leads AI error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.generateLeadsAI = generateLeadsAI;
