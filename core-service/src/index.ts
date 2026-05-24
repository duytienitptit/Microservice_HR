import app from './app';
import { config } from './config';
import prisma from './repositories/prismaClient';
import logger from './utils/logger';
import { connectRabbitMQ, closeRabbitMQ } from './events/connection';
import { consumeCvReady } from './events/consumers/cvReadyConsumer';

let cleanupInterval: NodeJS.Timeout | null = null;

const startServer = async (): Promise<void> => {
  try {
    // Verify database connection before starting
    await prisma.$connect();
    logger.info({ event: 'database.connected', correlation_id: 'startup' });

    // Connect to RabbitMQ asynchronously so it doesn't block server listening
    if (process.env.NODE_ENV !== 'test') {
      connectRabbitMQ()
        .then(async () => {
          await consumeCvReady();
        })
        .catch((err) => {
          logger.error({
            event: 'rabbitmq.startup_failed',
            correlation_id: 'startup',
            message: err instanceof Error ? err.message : String(err),
          });
        });
    }

    app.listen(config.port, () => {
      logger.info({
        event: 'server.started',
        correlation_id: 'startup',
        port: config.port,
        env: config.nodeEnv,
      });
    });

    // Start background cleanup jobs: 1 hour in dev/prod, 5s in test
    const cleanupIntervalMs = config.nodeEnv === 'test' ? 5000 : 60 * 60 * 1000;
    cleanupInterval = setInterval(async () => {
      try {
        const { applicationService } = require('./services/applicationService');
        await applicationService.runCleanupJobs();
      } catch (cleanupErr) {
        logger.error({
          event: 'background_cleanup.error',
          error: (cleanupErr as Error).message
        });
      }
    }, cleanupIntervalMs);
    cleanupInterval.unref();

  } catch (err) {
    logger.error({
      event: 'server.startup_failed',
      correlation_id: 'startup',
      message: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info({ event: 'server.shutdown', correlation_id: 'shutdown' });
  if (cleanupInterval) clearInterval(cleanupInterval);
  await prisma.$disconnect();
  await closeRabbitMQ();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info({ event: 'server.shutdown', correlation_id: 'shutdown' });
  if (cleanupInterval) clearInterval(cleanupInterval);
  await prisma.$disconnect();
  await closeRabbitMQ();
  process.exit(0);
});

startServer();
