import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

const FROM = () => `"${process.env.SMTP_FROM_NAME || 'AI Lead Gen'}" <${process.env.SMTP_FROM || 'noreply@aileadgen.com'}>`;

export const isEmailConfigured = (): boolean => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

export const sendOtpEmail = async (to: string, otp: string, name?: string | null) => {
  if (!isEmailConfigured()) {
    console.log(`[DEV] OTP for ${to}: ${otp}`);
    return;
  }
  await transporter.sendMail({
    from: FROM(),
    to,
    subject: 'Verify your email - OTP',
    html: `<p>Hi ${name || 'there'},</p><p>Your OTP is: <strong>${otp}</strong></p><p>Expires in 15 minutes.</p>`
  });
};

export const sendInviteEmail = async (to: string, inviteUrl: string, orgName: string) => {
  if (!isEmailConfigured()) {
    console.log(`[DEV] Invite URL for ${to}: ${inviteUrl}`);
    return;
  }
  await transporter.sendMail({
    from: FROM(),
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
 * Send one campaign email. Returns false when sending was skipped or failed so the
 * caller can decide whether to advance the sequence.
 */
export const sendCampaignEmail = async (input: CampaignEmailInput): Promise<boolean> => {
  const apiUrl = process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5001}`;
  const pixel = `<img src="${apiUrl}/api/campaigns/track/${input.messageId}/open.gif" width="1" height="1" alt="" style="display:none" />`;

  // Plain-text bodies come from the AI/template editor — preserve line breaks.
  const html = `${input.body.replace(/\n/g, '<br />')}${pixel}`;

  if (!isEmailConfigured()) {
    console.log(`[DEV] Campaign email to ${input.to} — "${input.subject}" (SMTP not configured, not sent)`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: FROM(),
      to: input.to,
      subject: input.subject,
      html,
      text: input.body,
      ...(input.replyTo && { replyTo: input.replyTo })
    });
    return true;
  } catch (error) {
    console.error(`Campaign email to ${input.to} failed:`, error);
    return false;
  }
};
