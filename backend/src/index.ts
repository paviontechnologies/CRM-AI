import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth.routes';
import leadsRoutes from './routes/leads.routes';
import campaignsRoutes from './routes/campaigns.routes';
import pipelineRoutes from './routes/pipeline.routes';
import analyticsRoutes from './routes/analytics.routes';
import billingRoutes from './routes/billing.routes';
import teamRoutes from './routes/team.routes';
import adminRoutes from './routes/admin.routes';
import dealsRoutes from './routes/deals.routes';
import tasksRoutes from './routes/tasks.routes';
import notesRoutes from './routes/notes.routes';
import attachmentsRoutes from './routes/attachments.routes';
import notificationsRoutes from './routes/notifications.routes';
import assistantRoutes from './routes/assistant.routes';
import { startCampaignScheduler } from './services/campaign.scheduler';
import { apiLimiter } from './middleware/rateLimit.middleware';
import { prisma } from './lib/prisma';

const app = express();
const PORT = process.env.PORT || 5001;

// Fail fast on missing critical config rather than dying on the first query.
if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set — using an insecure dev default. Set it before deploying.');
}

// Behind a proxy/load balancer, trust it so rate-limit keys off the real client IP.
app.set('trust proxy', 1);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  })
);
app.use(helmet());
app.use(morgan('dev'));
app.use(
  express.json({
    limit: '10mb',
    // Stripe verifies its webhook signature against the exact bytes we received,
    // so stash the raw buffer before JSON parsing consumes it.
    verify: (req: any, _res, buf) => {
      if (req.originalUrl === '/api/billing/webhook') req.rawBody = buf;
    }
  })
);
app.use(cookieParser());

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'ai-leadgen-api', version: '2.0.0' })
);

// Rate-limit everything under /api (health stays unthrottled for probes).
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/attachments', attachmentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/assistant', assistantRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err: any, _req: any, res: any, _next: any) => {
  // Multer surfaces upload problems as errors — report them as client errors.
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large' });
  }
  if (err?.message === 'This file type is not allowed') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startCampaignScheduler();
});

// Graceful shutdown — stop accepting connections, then release the DB pool.
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down…`);
  server.close(async () => {
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  });
  // Don't hang forever if a connection refuses to close.
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
