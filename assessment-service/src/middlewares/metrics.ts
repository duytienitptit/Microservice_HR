import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// Collect default system metrics (unique register per process/service)
client.collectDefaultMetrics({ register: client.register });

// HTTP request count metric
export const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status', 'service'],
});

// HTTP request duration metric
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status', 'service'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 1.5, 2, 5, 10],
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9;

    if (req.path !== '/metrics' && req.path !== '/health') {
      const route = req.route ? req.route.path : req.path;
      const status = res.statusCode.toString();
      const method = req.method;

      httpRequestCounter.inc({ method, route, status, service: 'assessment-service' });
      httpRequestDuration.observe({ method, route, status, service: 'assessment-service' }, duration);
    }
  });

  next();
};

export const metricsEndpoint = async (req: Request, res: Response) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
};
