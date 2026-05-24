import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { correlationIdMiddleware } from './middlewares/correlationId';
import { errorHandler } from './middlewares/errorHandler';
import { sanitizeInput } from './utils/sanitize';
import { metricsMiddleware, metricsEndpoint } from './middlewares/metrics';
import authRoutes from './routes/auth';
import jobRoutes from './routes/jobs';
import applicationRoutes from './routes/applications';
import internalRoutes from './routes/internal';
import logger from './utils/logger';

const app = express();

// XSS Sanitization middleware
const sanitizeBodyMiddleware = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  next();
};

// ─── Security, Metrics & Parsing ──────────────────────────────
app.use(helmet());

const allowedOrigins = [
  config.frontendUrl,
  'http://localhost',
  'https://localhost',
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json());
app.use(sanitizeBodyMiddleware);
app.use(metricsMiddleware);

// ─── Correlation ID ───────────────────────────────────────────
app.use(correlationIdMiddleware);

// ─── Request Logging ─────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info({
    event: 'http.request',
    correlation_id: req.headers['x-correlation-id'],
    method: req.method,
    path: req.path,
  });
  next();
});

// ─── Health & Metrics Check ───────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'core-service',
    version: '1.0.0',
  });
});

app.get('/metrics', metricsEndpoint);

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/internal', internalRoutes);

// ─── 404 handler ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found.', details: null },
  });
});

// ─── Error Handler (MUST be last) ────────────────────────────
app.use(errorHandler);

export default app;
