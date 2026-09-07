import { randomHex } from '../lib/hex';
import { getEnv } from '../lib/context';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { sendInviteEmail } from '../services/email.service';
import type { AppContext } from '../types';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'AGENT', 'VIEWER']).default('AGENT')
});

export const getTeam = async (c: AppContext) => {
  const orgId = c.get('user').orgId;

  const members = await prisma.teamMember.findMany({
    where: { organizationId: orgId },
    include: {
      user: { select: { id: true, email: true, name: true, avatarUrl: true, isVerified: true, createdAt: true } }
    },
    orderBy: { createdAt: 'asc' }
  });

  const pendingInvites = await prisma.teamInvite.findMany({
    where: { organizationId: orgId, accepted: false, expiresAt: { gte: new Date() } },
    include: { invitedBy: { select: { name: true, email: true } } }
  });

  return c.json({ members, pendingInvites });
};

export const inviteMember = async (c: AppContext) => {
  const { userId, orgId } = c.get('user');
  const { email, role } = inviteSchema.parse(await c.req.json());

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingMember = await prisma.teamMember.findFirst({
      where: { userId: existingUser.id, organizationId: orgId }
    });
    if (existingMember) {
      return c.json({ error: 'User is already a team member' }, 409);
    }
  }

  const token = randomHex(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.teamInvite.create({
    data: { email, role, token, expiresAt, organizationId: orgId, invitedById: userId }
  });

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  const inviteUrl = `${getEnv().FRONTEND_URL}/invite/${token}`;

  await sendInviteEmail(email, inviteUrl, org?.name || 'the team');

  return c.json({ message: 'Invite sent', inviteUrl, inviteId: invite.id }, 201);
};

export const acceptInvite = async (c: AppContext) => {
  const token = c.req.param('token');
  const { userId } = await c.req.json();

  const invite = await prisma.teamInvite.findUnique({ where: { token } });
  if (!invite) return c.json({ error: 'Invite not found' }, 404);
  if (invite.accepted) return c.json({ error: 'Invite already accepted' }, 400);
  if (new Date() > invite.expiresAt) return c.json({ error: 'Invite expired' }, 400);

  let targetUserId = userId;

  if (!targetUserId) {
    // Look up by email
    const user = await prisma.user.findUnique({ where: { email: invite.email } });
    if (!user) return c.json({ error: 'User not found. Please register first.' }, 400);
    targetUserId = user.id;
  }

  // Check not already a member
  const existing = await prisma.teamMember.findFirst({
    where: { userId: targetUserId, organizationId: invite.organizationId }
  });

  if (!existing) {
    await prisma.teamMember.create({
      data: { userId: targetUserId, organizationId: invite.organizationId, role: invite.role }
    });
  }

  await prisma.teamInvite.update({ where: { id: invite.id }, data: { accepted: true } });

  return c.json({ message: 'Invite accepted', organizationId: invite.organizationId });
};

export const updateMemberRole = async (c: AppContext) => {
  const memberId = c.req.param('memberId');
  const orgId = c.get('user').orgId;
  const { role } = await c.req.json();

  const validRoles = ['ADMIN', 'AGENT', 'VIEWER', 'SUPERADMIN'];
  if (!role || !validRoles.includes(role)) {
    return c.json({ error: 'Invalid role' }, 400);
  }

  const member = await prisma.teamMember.findFirst({
    where: { id: memberId, organizationId: orgId }
  });

  if (!member) return c.json({ error: 'Member not found' }, 404);

  const updated = await prisma.teamMember.update({
    where: { id: memberId },
    data: { role },
    include: { user: { select: { id: true, email: true, name: true } } }
  });

  return c.json(updated);
};

export const removeMember = async (c: AppContext) => {
  const memberId = c.req.param('memberId');
  const { userId: currentUserId, orgId } = c.get('user');

  const member = await prisma.teamMember.findFirst({
    where: { id: memberId, organizationId: orgId }
  });

  if (!member) return c.json({ error: 'Member not found' }, 404);
  if (member.userId === currentUserId) {
    return c.json({ error: 'Cannot remove yourself' }, 400);
  }

  await prisma.teamMember.delete({ where: { id: memberId } });
  return c.json({ message: 'Member removed' });
};
