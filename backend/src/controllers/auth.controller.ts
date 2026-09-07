import { prisma } from '../lib/prisma';
import { getEnv } from '../lib/context';
import { signAccessToken } from '../lib/jwt';
import { verifySupabaseToken, claimsName, type SupabaseClaims } from '../lib/supabase';
import { createWorkspace, defaultCompanyName } from '../lib/bootstrap';
import type { AppContext } from '../types';

/**
 * Identity lives in Supabase; tenancy lives here.
 *
 * Signup, sign-in, password resets and OAuth are all handled by Supabase, so
 * this file no longer touches passwords. What it still owns is the mapping
 * from a Supabase identity to a CRM user, organization and role.
 *
 * The exchange happens once per session rather than per request: `createSession`
 * verifies the Supabase token and mints this API's own access token carrying
 * userId/orgId/role. Every other route then authenticates against that token
 * with a single HMAC and no database lookup at all.
 */

/** Find the CRM user behind a Supabase identity, creating one on first sight. */
const resolveUser = async (claims: SupabaseClaims) => {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ supabaseId: claims.sub }, ...(claims.email ? [{ email: claims.email }] : [])] }
  });

  if (existing) {
    // An account that predates Supabase (or was seeded) gets linked on first
    // sign-in, so the email lookup above only ever runs once per user.
    if (!existing.supabaseId) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { supabaseId: claims.sub, isVerified: true }
      });
    }
    return existing;
  }

  return prisma.user.create({
    data: {
      supabaseId: claims.sub,
      email: claims.email ?? `${claims.sub}@no-email.local`,
      name: claimsName(claims),
      avatarUrl: claims.user_metadata?.avatar_url,
      isVerified: true,
      source: 'supabase'
    }
  });
};

/**
 * POST /auth/session — exchange a Supabase access token for an API token.
 *
 * Called right after Supabase sign-in or signup, and again whenever the API
 * token expires. `companyName` is only read when the user has no workspace yet.
 */
export const createSession = async (c: AppContext) => {
  // Distinguish "the API is misconfigured" from "your token is bad" — both look
  // like a rejected token from the browser otherwise.
  if (!getEnv().SUPABASE_URL) {
    return c.json({ error: 'Auth is not configured on the API (SUPABASE_URL is unset).' }, 500);
  }

  const authHeader = c.req.header('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing Supabase access token' }, 401);
  }

  const claims = await verifySupabaseToken(authHeader.slice(7));
  if (!claims) return c.json({ error: 'Invalid Supabase token' }, 401);

  const body = await c.req.json().catch(() => ({}) as { companyName?: string });
  const user = await resolveUser(claims);

  let member = await prisma.teamMember.findFirst({ where: { userId: user.id } });
  if (!member) {
    member = await createWorkspace(
      user.id,
      body.companyName?.trim() || defaultCompanyName(user.email, user.name ?? undefined)
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: member.organizationId },
    select: { id: true, name: true, slug: true }
  });

  const token = await signAccessToken({
    userId: user.id,
    email: user.email,
    orgId: member.organizationId,
    role: member.role
  });

  return c.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    organization: org,
    role: member.role
  });
};

/**
 * Dev-only login bypass.
 *
 * Gated behind DEV_AUTH_BYPASS so it cannot exist in a deployed Worker: without
 * the flag it answers 404, exactly as if the route were never registered. When
 * on, it finds-or-creates the demo workspace and mints a real access token,
 * skipping Supabase entirely so the app is usable before auth is configured.
 */
export const devLogin = async (c: AppContext) => {
  if (getEnv().DEV_AUTH_BYPASS !== 'true') {
    return c.json({ error: 'Not found' }, 404);
  }

  const DEMO_EMAIL = 'demo@demo.com';

  const user =
    (await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })) ??
    (await prisma.user.create({
      data: { email: DEMO_EMAIL, name: 'Demo Admin', isVerified: true, source: 'dev-bypass' }
    }));

  const member =
    (await prisma.teamMember.findFirst({ where: { userId: user.id } })) ??
    (await createWorkspace(user.id, 'Demo Inc'));

  const org = await prisma.organization.findUnique({
    where: { id: member.organizationId },
    select: { id: true, name: true, slug: true }
  });

  const token = await signAccessToken({
    userId: user.id,
    email: user.email,
    orgId: member.organizationId,
    role: member.role
  });

  return c.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    organization: org,
    role: member.role
  });
};

export const updateProfile = async (c: AppContext) => {
  const { userId } = c.get('user');
  const { name, avatarUrl } = await c.req.json();
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { ...(name !== undefined && { name }), ...(avatarUrl !== undefined && { avatarUrl }) },
    select: { id: true, email: true, name: true, avatarUrl: true }
  });
  return c.json(updated);
};

export const updateOrg = async (c: AppContext) => {
  const { orgId, role } = c.get('user');
  if (!['ADMIN', 'SUPERADMIN'].includes(role)) return c.json({ error: 'Forbidden' }, 403);

  const { name, logoUrl, aiQualificationPrompt } = await c.req.json();
  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: {
      ...(name && { name }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(aiQualificationPrompt !== undefined && { aiQualificationPrompt })
    }
  });
  return c.json(updated);
};

export const getMe = async (c: AppContext) => {
  const { userId, orgId } = c.get('user');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, avatarUrl: true, isVerified: true, createdAt: true }
  });

  if (!user) return c.json({ error: 'User not found' }, 404);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true, name: true, slug: true, logoUrl: true, subscription: true,
      planCredits: true, usedLeadCredits: true, usedAiCredits: true,
      usedEmailCredits: true, aiQualificationPrompt: true
    }
  });

  const member = await prisma.teamMember.findFirst({
    where: { userId, organizationId: orgId },
    select: { role: true }
  });

  return c.json({ user, organization: org, role: member?.role });
};
