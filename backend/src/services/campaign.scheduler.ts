import { prisma } from '../lib/prisma';
import { getEnv } from '../lib/context';
import { sendCampaignEmail, isEmailConfigured } from './email.service';
import { logActivity } from '../lib/notify';
import { remainingQuota } from '../middleware/planLimit.middleware';

/** How long one "day" of a sequence lasts. Lower it to smoke-test sequences fast. */
const DEFAULT_DAY_MS = 86_400_000;
const DEFAULT_BATCH_SIZE = 25;

/** Replace {{token}} placeholders with lead fields. Unknown tokens collapse to ''. */
const render = (template: string, lead: Record<string, any>): string =>
  template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const value = lead[key];
    return value === null || value === undefined ? '' : String(value);
  });

const processEnrollment = async (enrollment: any, dayMs: number): Promise<void> => {
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

  // A reply may have landed since this enrollment was queued — never drip on top of one.
  const replied = await prisma.message.findFirst({
    where: { leadId: lead.id, direction: 'inbound', campaignId: campaign.id },
    select: { id: true }
  });
  if (replied) {
    await prisma.campaignEnrollment.update({
      where: { id: enrollment.id },
      data: { status: 'replied', nextRunAt: null }
    });
    return;
  }

  const step = steps[enrollment.currentStep];

  // Only email is wired for delivery today; other channels are logged as drafts
  // so the sequence still advances and the work is visible on the timeline.
  // Also stop sending once the org has burned through its email quota.
  const withinQuota = (await remainingQuota(campaign.organizationId, 'email')) >= 1;
  const canSend = step.channel === 'email' && Boolean(lead.email) && withinQuota;

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
      nextRunAt: nextStep ? new Date(Date.now() + (nextStep.dayOffset || 1) * dayMs) : null
    }
  });
};

/**
 * Process one batch of due enrollments.
 *
 * Called from the Worker's `scheduled` handler rather than a setInterval — a
 * Worker isolate does not outlive its request, so the platform's cron trigger
 * is what keeps sequences moving. Claiming rows before sending means two
 * overlapping ticks can't both pick up the same enrollment.
 */
export const runCampaignTick = async (): Promise<void> => {
  const env = getEnv();
  if (env.CAMPAIGN_SCHEDULER === 'off') {
    console.log('[campaigns] scheduler disabled via CAMPAIGN_SCHEDULER=off');
    return;
  }

  const dayMs = parseInt(env.CAMPAIGN_DAY_MS || '', 10) || DEFAULT_DAY_MS;
  const batchSize = parseInt(env.CAMPAIGN_BATCH_SIZE || '', 10) || DEFAULT_BATCH_SIZE;

  try {
    const due = await prisma.campaignEnrollment.findMany({
      where: {
        status: 'active',
        nextRunAt: { lte: new Date() },
        // Paused or draft campaigns must not send.
        campaign: { status: 'active' }
      },
      take: batchSize,
      orderBy: { nextRunAt: 'asc' },
      include: {
        lead: true,
        campaign: { include: { steps: { orderBy: { orderIndex: 'asc' } } } }
      }
    });

    if (due.length === 0) return;

    // Claim the batch so a slow tick overlapping the next one cannot double-send.
    // Only rows still due are claimed; anything another tick already took is skipped.
    const { count } = await prisma.campaignEnrollment.updateMany({
      where: { id: { in: due.map((e) => e.id) }, status: 'active', nextRunAt: { lte: new Date() } },
      data: { status: 'processing' }
    });
    if (count === 0) return;

    console.log(`[campaigns] processing ${due.length} due enrollment(s)`);

    for (const enrollment of due) {
      try {
        await processEnrollment(enrollment, dayMs);
      } catch (error) {
        console.error(`[campaigns] enrollment ${enrollment.id} failed:`, error);
        // Back off this one enrollment so a persistent failure doesn't spin the loop.
        await prisma.campaignEnrollment
          .update({
            where: { id: enrollment.id },
            data: { status: 'active', nextRunAt: new Date(Date.now() + 15 * 60_000) }
          })
          .catch(() => undefined);
      }
    }
  } catch (error) {
    console.error('[campaigns] scheduler tick failed:', error);
  }
};

export { isEmailConfigured };
