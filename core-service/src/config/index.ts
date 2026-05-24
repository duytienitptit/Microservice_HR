import dotenv from 'dotenv';

dotenv.config();

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  database: {
    url: required('DATABASE_URL'),
  },

  jwt: {
    secret: required('JWT_SECRET'),
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
    refreshTokenExpiryMs: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://localhost:5672',
  },

  storage: {
    cvPath: process.env.STORAGE_CV_PATH ?? '/storage/cv',
  },

  frontendUrl: process.env.FRONTEND_URL ?? 'https://app.com',

  services: {
    ragServiceUrl: process.env.RAG_SERVICE_URL ?? 'http://rag-service:3003',
  },
};
