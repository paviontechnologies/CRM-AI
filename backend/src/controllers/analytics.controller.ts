import { prisma } from '../lib/prisma';
import type { AppContext } from '../types';

export const getDashboardStats = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const [totalLeads, hotLeads, campaigns, totalMessages, thisWeekLeads, closedWon, closedTotal] =
    await Promise.all([
      prisma.lead.count({ where: { organizationId: orgId, status: { not: 'DELETED' } } }),
      prisma.lead.count({
        where: { organizationId: orgId, intentScore: { gte: 80 }, status: { not: 'DELETED' } }
      }),
      prisma.campaign.count({ where: { organizationId: orgId } }),
      prisma.message.count({
        where: { lead: { organizationId: orgId }, direction: 'inbound' }
      }),
      prisma.lead.count({
        where: { organizationId: orgId, createdAt: { gte: weekStart }, status: { not: 'DELETED' } }
      }),
      prisma.deal.count({
        where: { organizationId: orgId, status: 'won' }
      }),
      prisma.deal.count({
        where: { organizationId: orgId, status: { in: ['won', 'lost'] } }
      })
    ]);

  const replyRate = totalLeads > 0 ? Math.round((totalMessages / totalLeads) * 100) : 0;
  const conversionRate = closedTotal > 0 ? Math.round((closedWon / closedTotal) * 100) : 0;

  return c.json({
    totalLeads,
    hotLeads,
    campaigns,
    replyRate,
    thisWeekLeads,
    conversionRate,
    totalMessages
  });
};

export const getLeadsBySource = async (c: AppContext) => {
  const orgId = c.get('user').orgId;

  const groups = await prisma.lead.groupBy({
    by: ['source'],
    where: { organizationId: orgId, status: { not: 'DELETED' } },
    _count: { source: true }
  });

  const result = groups.map((g) => ({
    source: g.source || 'unknown',
    count: g._count.source
  }));

  return c.json(result);
};

export const getLeadsByIndustry = async (c: AppContext) => {
  const orgId = c.get('user').orgId;

  const groups = await prisma.lead.groupBy({
    by: ['industry'],
    where: { organizationId: orgId, status: { not: 'DELETED' } },
    _count: { industry: true },
    orderBy: { _count: { industry: 'desc' } },
    take: 10
  });

  const result = groups.map((g) => ({
    industry: g.industry || 'Other',
    count: g._count.industry
  }));

  return c.json(result);
};

export const getLeadsByStatus = async (c: AppContext) => {
  const orgId = c.get('user').orgId;

  const groups = await prisma.lead.groupBy({
    by: ['status'],
    where: { organizationId: orgId, status: { not: 'DELETED' } },
    _count: { status: true }
  });

  const result = groups.map((g) => ({
    status: g.status,
    count: g._count.status
  }));

  return c.json(result);
};

export const getCampaignPerformance = async (c: AppContext) => {
  const orgId = c.get('user').orgId;

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: orgId },
    include: { _count: { select: { enrollments: true } } },
    orderBy: { createdAt: 'desc' }
  });

  const result = campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    sent: campaign.sentCount,
    replies: campaign.replyCount,
    opens: campaign.openCount,
    enrollments: campaign._count.enrollments,
    replyRate:
      campaign.sentCount > 0
        ? Math.round((campaign.replyCount / campaign.sentCount) * 100 * 10) / 10
        : 0,
    openRate:
      campaign.sentCount > 0
        ? Math.round((campaign.openCount / campaign.sentCount) * 100 * 10) / 10
        : 0
  }));

  return c.json(result);
};

export const getActivityTimeline = async (c: AppContext) => {
  const orgId = c.get('user').orgId;

  const activities = await prisma.activity.findMany({
    where: { lead: { organizationId: orgId } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      lead: { select: { id: true, companyName: true, contactName: true } }
    }
  });

  return c.json(activities);
};

export const getWeeklyLeads = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const days = 7;
  const result: { date: string; count: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

    const count = await prisma.lead.count({
      where: {
        organizationId: orgId,
        status: { not: 'DELETED' },
        createdAt: { gte: start, lte: end }
      }
    });

    result.push({
      date: start.toISOString().split('T')[0],
      count
    });
  }

  return c.json(result);
};
