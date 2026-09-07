import { prisma } from '../lib/prisma';
import type { AppContext } from '../types';

/**
 * Plan catalogue.
 *
 * No payment provider is wired up — these entries drive the limits that
 * planLimit.middleware enforces and the numbers the billing page renders.
 * An upgrade is applied by changing the organization's plan directly.
 */
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    leadLimit: 100,
    aiLimit: 50,
    emailLimit: 500,
    seatLimit: 2,
    features: ['100 leads/month', '50 AI credits', '500 emails', 'Basic pipeline', '2 seats']
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    leadLimit: 1000,
    aiLimit: 500,
    emailLimit: 5000,
    seatLimit: 5,
    features: ['1,000 leads/month', '500 AI credits', '5,000 emails', 'Advanced pipeline', '5 seats', 'CSV import']
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 149,
    leadLimit: 5000,
    aiLimit: 2000,
    emailLimit: 25000,
    seatLimit: 15,
    features: ['5,000 leads/month', '2,000 AI credits', '25,000 emails', '15 seats', 'API access', 'Webhooks']
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 399,
    leadLimit: -1,
    aiLimit: -1,
    emailLimit: -1,
    seatLimit: -1,
    features: ['Unlimited leads', 'Unlimited AI credits', 'Unlimited emails', 'Unlimited seats', 'White-label', 'Priority support']
  }
];

export const getPlans = async (c: AppContext) => c.json(PLANS);

export const getSubscription = async (c: AppContext) => {
  const orgId = c.get('user').orgId;

  const [org, subscription] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        subscription: true,
        planCredits: true,
        usedLeadCredits: true,
        usedAiCredits: true,
        usedEmailCredits: true
      }
    }),
    prisma.subscription.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  if (!org) return c.json({ error: 'Organization not found' }, 404);

  const plan = PLANS.find((p) => p.id === (subscription?.plan || 'free')) || PLANS[0];

  return c.json({
    plan: subscription?.plan || 'free',
    status: subscription?.status || 'active',
    currentPeriodEnd: subscription?.currentPeriodEnd,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
    limits: {
      leads: plan.leadLimit,
      ai: plan.aiLimit,
      email: plan.emailLimit,
      seats: plan.seatLimit
    },
    usage: {
      leads: org.usedLeadCredits,
      ai: org.usedAiCredits,
      email: org.usedEmailCredits
    }
  });
};

/**
 * Self-serve upgrades are not available: no payment provider is connected.
 * Answering 501 keeps the billing page's plan cards working while making the
 * missing capability explicit instead of failing at a dead checkout URL.
 */
export const createCheckoutSession = async (c: AppContext) =>
  c.json({ error: 'Self-serve upgrades are not available yet — contact sales to change your plan.' }, 501);

export const getUsage = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const logs = await prisma.usageLog.groupBy({
    by: ['type'],
    where: { organizationId: orgId, createdAt: { gte: monthStart } },
    _sum: { amount: true }
  });

  const usage: Record<string, number> = {};
  for (const log of logs) {
    usage[log.type] = log._sum.amount || 0;
  }

  return c.json({
    period: { start: monthStart.toISOString(), end: now.toISOString() },
    usage
  });
};
