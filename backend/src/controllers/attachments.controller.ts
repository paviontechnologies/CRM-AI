import { prisma } from '../lib/prisma';
import { getEnv } from '../lib/context';
import { logActivity } from '../lib/notify';
import type { AppContext } from '../types';

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10MB

// Executables and scripts are rejected outright — this store is for sales collateral.
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.dll', '.bat', '.cmd', '.com', '.msi', '.scr', '.ps1',
  '.sh', '.jar', '.app', '.deb', '.rpm'
]);

const extensionOf = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot).toLowerCase();
};

/** Object key in R2. Scoped by org so a listing can never span tenants. */
const objectKey = (orgId: string, storedName: string) => `${orgId}/${storedName}`;

export const getAttachments = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const leadId = c.req.query('leadId');
  const dealId = c.req.query('dealId');

  if (!leadId && !dealId) {
    return c.json({ error: 'leadId or dealId is required' }, 400);
  }

  const attachments = await prisma.attachment.findMany({
    where: {
      organizationId: orgId,
      ...(leadId && { leadId }),
      ...(dealId && { dealId })
    },
    orderBy: { createdAt: 'desc' }
  });

  return c.json(attachments);
};

export const uploadAttachment = async (c: AppContext) => {
  const env = getEnv();
  const orgId = c.get('user').orgId;
  const maxBytes = parseInt(env.MAX_UPLOAD_BYTES || '', 10) || DEFAULT_MAX_BYTES;

  const form = await c.req.formData();
  const file = form.get('file');
  const leadId = (form.get('leadId') as string | null) || undefined;
  const dealId = (form.get('dealId') as string | null) || undefined;

  if (!(file instanceof File)) {
    return c.json({ error: 'No file uploaded' }, 400);
  }
  if (file.size > maxBytes) {
    return c.json({ error: 'File is too large' }, 413);
  }
  if (BLOCKED_EXTENSIONS.has(extensionOf(file.name))) {
    return c.json({ error: 'This file type is not allowed' }, 400);
  }
  if (!leadId && !dealId) {
    return c.json({ error: 'leadId or dealId is required' }, 400);
  }

  // Verify ownership before writing — otherwise an orphan object is left in R2.
  if (leadId) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId: orgId } });
    if (!lead) return c.json({ error: 'Lead not found' }, 404);
  }
  if (dealId) {
    const deal = await prisma.deal.findFirst({ where: { id: dealId, organizationId: orgId } });
    if (!deal) return c.json({ error: 'Deal not found' }, 404);
  }

  // Random stored name: the client-supplied filename never becomes a key.
  const storedName = `${crypto.randomUUID()}${extensionOf(file.name).slice(0, 12)}`;
  const key = objectKey(orgId, storedName);

  await env.ATTACHMENTS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' }
  });

  try {
    const attachment = await prisma.attachment.create({
      data: {
        organizationId: orgId,
        fileName: file.name,
        storedName,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        leadId: leadId ?? null,
        dealId: dealId ?? null,
        uploadedById: c.get('user').userId
      }
    });

    await logActivity(attachment.leadId, 'file_uploaded', `File uploaded: ${attachment.fileName}`, {
      attachmentId: attachment.id
    });

    return c.json(attachment, 201);
  } catch (error) {
    // Don't leave the object behind if the row failed to write.
    await env.ATTACHMENTS.delete(key).catch(() => undefined);
    throw error;
  }
};

export const downloadAttachment = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const attachment = await prisma.attachment.findFirst({
    where: { id: c.req.param('id'), organizationId: orgId }
  });
  if (!attachment) return c.json({ error: 'Attachment not found' }, 404);

  const object = await getEnv().ATTACHMENTS.get(objectKey(orgId, attachment.storedName));
  if (!object) return c.json({ error: 'File is missing from storage' }, 404);

  return new Response(object.body, {
    headers: {
      'Content-Type': attachment.mimeType,
      // Always download rather than render, so an uploaded HTML/SVG can't run in our origin.
      'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
      'Content-Length': String(attachment.size)
    }
  });
};

export const deleteAttachment = async (c: AppContext) => {
  const orgId = c.get('user').orgId;
  const attachment = await prisma.attachment.findFirst({
    where: { id: c.req.param('id'), organizationId: orgId }
  });
  if (!attachment) return c.json({ error: 'Attachment not found' }, 404);

  await prisma.attachment.delete({ where: { id: attachment.id } });
  await getEnv()
    .ATTACHMENTS.delete(objectKey(orgId, attachment.storedName))
    .catch((error) => console.error('Failed to remove R2 object:', error));

  return c.json({ message: 'Attachment deleted' });
};
