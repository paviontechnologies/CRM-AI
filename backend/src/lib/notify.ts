import { prisma } from './prisma';

/** Resolve the TeamMember row for a user inside an org. */
export const getTeamMemberId = async (userId: string, orgId: string): Promise<string | null> => {
  const member = await prisma.teamMember.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
    select: { id: true }
  });
  return member?.id ?? null;
};

/** Resolve the User behind a TeamMember id, scoped to the org. */
export const getUserIdForMember = async (memberId: string, orgId: string): Promise<string | null> => {
  const member = await prisma.teamMember.findFirst({
    where: { id: memberId, organizationId: orgId },
    select: { userId: true }
  });
  return member?.userId ?? null;
};

interface NotifyInput {
  organizationId: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
}

/**
 * Fire-and-forget notification. Never throws — a failed notification must not
 * roll back the action that triggered it.
 */
export const notify = async (input: NotifyInput): Promise<void> => {
  try {
    await prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null
      }
    });
  } catch (error) {
    console.error('Notification create failed:', error);
  }
};

/** Notify every member of an org except the actor. */
export const notifyOrg = async (
  orgId: string,
  exceptUserId: string | null,
  payload: Omit<NotifyInput, 'organizationId' | 'userId'>
): Promise<void> => {
  try {
    const members = await prisma.teamMember.findMany({
      where: { organizationId: orgId, ...(exceptUserId && { userId: { not: exceptUserId } }) },
      select: { userId: true }
    });
    if (members.length === 0) return;
    await prisma.notification.createMany({
      data: members.map((m) => ({
        organizationId: orgId,
        userId: m.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body ?? null,
        link: payload.link ?? null
      }))
    });
  } catch (error) {
    console.error('Org notification failed:', error);
  }
};

/** Append to a lead's activity timeline. Never throws. */
export const logActivity = async (
  leadId: string | null | undefined,
  type: string,
  notes: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  if (!leadId) return;
  try {
    await prisma.activity.create({
      data: {
        leadId,
        type,
        notes,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  } catch (error) {
    console.error('Activity log failed:', error);
  }
};
