import { getEnv } from '../lib/context';

/**
 * Email delivery over Resend's HTTP API.
 *
 * SMTP needs a raw TCP socket, which Workers does not provide, so every send
 * goes out as an HTTPS request instead. When RESEND_API_KEY is unset the
 * functions log and return without throwing — same degradation the SMTP build
 * had, so local runs and unconfigured deploys still work.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export const isEmailConfigured = (): boolean => Boolean(getEnv().RESEND_API_KEY);

const fromAddress = (): string => {
  const env = getEnv();
  const address = env.EMAIL_FROM || 'onboarding@resend.dev';
  const name = env.EMAIL_FROM_NAME || 'AI Lead Gen';
  return `${name} <${address}>`;
};

interface SendInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string | null;
}

/** Returns false when sending was skipped or rejected; never throws. */
const send = async (input: SendInput): Promise<boolean> => {
  const env = getEnv();
  if (!env.RESEND_API_KEY) {
    console.log(`[DEV] email to ${input.to} — "${input.subject}" (RESEND_API_KEY unset, not sent)`);
    return false;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text && { text: input.text }),
        ...(input.replyTo && { reply_to: input.replyTo })
      })
    });

    if (!res.ok) {
      // Read the body for the reason — Resend returns a JSON error object.
      const detail = await res.text().catch(() => '');
      console.error(`Resend rejected mail to ${input.to} (${res.status}): ${detail}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Email to ${input.to} failed:`, error);
    return false;
  }
};

export const sendInviteEmail = async (to: string, inviteUrl: string, orgName: string): Promise<void> => {
  if (!isEmailConfigured()) {
    console.log(`[DEV] Invite URL for ${to}: ${inviteUrl}`);
    return;
  }
  await send({
    to,
    subject: `You've been invited to join ${orgName}`,
    html: `<p>You've been invited to join <strong>${orgName}</strong> on AI Lead Gen.</p><p><a href="${inviteUrl}">Accept Invite</a></p><p>Link expires in 7 days.</p>`
  });
};

interface CampaignEmailInput {
  to: string;
  subject: string;
  body: string;
  /** Message id used to build the open-tracking pixel. */
  messageId: string;
  replyTo?: string | null;
}

/**
 * Send one campaign email. Returns false when sending was skipped or failed so
 * the caller can decide whether to advance the sequence.
 */
export const sendCampaignEmail = async (input: CampaignEmailInput): Promise<boolean> => {
  const apiUrl = getEnv().PUBLIC_API_URL;
  const pixel = `<img src="${apiUrl}/api/campaigns/track/${input.messageId}/open.gif" width="1" height="1" alt="" style="display:none" />`;

  // Plain-text bodies come from the AI/template editor — preserve line breaks.
  const html = `${input.body.replace(/\n/g, '<br />')}${pixel}`;

  return send({
    to: input.to,
    subject: input.subject,
    html,
    text: input.body,
    replyTo: input.replyTo
  });
};
