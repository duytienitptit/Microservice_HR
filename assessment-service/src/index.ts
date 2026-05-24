import app from './app';
import { config } from './config';
import logger from './utils/logger';
import mongoose from 'mongoose';
import { connectRabbitMQ, closeRabbitMQ } from './events/connection';
import { consumeInterviewCompleted } from './events/consumers/interviewCompletedConsumer';
import { consumeSendEmail } from './events/consumers/sendEmailConsumer';
import { initEmailTransporter } from './email/emailService';

const startServer = async (): Promise<void> => {
  try {
    // 1. Connect to MongoDB
    logger.info({ event: 'mongodb.connecting', url: config.database.url });
    await mongoose.connect(config.database.url);
    logger.info({ event: 'mongodb.connected', correlation_id: 'startup' });

    // 2. Initialize Email Transporter
    await initEmailTransporter();

    // 3. Connect to RabbitMQ & Start Consumers asynchronously (so it doesn't block Express startup)
    if (process.env.NODE_ENV !== 'test') {
      connectRabbitMQ()
        .then(async () => {
          await consumeInterviewCompleted();
          await consumeSendEmail();
        })
        .catch((err) => {
          logger.error({
            event: 'rabbitmq.startup_failed',
            correlation_id: 'startup',
            message: err instanceof Error ? err.message : String(err),
          });
        });
    }

    // 4. Start Express Server
    app.listen(config.port, () => {
      logger.info({
        event: 'server.started',
        correlation_id: 'startup',
        port: config.port,
        env: config.nodeEnv,
      });
    });
  } catch (err) {
    logger.error({
      event: 'server.startup_failed',
      correlation_id: 'startup',
      message: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
};

// Graceful Shutdown
const shutdown = async (signal: string) => {
  logger.info({ event: 'server.shutdown', correlation_id: 'shutdown', signal });
  try {
    await mongoose.disconnect();
    logger.info({ event: 'mongodb.disconnected' });
    await closeRabbitMQ();
  } catch (err) {
    logger.error({
      event: 'server.shutdown_failed',
      correlation_id: 'shutdown',
      message: err instanceof Error ? err.message : String(err),
    });
  } finally {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
