import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error', (e) => {
  logger.error({ event: 'prisma.error', message: e.message, target: e.target });
});

prisma.$on('warn', (e) => {
  logger.warn({ event: 'prisma.warn', message: e.message, target: e.target });
});

export default prisma;
