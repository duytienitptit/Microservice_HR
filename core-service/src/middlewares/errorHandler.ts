import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const correlationId = req.headers['x-correlation-id'] as string;

  if (err instanceof AppError) {
    logger.warn({
      event: 'request.error',
      correlation_id: correlationId,
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
    });

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Unexpected errors
  logger.error({
    event: 'request.unhandled_error',
    correlation_id: correlationId,
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      details: null,
    },
  });
};
