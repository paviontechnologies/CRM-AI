import { prisma } from '../lib/prisma';
import { logActivity, notify } from '../lib/notify';

interface RecordReplyInput {
  leadId: string;
  organizationId: string;
  body: string;
  subject?: string | null;
  channel?: string;
  /** Set when we already know which campaign this answers; otherwise inferred. */
  campaignId?: string | null;
  receivedAt?: Date;
}

export interface RecordReplyResult {
  messageId: string;
  campaignId: string | null;
  /** True when this reply is the one that incremented the campaign's replyCount. */
  countedForCampaign: boolean;
  enrollmentStopped: boolean;
}

/**
 * Record an inbound reply from a lead.
 *
 * Three things have to happen together and exactly once per lead+campaign:
 *  - store the inbound Message so it shows on the timeline,
 *  - bump Campaign.replyCount (first reply only — repeat replies must not
 *    inflate the rate past 100%),
 *  - stop the sequence, because nobody wants a drip after they answered.
 */
export const recordReply = async (input: RecordReplyInput): Promise<RecordReplyResult> => {
  const receivedAt = input.receivedAt ?? new Date();

  // Attribute the reply to the campaign whose message we most recently sent them.
  let campaignId = input.campaignId ?? null;
  if (!campaignId) {
    const lastOutbound = await prisma.message.findFirst({
      where: {
        leadId: input.leadId,
        direction: 'outbound',
        campaignId: { not: null },
        createdAt: { lte: receivedAt }
      },
      orderBy: { createdAt: 'desc' },
      select: { campaignId: true }
    });
    campaignId = lastOutbound?.campaignId ?? null;
  }

  // Was there already a reply on this campaign? Checked before the insert so the
  // new row can't count itself.
  const priorReply = campaignId
    ? await prisma.message.findFirst({
        where: { leadId: input.leadId, direction: 'inbound', campaignId },
        select: { id: true }
      })
    : null;

  const message = await prisma.message.create({
    data: {
      leadId: input.leadId,
      direction: 'inbound',
      channel: input.channel || 'email',
      subject: input.subject ?? null,
      body: input.body,
      status: 'received',
      campaignId,
      createdAt: receivedAt
    }
  });

  let countedForCampaign = false;
  let enrollmentStopped = false;

  if (campaignId && !priorReply) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { replyCount: { increment: 1 } }
    });
    countedForCampaign = true;
  }

  if (campaignId) {
    // Halt the drip for this lead on this campaign.
    const stopped = await prisma.campaignEnrollment.updateMany({
      where: { campaignId, leadId: input.leadId, status: 'active' },
      data: { status: 'replied', nextRunAt: null }
    });
    enrollmentStopped = stopped.count > 0;
  }

  await logActivity(input.leadId, 'reply_received', `Reply received: ${input.subject || '(no subject)'}`, {
    messageId: message.id,
    campaignId
  });

  // A reply is the signal a rep most wants to see — tell whoever owns the lead.
  const lead = await prisma.lead.findFirst({
    where: { id: input.leadId, organizationId: input.organizationId },
    select: { companyName: true, assignedToId: true }
  });
  if (lead?.assignedToId) {
    const member = await prisma.teamMember.findFirst({
      where: { id: lead.assignedToId, organizationId: input.organizationId },
      select: { userId: true }
    });
    if (member) {
      await notify({
        organizationId: input.organizationId,
        userId: member.userId,
        type: 'lead_replied',
        title: `${lead.companyName} replied`,
        body: input.subject || input.body.slice(0, 140),
        link: `/leads/${input.leadId}`
      });
    }
  }

  return { messageId: message.id, campaignId, countedForCampaign, enrollmentStopped };
};
