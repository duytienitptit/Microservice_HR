import { getChannel } from '../connection';
import logger from '../../utils/logger';
import { sendInviteEmail, sendReportEmail, sendRejectionEmail } from '../../email/emailService';
import EmailLog from '../../models/emailLog';

export async function consumeSendEmail(): Promise<void> {
  const channel = getChannel();
  const queue = 'send.email';

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    let correlationId = 'unknown';
    let type: 'INVITE' | 'REPORT' | 'REJECTION' = 'INVITE';
    let recipient = '';
    let subject = '';

    try {
      const payload = JSON.parse(msg.content.toString());
      correlationId = payload.correlation_id || 'unknown';
      type = payload.type;

      logger.info({
        event: 'event.received.send_email',
        correlation_id: correlationId,
        type,
      });

      if (type === 'INVITE') {
        const { candidate_email, candidate_name, job_title, magic_link_url } = payload;
        recipient = candidate_email;
        subject = `Interview Invitation: ${job_title} role at our company`;

        await attemptEmailSendWithRetry(
          () => sendInviteEmail(candidate_email, candidate_name, job_title, magic_link_url),
          correlationId
        );
      } else if (type === 'REPORT') {
        const { hr_email, candidate_name, job_title, overall_score, report_url } = payload;
        recipient = hr_email;
        subject = `[Interview Assessment Report] ${candidate_name} — ${job_title}`;

        await attemptEmailSendWithRetry(
          () => sendReportEmail(hr_email, candidate_name, job_title, overall_score, report_url),
          correlationId
        );
      } else if (type === 'REJECTION') {
        const { candidate_email, candidate_name, job_title } = payload;
        recipient = candidate_email;
        subject = `Application Update: ${job_title} position`;

        await attemptEmailSendWithRetry(
          () => sendRejectionEmail(candidate_email, candidate_name, job_title),
          correlationId
        );
      } else {
        throw new Error(`Unsupported email type: ${type}`);
      }

      // Log success to MongoDB
      await EmailLog.create({
        type,
        recipient,
        subject,
        status: 'SENT',
        sent_at: new Date(),
      });

      channel.ack(msg);

      logger.info({
        event: 'email.sent.success',
        correlation_id: correlationId,
        type,
        recipient,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({
        event: 'email.sent.failed_permanently',
        correlation_id: correlationId,
        type,
        recipient,
        error: errorMessage,
      });

      // Log failure to MongoDB
      if (recipient) {
        try {
          await EmailLog.create({
            type,
            recipient,
            subject: subject || `Email dispatch failed`,
            status: 'FAILED',
            sent_at: new Date(),
            error: errorMessage,
          });
        } catch (dbErr) {
          logger.error({
            event: 'email.log.db_failed',
            correlation_id: correlationId,
            error: dbErr instanceof Error ? dbErr.message : String(dbErr),
          });
        }
      }

      // Send to DLQ (nack with requeue=false)
      channel.nack(msg, false, false);
    }
  });

  logger.info({ event: 'rabbitmq.consumer.started', queue });
}

async function attemptEmailSendWithRetry(
  sendFn: () => Promise<void>,
  correlationId: string
): Promise<void> {
  let attempts = 0;
  const maxAttempts = 3;
  const backoffDelays = [5000, 15000, 45000]; // 5s, 15s, 45s

  while (attempts < maxAttempts) {
    try {
      attempts++;
      await sendFn();
      return; // Success!
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.warn({
        event: 'email.send.attempt_failed',
        correlation_id: correlationId,
        attempt: attempts,
        error: errorMessage,
      });

      if (attempts >= maxAttempts) {
        throw err; // Out of retries, bubble error up
      }

      const delay = backoffDelays[attempts - 1] || 5000;
      logger.info({
        event: 'email.send.retry_delay',
        correlation_id: correlationId,
        delay_ms: delay,
        next_attempt: attempts + 1,
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
