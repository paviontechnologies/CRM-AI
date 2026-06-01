import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendInviteEmail } from '../services/email.service';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'AGENT', 'VIEWER']).default('AGENT')
});

export const getTeam = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;

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

    res.status(200).json({ members, pendingInvites });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const inviteMember = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const userId = req.user!.userId;
    const { email, role } = inviteSchema.parse(req.body);

    // Check if already a member
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await prisma.teamMember.findFirst({
        where: { userId: existingUser.id, organizationId: orgId }
      });
      if (existingMember) {
        return res.status(409).json({ error: 'User is already a team member' });
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.teamInvite.create({
      data: { email, role, token, expiresAt, organizationId: orgId, invitedById: userId }
    });

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/${token}`;

    await sendInviteEmail(email, inviteUrl, org?.name || 'the team');

    res.status(201).json({ message: 'Invite sent', inviteUrl, inviteId: invite.id });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Invite member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const acceptInvite = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { userId } = req.body;

    const invite = await prisma.teamInvite.findUnique({ where: { token } });
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.accepted) return res.status(400).json({ error: 'Invite already accepted' });
    if (new Date() > invite.expiresAt) return res.status(400).json({ error: 'Invite expired' });

    let targetUserId = userId;

    if (!targetUserId) {
      // Look up by email
      const user = await prisma.user.findUnique({ where: { email: invite.email } });
      if (!user) return res.status(400).json({ error: 'User not found. Please register first.' });
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

    res.status(200).json({ message: 'Invite accepted', organizationId: invite.organizationId });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMemberRole = async (req: AuthRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    const orgId = req.user!.orgId;
    const { role } = req.body;

    const validRoles = ['ADMIN', 'AGENT', 'VIEWER', 'SUPERADMIN'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const member = await prisma.teamMember.findFirst({
      where: { id: memberId, organizationId: orgId }
    });

    if (!member) return res.status(404).json({ error: 'Member not found' });

    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: { select: { id: true, email: true, name: true } } }
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const { memberId } = req.params;
    const orgId = req.user!.orgId;
    const currentUserId = req.user!.userId;

    const member = await prisma.teamMember.findFirst({
      where: { id: memberId, organizationId: orgId }
    });

    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.userId === currentUserId) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    await prisma.teamMember.delete({ where: { id: memberId } });
    res.status(200).json({ message: 'Member removed' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
