import nodemailer from 'nodemailer';
import logger from '../utils/logger';
import { config } from '../config';

let transporter: nodemailer.Transporter | null = null;

export async function initEmailTransporter(): Promise<void> {
  const { host, port, user, pass } = config.smtp;

  if (host) {
    try {
      const transportOptions: nodemailer.TransportOptions & {
        host: string;
        port: number;
        secure: boolean;
        auth?: { user: string; pass: string };
      } = {
        host,
        port,
        secure: port === 465,
      };

      // Only add auth if credentials are provided (not needed for Mailpit)
      if (user && pass) {
        transportOptions.auth = { user, pass };
      }

      transporter = nodemailer.createTransport(transportOptions);
      // Verify connection configuration
      await transporter.verify();
      logger.info({ event: 'email.transporter.initialized', host, port });
    } catch (err) {
      logger.error({
        event: 'email.transporter.initialization_failed',
        error: err instanceof Error ? err.message : String(err),
      });
      transporter = null;
    }
  } else {
    logger.warn({
      event: 'email.transporter.mock_mode',
      message: 'SMTP host not configured. Emails will be logged to console only.',
    });
  }
}

export async function sendInviteEmail(
  to: string,
  candidateName: string,
  jobTitle: string,
  magicLinkUrl: string
): Promise<void> {
  const subject = `Interview Invitation: ${jobTitle} role at our company`;
  
  const text = `Hi ${candidateName},

We are excited to invite you to participate in an interview for the ${jobTitle} position.

This is a structured first-round interview conducted by our AI Recruiter. You can start the interview by clicking the link below whenever you are ready:

${magicLinkUrl}

The link is valid for 7 days. Good luck!

Best regards,
HR Team`;

  const html = `<p>Hi <strong>${candidateName}</strong>,</p>
<p>We are excited to invite you to participate in an interview for the <strong>${jobTitle}</strong> position.</p>
<p>This is a structured first-round interview conducted by our AI Recruiter. You can start the interview by clicking the link below whenever you are ready:</p>
<p><a href="${magicLinkUrl}" style="display:inline-block;padding:10px 20px;background-color:#4CAF50;color:white;text-decoration:none;border-radius:4px;">Start Interview</a></p>
<p>Or copy and paste this link into your browser:</p>
<p><a href="${magicLinkUrl}">${magicLinkUrl}</a></p>
<p>Good luck!</p>
<p>Best regards,<br/>HR Team</p>`;

  if (transporter) {
    await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
      html,
    });
    logger.info({ event: 'email.sent.invite', recipient: to, subject });
  } else {
    // Log to console
    logger.info({
      event: 'email.sent.invite.mock',
      recipient: to,
      subject,
      content: text,
    });
  }
}

export async function sendReportEmail(
  to: string,
  candidateName: string,
  jobTitle: string,
  overallScore: number,
  reportUrl: string
): Promise<void> {
  const subject = `[Interview Assessment Report] ${candidateName} — ${jobTitle}`;

  const text = `Dear HR Team,

The AI interview session for ${candidateName} applying for the ${jobTitle} position is complete.

Overall Score: ${overallScore}/100

You can view the full structured assessment report, including technical skills evaluation, communication skills evaluation, strengths, weaknesses, and recommendation, at the following URL:

${reportUrl}

Best regards,
AI HR Recruiter System`;

  const html = `<p>Dear HR Team,</p>
<p>The AI interview session for <strong>${candidateName}</strong> applying for the <strong>${jobTitle}</strong> position is complete.</p>
<p><strong>Overall Score:</strong> ${overallScore}/100</p>
<p>You can view the full structured assessment report, including technical skills evaluation, communication skills evaluation, strengths, weaknesses, and recommendation, by clicking the button below:</p>
<p><a href="${reportUrl}" style="display:inline-block;padding:10px 20px;background-color:#008CBA;color:white;text-decoration:none;border-radius:4px;">View Full Report</a></p>
<p>Or copy and paste this link into your browser:</p>
<p><a href="${reportUrl}">${reportUrl}</a></p>
<p>Best regards,<br/>AI HR Recruiter System</p>`;

  if (transporter) {
    await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
      html,
    });
    logger.info({ event: 'email.sent.report', recipient: to, subject });
  } else {
    // Log to console
    logger.info({
      event: 'email.sent.report.mock',
      recipient: to,
      subject,
      content: text,
    });
  }
}

export async function sendRejectionEmail(
  to: string,
  candidateName: string,
  jobTitle: string
): Promise<void> {
  const subject = `Application Update: ${jobTitle} position`;

  const text = `Dear ${candidateName},

Thank you for your interest in the ${jobTitle} position and for the time you invested in the interview process.

After careful consideration, we have decided not to move forward with your application at this time. This was a difficult decision, and it does not diminish the value of your experience and skills.

We encourage you to keep an eye on our future openings and apply again when a suitable opportunity arises. We would welcome the chance to consider your application in the future.

We wish you all the best in your career journey.

Warm regards,
HR Team`;

  const html = `<p>Dear <strong>${candidateName}</strong>,</p>
<p>Thank you for your interest in the <strong>${jobTitle}</strong> position and for the time you invested in the interview process.</p>
<p>After careful consideration, we have decided not to move forward with your application at this time. This was a difficult decision, and it does not diminish the value of your experience and skills.</p>
<p>We encourage you to keep an eye on our future openings and apply again when a suitable opportunity arises. We would welcome the chance to consider your application in the future.</p>
<p>We wish you all the best in your career journey.</p>
<p>Warm regards,<br/>HR Team</p>`;

  if (transporter) {
    await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
      html,
    });
    logger.info({ event: 'email.sent.rejection', recipient: to, subject });
  } else {
    // Log to console
    logger.info({
      event: 'email.sent.rejection.mock',
      recipient: to,
      subject,
      content: text,
    });
  }
}
