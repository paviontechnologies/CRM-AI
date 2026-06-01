import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendOtpEmail } from '../services/email.service';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_prod';
const ACCESS_EXPIRES = '7d';
const REFRESH_EXPIRES = '30d';

const generateAccessToken = (userId: string, email: string, orgId: string, role: string) =>
  jwt.sign({ userId, email, orgId, role }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });

const generateRefreshToken = (userId: string) =>
  jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES });

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') +
  '-' + crypto.randomBytes(3).toString('hex');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  companyName: z.string().min(1)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, companyName } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const slug = slugify(companyName);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, name, source: 'signup', isVerified: false }
      });

      const org = await tx.organization.create({
        data: { name: companyName, slug }
      });

      const member = await tx.teamMember.create({
        data: { userId: user.id, organizationId: org.id, role: 'ADMIN' }
      });

      await tx.subscription.create({
        data: { organizationId: org.id, plan: 'free', status: 'active' }
      });

      // Create default pipeline
      const pipeline = await tx.pipeline.create({
        data: { organizationId: org.id, name: 'Sales Pipeline', isDefault: true }
      });

      const defaultStages = [
        { name: 'New', color: '#6b7280', orderIndex: 0 },
        { name: 'Qualified', color: '#3b82f6', orderIndex: 1 },
        { name: 'Contacted', color: '#8b5cf6', orderIndex: 2 },
        { name: 'Replied', color: '#f59e0b', orderIndex: 3 },
        { name: 'Meeting Booked', color: '#ec4899', orderIndex: 4 },
        { name: 'Proposal Sent', color: '#06b6d4', orderIndex: 5 },
        { name: 'Closed Won', color: '#10b981', orderIndex: 6 },
        { name: 'Closed Lost', color: '#ef4444', orderIndex: 7 }
      ];

      await tx.pipelineStage.createMany({
        data: defaultStages.map((s) => ({ ...s, pipelineId: pipeline.id }))
      });

      return { user, org, member };
    });

    const refreshToken = generateRefreshToken(result.user.id);
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.user.update({
      where: { id: result.user.id },
      data: { refreshToken: refreshHash }
    });

    const accessToken = generateAccessToken(result.user.id, result.user.email, result.org.id, 'ADMIN');

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      message: 'Registration successful',
      token: accessToken,
      user: { id: result.user.id, email: result.user.email, name: result.user.name },
      organization: { id: result.org.id, name: result.org.name, slug: result.org.slug }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { teamMembers: { include: { organization: true } } }
    });

    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const member = user.teamMembers[0];
    const orgId = member?.organizationId || '';
    const role = member?.role || 'AGENT';
    const orgName = member?.organization?.name || '';

    const refreshToken = generateRefreshToken(user.id);
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: refreshHash } });

    const accessToken = generateAccessToken(user.id, user.email, orgId, role);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      message: 'Login successful',
      token: accessToken,
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
      organization: { id: orgId, name: orgName }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { googleId, email, name, avatarUrl, companyName } = req.body;
    if (!googleId || !email) return res.status(400).json({ error: 'Missing google credentials' });

    let user = await prisma.user.findFirst({ where: { OR: [{ googleId }, { email }] } });

    let orgId = '';
    let role = 'AGENT';
    let orgName = '';

    if (!user) {
      const slug = slugify(companyName || 'my-org');
      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: { email, googleId, name, avatarUrl, isVerified: true, source: 'google' }
        });
        const org = await tx.organization.create({ data: { name: companyName || 'My Organization', slug } });
        await tx.teamMember.create({ data: { userId: newUser.id, organizationId: org.id, role: 'ADMIN' } });
        await tx.subscription.create({ data: { organizationId: org.id, plan: 'free', status: 'active' } });
        return { user: newUser, org };
      });
      user = result.user;
      orgId = result.org.id;
      orgName = result.org.name;
      role = 'ADMIN';
    } else {
      const member = await prisma.teamMember.findFirst({
        where: { userId: user.id },
        include: { organization: true }
      });
      orgId = member?.organizationId || '';
      role = member?.role || 'AGENT';
      orgName = member?.organization?.name || '';
      if (!user.googleId) {
        await prisma.user.update({ where: { id: user.id }, data: { googleId, avatarUrl: avatarUrl || user.avatarUrl } });
      }
    }

    const accessToken = generateAccessToken(user.id, user.email, orgId, role);
    const refreshToken = generateRefreshToken(user.id);
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: refreshHash } });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      message: 'Google auth successful',
      token: accessToken,
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
      organization: { id: orgId, name: orgName }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(200).json({ message: 'If this email exists, an OTP has been sent.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({ where: { id: user.id }, data: { otpCode: otp, otpExpiresAt } });
    await sendOtpEmail(email, otp, user.name);

    res.status(200).json({ message: 'If this email exists, an OTP has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.otpCode || !user.otpExpiresAt) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (user.otpCode !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (new Date() > user.otpExpiresAt) return res.status(400).json({ error: 'OTP has expired' });

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, otpCode: null, otpExpiresAt: null }
    });

    const member = await prisma.teamMember.findFirst({
      where: { userId: user.id },
      include: { organization: true }
    });

    const orgId = member?.organizationId || '';
    const role = member?.role || 'AGENT';
    const accessToken = generateAccessToken(user.id, user.email, orgId, role);

    res.status(200).json({ message: 'OTP verified successfully', token: accessToken });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token' });

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET) as any;
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({
      where: { id: payload.userId, refreshToken: tokenHash }
    });

    if (!user) return res.status(401).json({ error: 'Refresh token revoked' });

    const member = await prisma.teamMember.findFirst({ where: { userId: user.id } });
    const orgId = member?.organizationId || '';
    const role = member?.role || 'AGENT';

    const newAccessToken = generateAccessToken(user.id, user.email, orgId, role);
    const newRefreshToken = generateRefreshToken(user.id);
    const newRefreshHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshHash } });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({ token: newAccessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.user!;
    const { name, avatarUrl } = req.body;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { ...(name !== undefined && { name }), ...(avatarUrl !== undefined && { avatarUrl }) },
      select: { id: true, email: true, name: true, avatarUrl: true }
    });
    res.status(200).json(updated);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateOrg = async (req: AuthRequest, res: Response) => {
  try {
    const { orgId, role } = req.user!;
    if (!['ADMIN', 'SUPERADMIN'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    const { name, logoUrl } = req.body;
    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: { ...(name && { name }), ...(logoUrl !== undefined && { logoUrl }) }
    });
    res.status(200).json(updated);
  } catch (error) {
    console.error('Update org error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.user!;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Valid current and new password (min 8 chars) required' });
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) return res.status(400).json({ error: 'No password set on this account' });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, orgId } = req.user!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, avatarUrl: true, isVerified: true, createdAt: true }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true, name: true, slug: true, logoUrl: true, subscription: true,
        planCredits: true, usedLeadCredits: true, usedAiCredits: true,
        usedEmailCredits: true, usedWaCredits: true
      }
    });

    const member = await prisma.teamMember.findFirst({
      where: { userId, organizationId: orgId },
      select: { role: true }
    });

    res.status(200).json({ user, organization: org, role: member?.role });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
