import { prisma } from './prisma';
import { randomHex } from './hex';

/**
 * First-run workspace creation.
 *
 * A user arriving from Supabase has an identity but no tenant yet. Everything
 * the app assumes exists — an org, an ADMIN membership, a subscription row and
 * a default pipeline — is created here, in one place, so the sign-in path and
 * the dev bypass cannot drift apart.
 */

const DEFAULT_STAGES = [
  { name: 'New', color: '#6b7280', orderIndex: 0 },
  { name: 'Qualified', color: '#3b82f6', orderIndex: 1 },
  { name: 'Contacted', color: '#8b5cf6', orderIndex: 2 },
  { name: 'Replied', color: '#f59e0b', orderIndex: 3 },
  { name: 'Meeting Booked', color: '#ec4899', orderIndex: 4 },
  { name: 'Proposal Sent', color: '#06b6d4', orderIndex: 5 },
  { name: 'Closed Won', color: '#10b981', orderIndex: 6 },
  { name: 'Closed Lost', color: '#ef4444', orderIndex: 7 }
];

const slugify = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + randomHex(3);

/** Create an organization owned by `userId` and return the ADMIN membership. */
export const createWorkspace = async (userId: string, companyName: string) => {
  const org = await prisma.organization.create({
    data: { name: companyName, slug: slugify(companyName) }
  });

  const member = await prisma.teamMember.create({
    data: { userId, organizationId: org.id, role: 'ADMIN' }
  });

  await prisma.subscription.create({
    data: { organizationId: org.id, plan: 'free', status: 'active' }
  });

  const pipeline = await prisma.pipeline.create({
    data: { organizationId: org.id, name: 'Sales Pipeline', isDefault: true }
  });

  await prisma.pipelineStage.createMany({
    data: DEFAULT_STAGES.map((s) => ({ ...s, pipelineId: pipeline.id }))
  });

  return member;
};

/**
 * A workspace name to fall back on when the caller did not supply one — the
 * local part of the email reads better than "My Workspace".
 */
export const defaultCompanyName = (email: string | undefined, name?: string): string => {
  if (name?.trim()) return `${name.trim()}'s Workspace`;
  const local = email?.split('@')[0];
  return local ? `${local}'s Workspace` : 'My Workspace';
};
