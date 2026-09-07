import { createMiddleware } from 'hono/factory';
import { prisma } from '../lib/prisma';
import type { AppBindings, AppContext } from '../types';

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
  createMiddleware<AppBindings>(async (c, next) => {
    try {
      const remaining = await remainingQuota(c.get('user').orgId, kind);

      if (remaining < cost) {
        return c.json(
          {
            error: `You've reached your plan's ${kind} limit for this cycle. Upgrade to continue.`,
            code: 'PLAN_LIMIT_REACHED',
            limitKind: kind,
            remaining
          },
          402
        );
      }
    } catch (error) {
      // Fail open: a limit-check outage must not take the whole app down.
      console.error('Plan limit check failed:', error);
    }
    await next();
  });

/**
 * For bulk endpoints where the cost is only known from the request body.
 * `getCost` reads the parsed body and returns how many units the action consumes.
 *
 * The body is parsed here and cached on the context so the handler can read it
 * again — a Request body can only be consumed once.
 */
export const enforceDynamicLimit = (kind: LimitKind, getCost: (body: any) => number) =>
  createMiddleware<AppBindings>(async (c, next) => {
    try {
      // Hono caches the parsed body internally, so the handler's own
      // c.req.json() call returns the same object rather than re-reading.
      const body = await c.req.json().catch(() => ({}));
      const cost = Math.max(1, getCost(body));
      const remaining = await remainingQuota(c.get('user').orgId, kind);

      if (remaining < cost) {
        return c.json(
          {
            error: `This would exceed your plan's ${kind} limit (${remaining} left this cycle). Upgrade to continue.`,
            code: 'PLAN_LIMIT_REACHED',
            limitKind: kind,
            remaining,
            requested: cost
          },
          402
        );
      }
    } catch (error) {
      console.error('Plan limit check failed:', error);
    }
    await next();
  });
