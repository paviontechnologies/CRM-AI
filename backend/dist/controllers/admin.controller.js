"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleFeature = exports.deleteNicheTemplate = exports.updateNicheTemplate = exports.createNicheTemplate = exports.getNicheTemplates = exports.getSystemStats = exports.getAllUsers = exports.getAllOrgs = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const templateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    niche: zod_1.z.string().min(1),
    channel: zod_1.z.string().min(1),
    subject: zod_1.z.string().optional().nullable(),
    content: zod_1.z.string().min(1),
    isDefault: zod_1.z.boolean().default(true)
});
const getAllOrgs = async (_req, res) => {
    try {
        const orgs = await prisma_1.prisma.organization.findMany({
            include: {
                _count: { select: { members: true, leads: true, campaigns: true } },
                subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(orgs);
    }
    catch (error) {
        console.error('Get all orgs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllOrgs = getAllOrgs;
const getAllUsers = async (_req, res) => {
    try {
        const users = await prisma_1.prisma.user.findMany({
            include: {
                teamMembers: {
                    include: { organization: { select: { id: true, name: true, slug: true, subscription: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const sanitized = users.map(({ passwordHash, refreshToken, otpCode, ...u }) => u);
        res.status(200).json(sanitized);
    }
    catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllUsers = getAllUsers;
const getSystemStats = async (_req, res) => {
    try {
        const [totalUsers, totalOrgs, totalLeads, totalCampaigns, totalMessages] = await Promise.all([
            prisma_1.prisma.user.count(),
            prisma_1.prisma.organization.count(),
            prisma_1.prisma.lead.count({ where: { status: { not: 'Deleted' } } }),
            prisma_1.prisma.campaign.count(),
            prisma_1.prisma.message.count()
        ]);
        const recentLeads = await prisma_1.prisma.lead.count({
            where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
        });
        const recentUsers = await prisma_1.prisma.user.count({
            where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
        });
        res.status(200).json({
            totalUsers,
            totalOrgs,
            totalLeads,
            totalCampaigns,
            totalMessages,
            recentLeads,
            recentUsers
        });
    }
    catch (error) {
        console.error('System stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getSystemStats = getSystemStats;
const getNicheTemplates = async (_req, res) => {
    try {
        const templates = await prisma_1.prisma.nicheTemplate.findMany({
            orderBy: [{ niche: 'asc' }, { channel: 'asc' }]
        });
        res.status(200).json(templates);
    }
    catch (error) {
        console.error('Get niche templates error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getNicheTemplates = getNicheTemplates;
const createNicheTemplate = async (req, res) => {
    try {
        const data = templateSchema.parse(req.body);
        const template = await prisma_1.prisma.nicheTemplate.create({ data });
        res.status(201).json(template);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return res.status(400).json({ error: error.errors });
        console.error('Create template error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createNicheTemplate = createNicheTemplate;
const updateNicheTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.prisma.nicheTemplate.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Template not found' });
        const data = templateSchema.partial().parse(req.body);
        const template = await prisma_1.prisma.nicheTemplate.update({ where: { id }, data });
        res.status(200).json(template);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return res.status(400).json({ error: error.errors });
        console.error('Update template error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateNicheTemplate = updateNicheTemplate;
const deleteNicheTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.prisma.nicheTemplate.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Template not found' });
        await prisma_1.prisma.nicheTemplate.delete({ where: { id } });
        res.status(200).json({ message: 'Template deleted' });
    }
    catch (error) {
        console.error('Delete template error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteNicheTemplate = deleteNicheTemplate;
const toggleFeature = async (req, res) => {
    try {
        const { feature, enabled } = req.body;
        if (!feature)
            return res.status(400).json({ error: 'feature is required' });
        const key = `FEATURE_${feature.toString().toUpperCase()}`;
        process.env[key] = enabled ? 'true' : 'false';
        res.status(200).json({ feature, enabled, key });
    }
    catch (error) {
        console.error('Toggle feature error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.toggleFeature = toggleFeature;
