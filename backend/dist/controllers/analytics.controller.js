"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeeklyLeads = exports.getActivityTimeline = exports.getCampaignPerformance = exports.getLeadsByStatus = exports.getLeadsByIndustry = exports.getLeadsBySource = exports.getDashboardStats = void 0;
const prisma_1 = require("../lib/prisma");
const getDashboardStats = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        const [totalLeads, hotLeads, campaigns, totalMessages, thisWeekLeads, closedWon, closedTotal] = await Promise.all([
            prisma_1.prisma.lead.count({ where: { organizationId: orgId, status: { not: 'Deleted' } } }),
            prisma_1.prisma.lead.count({
                where: { organizationId: orgId, intentScore: { gte: 80 }, status: { not: 'Deleted' } }
            }),
            prisma_1.prisma.campaign.count({ where: { organizationId: orgId } }),
            prisma_1.prisma.message.count({
                where: { lead: { organizationId: orgId }, direction: 'inbound' }
            }),
            prisma_1.prisma.lead.count({
                where: { organizationId: orgId, createdAt: { gte: weekStart }, status: { not: 'Deleted' } }
            }),
            prisma_1.prisma.pipelineStageLead.count({
                where: { stage: { pipeline: { organizationId: orgId }, name: 'Closed Won' } }
            }),
            prisma_1.prisma.pipelineStageLead.count({
                where: {
                    stage: {
                        pipeline: { organizationId: orgId },
                        name: { in: ['Closed Won', 'Closed Lost'] }
                    }
                }
            })
        ]);
        const replyRate = totalLeads > 0 ? Math.round((totalMessages / totalLeads) * 100) : 0;
        const conversionRate = closedTotal > 0 ? Math.round((closedWon / closedTotal) * 100) : 0;
        res.status(200).json({
            totalLeads,
            hotLeads,
            campaigns,
            replyRate,
            thisWeekLeads,
            conversionRate,
            totalMessages
        });
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getDashboardStats = getDashboardStats;
const getLeadsBySource = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const groups = await prisma_1.prisma.lead.groupBy({
            by: ['source'],
            where: { organizationId: orgId, status: { not: 'Deleted' } },
            _count: { source: true }
        });
        const result = groups.map((g) => ({
            source: g.source || 'unknown',
            count: g._count.source
        }));
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Leads by source error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getLeadsBySource = getLeadsBySource;
const getLeadsByIndustry = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const groups = await prisma_1.prisma.lead.groupBy({
            by: ['industry'],
            where: { organizationId: orgId, status: { not: 'Deleted' } },
            _count: { industry: true },
            orderBy: { _count: { industry: 'desc' } },
            take: 10
        });
        const result = groups.map((g) => ({
            industry: g.industry || 'Other',
            count: g._count.industry
        }));
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Leads by industry error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getLeadsByIndustry = getLeadsByIndustry;
const getLeadsByStatus = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const groups = await prisma_1.prisma.lead.groupBy({
            by: ['status'],
            where: { organizationId: orgId, status: { not: 'Deleted' } },
            _count: { status: true }
        });
        const result = groups.map((g) => ({
            status: g.status,
            count: g._count.status
        }));
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Leads by status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getLeadsByStatus = getLeadsByStatus;
const getCampaignPerformance = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const campaigns = await prisma_1.prisma.campaign.findMany({
            where: { organizationId: orgId },
            include: { _count: { select: { enrollments: true } } },
            orderBy: { createdAt: 'desc' }
        });
        const result = campaigns.map((c) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            sent: c.sentCount,
            replies: c.replyCount,
            opens: c.openCount,
            enrollments: c._count.enrollments,
            replyRate: c.sentCount > 0 ? Math.round((c.replyCount / c.sentCount) * 100 * 10) / 10 : 0,
            openRate: c.sentCount > 0 ? Math.round((c.openCount / c.sentCount) * 100 * 10) / 10 : 0
        }));
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Campaign performance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getCampaignPerformance = getCampaignPerformance;
const getActivityTimeline = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const activities = await prisma_1.prisma.activity.findMany({
            where: { lead: { organizationId: orgId } },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                lead: { select: { id: true, companyName: true, contactName: true } }
            }
        });
        res.status(200).json(activities);
    }
    catch (error) {
        console.error('Activity timeline error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getActivityTimeline = getActivityTimeline;
const getWeeklyLeads = async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const days = 7;
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
            const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
            const count = await prisma_1.prisma.lead.count({
                where: {
                    organizationId: orgId,
                    status: { not: 'Deleted' },
                    createdAt: { gte: start, lte: end }
                }
            });
            result.push({
                date: start.toISOString().split('T')[0],
                count
            });
        }
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Weekly leads error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getWeeklyLeads = getWeeklyLeads;
