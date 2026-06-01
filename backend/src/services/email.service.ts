import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

export const sendOtpEmail = async (to: string, otp: string, name?: string | null) => {
  if (!process.env.SMTP_USER) {
    console.log(`[DEV] OTP for ${to}: ${otp}`);
    return;
  }
  await transporter.sendMail({
    from: `"AI Lead Gen" <${process.env.SMTP_FROM || 'noreply@aileadgen.com'}>`,
    to,
    subject: 'Verify your email - OTP',
    html: `<p>Hi ${name || 'there'},</p><p>Your OTP is: <strong>${otp}</strong></p><p>Expires in 15 minutes.</p>`
  });
};

export const sendInviteEmail = async (to: string, inviteUrl: string, orgName: string) => {
  if (!process.env.SMTP_USER) {
    console.log(`[DEV] Invite URL for ${to}: ${inviteUrl}`);
    return;
  }
  await transporter.sendMail({
    from: `"AI Lead Gen" <${process.env.SMTP_FROM || 'noreply@aileadgen.com'}>`,
    to,
    subject: `You've been invited to join ${orgName}`,
    html: `<p>You've been invited to join <strong>${orgName}</strong> on AI Lead Gen.</p><p><a href="${inviteUrl}">Accept Invite</a></p><p>Link expires in 7 days.</p>`
  });
};
