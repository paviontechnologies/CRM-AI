"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCampaignAnalytics = exports.enrollLeads = exports.addStep = exports.deleteCampaign = exports.updateCampaign = exports.createCampaign = exports.getCampaign = exports.getCampaigns = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const StepSchema = zod_1.z.object({
    type: zod_1.z.string(),
    dayOffset: zod_1.z.number().int().default(1),
    subject: zod_1.z.string().optional().nullable(),
    content: zod_1.z.string(),
    channel: zod_1.z.string().default('email'),
    condition: zod_1.z.string().optional().nullable(),
    orderIndex: zod_1.z.number().int().default(0)
});
const CampaignSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional().nullable(),
    targetNiche: zod_1.z.string().optional().nullable(),
    targetCity: zod_1.z.string().optional().nullable(),
    targetIndustry: zod_1.z.string().optional().nullable(),
    steps: zod_1.z.array(StepSchema).optional().default([])
});
const getCampaigns = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const campaigns = await prisma_1.prisma.campaign.findMany({
            where: { organizationId: orgId },
            include: {
                steps: { orderBy: { orderIndex: 'asc' } },
                _count: { select: { enrollments: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(campaigns);
    }
    catch (error) {
        console.error('Get campaigns error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getCampaigns = getCampaigns;
const getCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.orgId;
        const campaign = await prisma_1.prisma.campaign.findFirst({
            where: { id, organizationId: orgId },
            include: {
                steps: { orderBy: { orderIndex: 'asc' } },
                _count: { select: { enrollments: true } }
            }
        });
        if (!campaign)
            return res.status(404).json({ error: 'Campaign not found' });
        res.status(200).json(campaign);
    }
    catch (error) {
        console.error('Get campaign error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getCampaign = getCampaign;
const createCampaign = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const { steps, ...campaignData } = CampaignSchema.parse(req.body);
        const campaign = await prisma_1.prisma.campaign.create({
            data: {
                ...campaignData,
                organizationId: orgId,
                steps: {
                    create: steps.map((s, i) => ({ ...s, orderIndex: s.orderIndex ?? i }))
                }
            },
            include: { steps: { orderBy: { orderIndex: 'asc' } } }
        });
        res.status(201).json(campaign);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return res.status(400).json({ error: error.errors });
        console.error('Create campaign error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createCampaign = createCampaign;
const updateCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.orgId;
        const existing = await prisma_1.prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
        if (!existing)
            return res.status(404).json({ error: 'Campaign not found' });
        const allowed = ['name', 'description', 'status', 'targetNiche', 'targetCity', 'targetIndustry'];
        const data = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined)
                data[key] = req.body[key];
        }
        const campaign = await prisma_1.prisma.campaign.update({ where: { id }, data });
        res.status(200).json(campaign);
    }
    catch (error) {
        console.error('Update campaign error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateCampaign = updateCampaign;
const deleteCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.orgId;
        const existing = await prisma_1.prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
        if (!existing)
            return res.status(404).json({ error: 'Campaign not found' });
        await prisma_1.prisma.campaign.delete({ where: { id } });
        res.status(200).json({ message: 'Campaign deleted' });
    }
    catch (error) {
        console.error('Delete campaign error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteCampaign = deleteCampaign;
const addStep = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.orgId;
        const existing = await prisma_1.prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
        if (!existing)
            return res.status(404).json({ error: 'Campaign not found' });
        const stepData = StepSchema.parse(req.body);
        const step = await prisma_1.prisma.campaignStep.create({ data: { ...stepData, campaignId: id } });
        res.status(201).json(step);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return res.status(400).json({ error: error.errors });
        console.error('Add step error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.addStep = addStep;
const enrollLeads = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.orgId;
        const { leadIds } = req.body;
        if (!Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ error: 'leadIds array is required' });
        }
        const campaign = await prisma_1.prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
        if (!campaign)
            return res.status(404).json({ error: 'Campaign not found' });
        const existingEnrollments = await prisma_1.prisma.campaignEnrollment.findMany({
            where: { campaignId: id, leadId: { in: leadIds } },
            select: { leadId: true }
        });
        const alreadyEnrolled = new Set(existingEnrollments.map((e) => e.leadId));
        const newLeadIds = leadIds.filter((lid) => !alreadyEnrolled.has(lid));
        if (newLeadIds.length > 0) {
            await prisma_1.prisma.campaignEnrollment.createMany({
                data: newLeadIds.map((leadId) => ({
                    campaignId: id,
                    leadId,
                    status: 'active',
                    currentStep: 0,
                    nextRunAt: new Date()
                }))
            });
            await prisma_1.prisma.campaign.update({
                where: { id },
                data: { totalLeads: { increment: newLeadIds.length } }
            });
        }
        res.status(200).json({
            enrolled: newLeadIds.length,
            alreadyEnrolled: alreadyEnrolled.size,
            total: leadIds.length
        });
    }
    catch (error) {
        console.error('Enroll leads error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.enrollLeads = enrollLeads;
const getCampaignAnalytics = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.user.orgId;
        const campaign = await prisma_1.prisma.campaign.findFirst({ where: { id, organizationId: orgId } });
        if (!campaign)
            return res.status(404).json({ error: 'Campaign not found' });
        const enrollments = await prisma_1.prisma.campaignEnrollment.count({ where: { campaignId: id } });
        const activeEnrollments = await prisma_1.prisma.campaignEnrollment.count({
            where: { campaignId: id, status: 'active' }
        });
        const replyRate = campaign.sentCount > 0
            ? Math.round((campaign.replyCount / campaign.sentCount) * 100 * 10) / 10
            : 0;
        const openRate = campaign.sentCount > 0
            ? Math.round((campaign.openCount / campaign.sentCount) * 100 * 10) / 10
            : 0;
        res.status(200).json({
            sent: campaign.sentCount,
            replies: campaign.replyCount,
            opens: campaign.openCount,
            enrollments,
            activeEnrollments,
            replyRate,
            openRate
        });
    }
    catch (error) {
        console.error('Campaign analytics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getCampaignAnalytics = getCampaignAnalytics;
