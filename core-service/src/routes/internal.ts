import { Router, Request, Response, NextFunction } from 'express';
import { applicationService } from '../services/applicationService';
import { applicationRepository } from '../repositories/applicationRepository';
import { ApplicationStatus } from '@prisma/client';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/internal/validate-token
 * Internal endpoint for AI Service to validate magic link tokens.
 * No JWT authentication — service-to-service only.
 */
router.post('/validate-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    const correlationId = (req.headers['x-correlation-id'] as string) || '';

    if (!token) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Token is required.', details: null },
      });
    }

    const result = await applicationService.validateMagicToken(token, correlationId);

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/internal/applications/:id
 * Internal endpoint for fetching application details.
 * No JWT authentication — service-to-service only.
 */
router.get('/applications/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const application = await applicationRepository.findById(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'APPLICATION_NOT_FOUND', message: `Application not found with ID: ${id}`, details: null },
      });
    }

    return res.json({
      success: true,
      data: { application },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/internal/applications/:id/status
 * Internal endpoint for updating application status directly.
 * No JWT authentication — service-to-service only.
 */
router.patch('/applications/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(ApplicationStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid status is required.', details: null },
      });
    }

    const application = await applicationRepository.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'APPLICATION_NOT_FOUND', message: `Application not found with ID: ${id}`, details: null },
      });
    }

    const updatedApplication = await applicationRepository.updateStatus(id, status as ApplicationStatus);

    logger.info({
      event: 'internal.application.status_updated',
      correlation_id: req.headers['x-correlation-id'],
      application_id: id,
      status,
    });

    return res.json({
      success: true,
      data: { application: updatedApplication },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
