import { prisma } from '../lib/prisma';
import { sendCampaignEmail, isEmailConfigured } from './email.service';
import { logActivity } from '../lib/notify';

const TICK_MS = parseInt(process.env.CAMPAIGN_TICK_MS || '', 10) || 60_000;
/** How long one "day" of a sequence lasts. Lower it to smoke-test sequences fast. */
const DAY_MS = parseInt(process.env.CAMPAIGN_DAY_MS || '', 10) || 86_400_000;
const BATCH_SIZE = parseInt(process.env.CAMPAIGN_BATCH_SIZE || '', 10) || 25;

let running = false;

/** Replace {{token}} placeholders with lead fields. Unknown tokens collapse to ''. */
const render = (template: string, lead: Record<string, any>): string =>
  template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const value = lead[key];
    return value === null || value === undefined ? '' : String(value);
  });

const processEnrollment = async (enrollment: any): Promise<void> => {
  const { campaign, lead } = enrollment;
  const steps = campaign.steps;

  // Sequence finished — nothing left to send.
  if (enrollment.currentStep >= steps.length) {
    await prisma.campaignEnrollment.update({
      where: { id: enrollment.id },
      data: { status: 'completed', nextRunAt: null }
    });
    return;
  }

  const step = steps[enrollment.currentStep];

  // Only email is wired for delivery today; other channels are logged as drafts
  // so the sequence still advances and the work is visible on the timeline.
  const canSend = step.channel === 'email' && Boolean(lead.email);

  const subject = render(step.subject || `Following up, ${lead.companyName}`, lead);
  const body = render(step.content, lead);

  const message = await prisma.message.create({
    data: {
      leadId: lead.id,
      direction: 'outbound',
      channel: step.channel,
      subject,
      body,
      status: canSend ? 'sending' : 'skipped',
      campaignId: campaign.id,
      campaignStepId: step.id
    }
  });

  let sent = false;
  if (canSend) {
    sent = await sendCampaignEmail({
      to: lead.email,
      subject,
      body,
      messageId: message.id
    });

    await prisma.message.update({
      where: { id: message.id },
      data: { status: sent ? 'sent' : 'failed' }
    });
  }

  if (sent) {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { sentCount: { increment: 1 } }
    });
    await prisma.organization.update({
      where: { id: campaign.organizationId },
      data: { usedEmailCredits: { increment: 1 } }
    });
    await prisma.usageLog.create({
      data: { organizationId: campaign.organizationId, type: 'email', amount: 1 }
    });
    await logActivity(lead.id, 'campaign_email_sent', `Campaign "${campaign.name}": ${subject}`, {
      campaignId: campaign.id,
      messageId: message.id
    });
  }

  // Advance regardless of send outcome — a bad address must not wedge the sequence.
  const nextStepIndex = enrollment.currentStep + 1;
  const nextStep = steps[nextStepIndex];

  await prisma.campaignEnrollment.update({
    where: { id: enrollment.id },
    data: {
      currentStep: nextStepIndex,
      status: nextStep ? 'active' : 'completed',
      nextRunAt: nextStep ? new Date(Date.now() + (nextStep.dayOffset || 1) * DAY_MS) : null
    }
  });
};

const tick = async (): Promise<void> => {
  // Guard against overlapping runs when a batch takes longer than one tick.
  if (running) return;
  running = true;

  try {
    const due = await prisma.campaignEnrollment.findMany({
      where: {
        status: 'active',
        nextRunAt: { lte: new Date() },
        // Paused or draft campaigns must not send.
        campaign: { status: 'active' }
      },
      take: BATCH_SIZE,
      orderBy: { nextRunAt: 'asc' },
      include: {
        lead: true,
        campaign: { include: { steps: { orderBy: { orderIndex: 'asc' } } } }
      }
    });

    if (due.length === 0) return;
    console.log(`[campaigns] processing ${due.length} due enrollment(s)`);

    for (const enrollment of due) {
      try {
        await processEnrollment(enrollment);
      } catch (error) {
        console.error(`[campaigns] enrollment ${enrollment.id} failed:`, error);
        // Back off this one enrollment so a persistent failure doesn't spin the loop.
        await prisma.campaignEnrollment
          .update({
            where: { id: enrollment.id },
            data: { nextRunAt: new Date(Date.now() + 15 * 60_000) }
          })
          .catch(() => undefined);
      }
    }
  } catch (error) {
    console.error('[campaigns] scheduler tick failed:', error);
  } finally {
    running = false;
  }
};

export const startCampaignScheduler = (): void => {
  if (process.env.CAMPAIGN_SCHEDULER === 'off') {
    console.log('[campaigns] scheduler disabled via CAMPAIGN_SCHEDULER=off');
    return;
  }

  console.log(
    `[campaigns] scheduler started — tick ${TICK_MS}ms, day ${DAY_MS}ms, sending ${
      isEmailConfigured() ? 'ENABLED' : 'DISABLED (no SMTP config)'
    }`
  );

  const timer = setInterval(tick, TICK_MS);
  // Don't hold the event loop open during shutdown.
  timer.unref();
  void tick();
};
