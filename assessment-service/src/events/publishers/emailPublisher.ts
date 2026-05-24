import { getChannel } from '../connection';
import logger from '../../utils/logger';

export async function publishSendEmailReport(
  hrEmail: string,
  candidateName: string,
  jobTitle: string,
  overallScore: number,
  reportUrl: string,
  correlationId: string
): Promise<void> {
  const channel = getChannel();
  const exchange = 'notification.events';
  const routingKey = 'send.email';

  const payload = {
    type: 'REPORT',
    hr_email: hrEmail,
    candidate_name: candidateName,
    job_title: jobTitle,
    overall_score: overallScore,
    report_url: reportUrl,
    correlation_id: correlationId,
  };

  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    contentType: 'application/json',
  });

  logger.info({
    event: 'event.published.send_email_report',
    correlation_id: correlationId,
    hr_email: hrEmail,
    candidate_name: candidateName,
    job_title: jobTitle,
    overall_score: overallScore,
    report_url: reportUrl,
  });
}
