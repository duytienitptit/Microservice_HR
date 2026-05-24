import { getChannel } from '../connection';
import logger from '../../utils/logger';
import { applicationRepository } from '../../repositories/applicationRepository';
import { ApplicationStatus } from '@prisma/client';

export async function consumeCvReady(): Promise<void> {
  const channel = getChannel();
  const queue = 'cv.ready';

  channel.consume(queue, async (msg) => {
    if (!msg) return;
    
    let correlationId = 'unknown';
    try {
      const payload = JSON.parse(msg.content.toString());
      const { application_id, status, extracted_email, extracted_name, correlation_id } = payload;
      correlationId = correlation_id || 'unknown';

      logger.info({
        event: 'event.received.cv_ready',
        correlation_id: correlationId,
        application_id,
        status,
      });

      await attemptWithRetry(
        async () => {
          if (status === 'success') {
            // Update database status to READY_FOR_INTERVIEW
            await applicationRepository.updateStatus(application_id, ApplicationStatus.READY_FOR_INTERVIEW);
            
            // Update candidate email and name if extracted (and not already set)
            if (extracted_email || extracted_name) {
              await applicationRepository.updateCandidateInfo(
                application_id,
                extracted_email || undefined,
                extracted_name || undefined
              );
            }
          } else {
            // Update database status to CV_PARSE_FAILED
            await applicationRepository.updateStatus(application_id, ApplicationStatus.CV_PARSE_FAILED);
          }
        },
        correlationId,
        'cv_ready_processing'
      );

      channel.ack(msg);
      
      logger.info({
        event: 'application.status_updated.cv_ready_success',
        correlation_id: correlationId,
        application_id,
        status,
      });
    } catch (error) {
      logger.error({
        event: 'event.failed.cv_ready_permanently',
        correlation_id: correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      channel.nack(msg, false, false); // Send to DLQ
    }
  });
  
  logger.info({ event: 'rabbitmq.consumer.started', queue });
}

async function attemptWithRetry(
  actionFn: () => Promise<void>,
  correlationId: string,
  actionName: string
): Promise<void> {
  let attempts = 0;
  const maxAttempts = 3;
  const backoffDelays = [5000, 15000, 45000]; // 5s, 15s, 45s

  while (attempts < maxAttempts) {
    try {
      attempts++;
      await actionFn();
      return;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.warn({
        event: `${actionName}.attempt_failed`,
        correlation_id: correlationId,
        attempt: attempts,
        error: errorMessage,
      });

      if (attempts >= maxAttempts) {
        throw err;
      }

      const delay = backoffDelays[attempts - 1] || 5000;
      logger.info({
        event: `${actionName}.retry_delay`,
        correlation_id: correlationId,
        delay_ms: delay,
        next_attempt: attempts + 1,
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
