import { Router } from 'express';
import {
  getReportsEndpoint,
  getReportByApplicationIdEndpoint,
} from '../controllers/reportController';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Protect all reports endpoints — HR only
router.use(authMiddleware);
router.use(requireRole('HR'));

router.get('/', getReportsEndpoint);
router.get('/:applicationId', getReportByApplicationIdEndpoint);

export default router;
