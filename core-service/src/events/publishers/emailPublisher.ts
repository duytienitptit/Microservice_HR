import { getChannel } from '../connection';
import logger from '../../utils/logger';

export async function publishSendEmailInvite(
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  magicLinkUrl: string,
  correlationId: string
): Promise<void> {
  const channel = getChannel();
  const exchange = 'notification.events';
  const routingKey = 'send.email';

  const payload = {
    type: 'INVITE',
    candidate_email: candidateEmail,
    candidate_name: candidateName,
    job_title: jobTitle,
    magic_link_url: magicLinkUrl,
    correlation_id: correlationId,
  };

  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    contentType: 'application/json',
  });

  logger.info({
    event: 'event.published.send_email_invite',
    correlation_id: correlationId,
    candidate_email: candidateEmail,
    job_title: jobTitle,
    magic_link_url: magicLinkUrl,
  });
}

export async function publishSendEmailRejection(
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  correlationId: string
): Promise<void> {
  const channel = getChannel();
  const exchange = 'notification.events';
  const routingKey = 'send.email';

  const payload = {
    type: 'REJECTION',
    candidate_email: candidateEmail,
    candidate_name: candidateName,
    job_title: jobTitle,
    correlation_id: correlationId,
  };

  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    contentType: 'application/json',
  });

  logger.info({
    event: 'event.published.send_email_rejection',
    correlation_id: correlationId,
    candidate_email: candidateEmail,
    job_title: jobTitle,
  });
}
