import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'test') {
  dotenv.config();
}

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const config = {
  port: parseInt(process.env.PORT ?? '3004', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  database: {
    url: required('MONGODB_URL'),
  },

  jwt: {
    secret: required('JWT_SECRET'),
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://localhost:5672',
  },

  coreServiceUrl: process.env.CORE_SERVICE_URL ?? 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',

  useLlmScoring: process.env.USE_LLM_SCORING ? process.env.USE_LLM_SCORING === 'true' : true,
  llmProvider: (process.env.LLM_PROVIDER || 'gemini') as 'openai' | 'gemini',
  llmApiKey: process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || '',

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@support-hr.com',
  },
};
