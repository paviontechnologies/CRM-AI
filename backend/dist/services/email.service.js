"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendInviteEmail = exports.sendOtpEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    }
});
const sendOtpEmail = async (to, otp, name) => {
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
exports.sendOtpEmail = sendOtpEmail;
const sendInviteEmail = async (to, inviteUrl, orgName) => {
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
exports.sendInviteEmail = sendInviteEmail;
