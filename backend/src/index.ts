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
import { startCampaignScheduler } from './services/campaign.scheduler';

const app = express();
const PORT = process.env.PORT || 5001;

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startCampaignScheduler();
});
