import { prisma } from '../lib/prisma';
import { z } from 'zod';
import type { AppContext } from '../types';
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

export const getNotes = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const leadId = c.req.query('leadId');
  const dealId = c.req.query('dealId');

  if (!leadId && !dealId) {
    return c.json({ error: 'leadId or dealId is required' }, 400);
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

  return c.json(notes);
};

export const createNote = async (c: AppContext) => {
  const { userId, orgId } = c.get('user');
  const body = NoteSchema.parse(await c.req.json());

  if (body.leadId) {
    const lead = await prisma.lead.findFirst({ where: { id: body.leadId, organizationId: orgId } });
    if (!lead) return c.json({ error: 'Lead not found' }, 404);
  }
  if (body.dealId) {
    const deal = await prisma.deal.findFirst({ where: { id: body.dealId, organizationId: orgId } });
    if (!deal) return c.json({ error: 'Deal not found' }, 404);
  }

  const note = await prisma.note.create({
    data: {
      organizationId: orgId,
      body: body.body,
      leadId: body.leadId ?? null,
      dealId: body.dealId ?? null,
      authorId: userId
    },
    include: noteInclude
  });

  await logActivity(
    note.leadId,
    'note_added',
    note.body.length > 120 ? `${note.body.slice(0, 120)}…` : note.body,
    { noteId: note.id }
  );

  return c.json(note, 201);
};

export const updateNote = async (c: AppContext) => {
  const id = c.req.param('id');
  const { userId, orgId } = c.get('user');
  const { body } = await c.req.json();

  if (!body || typeof body !== 'string' || !body.trim()) {
    return c.json({ error: 'Note body cannot be empty' }, 400);
  }

  const existing = await prisma.note.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return c.json({ error: 'Note not found' }, 404);
  if (existing.authorId !== userId) {
    return c.json({ error: 'You can only edit your own notes' }, 403);
  }

  const note = await prisma.note.update({
    where: { id },
    data: { body },
    include: noteInclude
  });

  return c.json(note);
};

export const deleteNote = async (c: AppContext) => {
  const id = c.req.param('id');
  const { userId, orgId, role } = c.get('user');

  const existing = await prisma.note.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return c.json({ error: 'Note not found' }, 404);

  // Authors can delete their own; admins can delete anyone's.
  const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(role);
  if (existing.authorId !== userId && !isAdmin) {
    return c.json({ error: 'You can only delete your own notes' }, 403);
  }

  await prisma.note.delete({ where: { id } });
  return c.json({ message: 'Note deleted' });
};
