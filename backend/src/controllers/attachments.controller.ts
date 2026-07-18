import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { logActivity } from '../lib/notify';

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_UPLOAD_BYTES || '', 10) || 10 * 1024 * 1024; // 10MB

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Executables and scripts are rejected outright — this store is for sales collateral.
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.dll', '.bat', '.cmd', '.com', '.msi', '.scr', '.ps1',
  '.sh', '.jar', '.app', '.deb', '.rpm'
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  // Random stored name: the client-supplied filename never touches the filesystem.
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 12);
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      return cb(new Error('This file type is not allowed'));
    }
    cb(null, true);
  }
});

const removeFile = (storedName: string) => {
  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, storedName));
  } catch (error) {
    console.error('Failed to remove upload:', error);
  }
};

export const getAttachments = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;
    const { leadId, dealId } = req.query as Record<string, string>;

    if (!leadId && !dealId) {
      return res.status(400).json({ error: 'leadId or dealId is required' });
    }

    const attachments = await prisma.attachment.findMany({
      where: {
        organizationId: orgId,
        ...(leadId && { leadId }),
        ...(dealId && { dealId })
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(attachments);
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const uploadAttachment = async (req: AuthRequest, res: Response) => {
  const file = req.file;
  try {
    const orgId = req.user!.orgId;
    const { leadId, dealId } = req.body as Record<string, string | undefined>;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    if (!leadId && !dealId) {
      removeFile(file.filename);
      return res.status(400).json({ error: 'leadId or dealId is required' });
    }

    // Verify ownership before recording — otherwise an orphan file is left on disk.
    if (leadId) {
      const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId: orgId } });
      if (!lead) {
        removeFile(file.filename);
        return res.status(404).json({ error: 'Lead not found' });
      }
    }
    if (dealId) {
      const deal = await prisma.deal.findFirst({ where: { id: dealId, organizationId: orgId } });
      if (!deal) {
        removeFile(file.filename);
        return res.status(404).json({ error: 'Deal not found' });
      }
    }

    const attachment = await prisma.attachment.create({
      data: {
        organizationId: orgId,
        fileName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        leadId: leadId ?? null,
        dealId: dealId ?? null,
        uploadedById: req.user!.userId
      }
    });

    await logActivity(attachment.leadId, 'file_uploaded', `File uploaded: ${attachment.fileName}`, {
      attachmentId: attachment.id
    });

    res.status(201).json(attachment);
  } catch (error) {
    if (file) removeFile(file.filename);
    console.error('Upload attachment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const downloadAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const attachment = await prisma.attachment.findFirst({
      where: { id: req.params.id, organizationId: req.user!.orgId }
    });
    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

    // storedName is server-generated, but re-anchor to UPLOAD_DIR as defence in depth.
    const filePath = path.join(UPLOAD_DIR, path.basename(attachment.storedName));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File is missing from storage' });
    }

    res.setHeader('Content-Type', attachment.mimeType);
    // Always download rather than render, so an uploaded HTML/SVG can't run in our origin.
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.fileName)}"`
    );
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const attachment = await prisma.attachment.findFirst({
      where: { id: req.params.id, organizationId: req.user!.orgId }
    });
    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

    await prisma.attachment.delete({ where: { id: attachment.id } });
    removeFile(attachment.storedName);

    res.status(200).json({ message: 'Attachment deleted' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
