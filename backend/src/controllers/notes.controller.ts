import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import { logActivity } from '../lib/notify';

const NoteSchema = z
  .object({
    body: z.string().min(1, 'Note body cannot be empty'),
    leadId: z.string().optional().nullable(),
    dealId: z.string().optional().nullable()
  })
  .refine((v) => v.leadId || v.dealId, {
    message: 'A note must be attached to a lead or a deal'
  });

const noteInclude = {
  author: { select: { id: true, name: true, email: true, avatarUrl: true } }
};

export const getNotes = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const { leadId, dealId } = req.query as Record<string, string>;

    if (!leadId && !dealId) {
      return res.status(400).json({ error: 'leadId or dealId is required' });
    }

    const notes = await prisma.note.findMany({
      where: {
        organizationId: orgId,
        ...(leadId && { leadId }),
        ...(dealId && { dealId })
      },
      include: noteInclude,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(notes);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createNote = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const body = NoteSchema.parse(req.body);

    if (body.leadId) {
      const lead = await prisma.lead.findFirst({ where: { id: body.leadId, organizationId: orgId } });
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
    }
    if (body.dealId) {
      const deal = await prisma.deal.findFirst({ where: { id: body.dealId, organizationId: orgId } });
      if (!deal) return res.status(404).json({ error: 'Deal not found' });
    }

    const note = await prisma.note.create({
      data: {
        organizationId: orgId,
        body: body.body,
        leadId: body.leadId ?? null,
        dealId: body.dealId ?? null,
        authorId: req.user!.userId
      },
      include: noteInclude
    });

    await logActivity(
      note.leadId,
      'note_added',
      note.body.length > 120 ? `${note.body.slice(0, 120)}…` : note.body,
      { noteId: note.id }
    );

    res.status(201).json(note);
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;
    const { body } = req.body;

    if (!body || typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ error: 'Note body cannot be empty' });
    }

    const existing = await prisma.note.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return res.status(404).json({ error: 'Note not found' });
    if (existing.authorId !== req.user!.userId) {
      return res.status(403).json({ error: 'You can only edit your own notes' });
    }

    const note = await prisma.note.update({
      where: { id },
      data: { body },
      include: noteInclude
    });

    res.status(200).json(note);
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.orgId;

    const existing = await prisma.note.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return res.status(404).json({ error: 'Note not found' });

    // Authors can delete their own; admins can delete anyone's.
    const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(req.user!.role);
    if (existing.authorId !== req.user!.userId && !isAdmin) {
      return res.status(403).json({ error: 'You can only delete your own notes' });
    }

    await prisma.note.delete({ where: { id } });
    res.status(200).json({ message: 'Note deleted' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
