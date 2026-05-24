import { Router } from 'express';
import {
  upload,
  uploadCvEndpoint,
  getApplicationsEndpoint,
  getApplicationByIdEndpoint,
  updateStatusEndpoint,
  sendInviteEndpoint,
  getCvFileEndpoint,
  getCvAnalysisEndpoint,
  rejectEndpoint,
  deleteApplicationEndpoint,
} from '../controllers/applicationController';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// All application endpoints are protected and HR-only
router.use(authMiddleware);
router.use(requireRole('HR'));

router.post('/', upload.single('cv'), uploadCvEndpoint);
router.get('/', getApplicationsEndpoint);
router.get('/:id', getApplicationByIdEndpoint);
router.patch('/:id/status', updateStatusEndpoint);
router.post('/:id/invite', sendInviteEndpoint);
router.post('/:id/reject', rejectEndpoint);
router.delete('/:id', deleteApplicationEndpoint);
router.get('/:id/cv-file', getCvFileEndpoint);
router.get('/:id/cv-analysis', getCvAnalysisEndpoint);

export default router;
