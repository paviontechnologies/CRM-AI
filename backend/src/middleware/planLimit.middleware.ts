import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from './auth.middleware';

export type LimitKind = 'lead' | 'ai' | 'email' | 'seat';

// Fallback limits for the free tier when no Subscription row exists yet.
const FREE_LIMITS: Record<LimitKind, number> = { lead: 100, ai: 50, email: 500, seat: 2 };

const usageField: Record<LimitKind, 'usedLeadCredits' | 'usedAiCredits' | 'usedEmailCredits'> = {
  lead: 'usedLeadCredits',
  ai: 'usedAiCredits',
  email: 'usedEmailCredits',
  seat: 'usedLeadCredits' // unused; seats are counted differently below
};

const limitField: Record<LimitKind, 'leadLimit' | 'aiLimit' | 'emailLimit' | 'seatLimit'> = {
  lead: 'leadLimit',
  ai: 'aiLimit',
  email: 'emailLimit',
  seat: 'seatLimit'
};

/**
 * Returns how many units of `kind` the org may still consume, or `Infinity` when
 * the plan is unlimited (limit -1). Never throws.
 */
export const remainingQuota = async (orgId: string, kind: LimitKind): Promise<number> => {
  const subscription = await prisma.subscription.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' }
  });

  const limit = subscription ? (subscription[limitField[kind]] as number) : FREE_LIMITS[kind];
  if (limit < 0) return Infinity; // -1 means unlimited

  if (kind === 'seat') {
    const seats = await prisma.teamMember.count({ where: { organizationId: orgId } });
    return Math.max(0, limit - seats);
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { usedLeadCredits: true, usedAiCredits: true, usedEmailCredits: true }
  });
  const used = org ? (org[usageField[kind]] as number) : 0;
  return Math.max(0, limit - used);
};

/**
 * Blocks the request when the org has exhausted its monthly quota for `kind`.
 * `cost` lets a bulk action (e.g. importing 40 leads) reserve its whole size up front.
 */
export const enforceLimit = (kind: LimitKind, cost = 1) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId;
      const remaining = await remainingQuota(orgId, kind);

      if (remaining < cost) {
        return res.status(402).json({
          error: `You've reached your plan's ${kind} limit for this cycle. Upgrade to continue.`,
          code: 'PLAN_LIMIT_REACHED',
          limitKind: kind,
          remaining
        });
      }

      next();
    } catch (error) {
      // Fail open: a limit-check outage must not take the whole app down.
      console.error('Plan limit check failed:', error);
      next();
    }
  };

/**
 * For bulk endpoints where the cost is only known from the request body.
 * `getCost` reads the body and returns how many units the action will consume.
 */
export const enforceDynamicLimit = (kind: LimitKind, getCost: (req: AuthRequest) => number) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.orgId;
      const cost = Math.max(1, getCost(req));
      const remaining = await remainingQuota(orgId, kind);

      if (remaining < cost) {
        return res.status(402).json({
          error: `This would exceed your plan's ${kind} limit (${remaining} left this cycle). Upgrade to continue.`,
          code: 'PLAN_LIMIT_REACHED',
          limitKind: kind,
          remaining,
          requested: cost
        });
      }

      next();
    } catch (error) {
      console.error('Plan limit check failed:', error);
      next();
    }
  };
