import { getChannel } from '../connection';
import logger from '../../utils/logger';

export async function publishCvUploaded(
  applicationId: string,
  cvFilePath: string,
  jobId: string,
  correlationId: string
): Promise<void> {
  const channel = getChannel();
  const exchange = 'cv.events';
  const routingKey = 'cv.uploaded';

  const payload = {
    application_id: applicationId,
    cv_file_path: cvFilePath,
    job_id: jobId,
    correlation_id: correlationId,
  };

  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    contentType: 'application/json',
  });

  logger.info({
    event: 'event.published.cv_uploaded',
    correlation_id: correlationId,
    application_id: applicationId,
    cv_file_path: cvFilePath,
  });
}
