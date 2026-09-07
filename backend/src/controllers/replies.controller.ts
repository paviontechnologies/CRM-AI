import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getEnv } from '../lib/context';
import { recordReply } from '../services/reply.service';
import type { AppContext } from '../types';

const ManualReplySchema = z.object({
  body: z.string().min(1),
  subject: z.string().optional().nullable(),
  channel: z.string().optional(),
  receivedAt: z.string().datetime().optional()
});

/** POST /api/leads/:id/reply — log a reply a rep received outside the system. */
export const logReply = async (c: AppContext) => {
  const id = c.req.param('id');
  const orgId = c.get('user').orgId;

  const lead = await prisma.lead.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
  if (!lead) return c.json({ error: 'Lead not found' }, 404);

  const body = ManualReplySchema.parse(await c.req.json());

  const result = await recordReply({
    leadId: lead.id,
    organizationId: orgId,
    body: body.body,
    subject: body.subject ?? null,
    channel: body.channel || 'email',
    receivedAt: body.receivedAt ? new Date(body.receivedAt) : undefined
  });

  return c.json(result, 201);
};

const InboundSchema = z.object({
  /** Sender address — matched against Lead.email to find the lead. */
  from: z.string().email(),
  to: z.string().optional(),
  subject: z.string().optional().nullable(),
  text: z.string().optional(),
  html: z.string().optional(),
  receivedAt: z.string().datetime().optional()
});

/** Strip the quoted history most clients append below the actual reply. */
const stripQuotedText = (raw: string): string => {
  const lines = raw.split(/\r?\n/);
  const cut = lines.findIndex((line) =>
    /^>/.test(line) ||
    /^On .+ wrote:$/.test(line.trim()) ||
    /^-{2,}\s*Original Message\s*-{2,}$/i.test(line.trim()) ||
    /^_{10,}$/.test(line.trim())
  );
  const kept = cut === -1 ? lines : lines.slice(0, cut);
  return kept.join('\n').trim() || raw.trim();
};

/**
 * POST /api/webhooks/inbound-email — receives parsed inbound mail from an email
 * provider (SendGrid Inbound Parse, Mailgun routes, Postmark, …).
 *
 * Public route, so it authenticates with a shared secret instead of a JWT. The
 * lead is resolved by sender address; unknown senders are acknowledged with 200
 * so the provider does not retry forever on mail we simply don't care about.
 */
export const inboundEmail = async (c: AppContext) => {
  const secret = getEnv().INBOUND_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[inbound] INBOUND_WEBHOOK_SECRET is not set — rejecting inbound mail');
    return c.json({ error: 'Inbound email is not configured' }, 503);
  }
  const provided = c.req.header('x-webhook-secret') || c.req.query('secret');
  if (provided !== secret) return c.json({ error: 'Unauthorized' }, 401);

  const payload = InboundSchema.parse(await c.req.json());
  const text = payload.text || payload.html?.replace(/<[^>]+>/g, ' ') || '';
  if (!text.trim()) return c.json({ ignored: true, reason: 'empty body' });

  // Sender may belong to more than one org's lead list; record it for each.
  const leads = await prisma.lead.findMany({
    where: { email: payload.from, status: { not: 'DELETED' } },
    select: { id: true, organizationId: true }
  });

  if (leads.length === 0) {
    return c.json({ ignored: true, reason: 'no matching lead' });
  }

  const results = [];
  for (const lead of leads) {
    results.push(
      await recordReply({
        leadId: lead.id,
        organizationId: lead.organizationId,
        body: stripQuotedText(text),
        subject: payload.subject ?? null,
        channel: 'email',
        receivedAt: payload.receivedAt ? new Date(payload.receivedAt) : undefined
      })
    );
  }

  return c.json({ recorded: results.length, results });
};
